/**
 * Player state, in Redis, keyed by Reddit user id.
 *
 * The id rather than the name: a rename must not orphan someone's collection.
 * The profile is app-wide, not per-post - a player's gear follows them to every
 * GearLink post in the subreddit. Only the ladder is per-post.
 */
import { redis } from '@devvit/web/server';
import type { BestRun, Profile } from '../../shared/api.js';
import { STARTER_GEAR, loadoutIsLegal } from '../../shared/engine/gear.js';
import { PACKS } from '../../shared/engine/economy.js';
import {
  TROPHY_FLOOR,
  duelWeekOf,
  settleWeeks,
} from '../../shared/engine/league.js';
import { settlePrize } from '../../shared/engine/season.js';
import type { SeasonPrize } from '../../shared/engine/season.js';
import { syncPoolScore } from './duelpool.js';
import { MAP_LENGTH, MAX_ASCENSION } from '../../shared/engine/campaign.js';
import { normaliseHearts } from '../../shared/engine/hearts.js';
import type { Hearts } from '../../shared/engine/hearts.js';
import type { HeroClass } from '../../shared/engine/types.js';

const profileKey = (userId: string) => `profile:${userId}`;

/** A fresh account starts with enough coins for the entry pack, so the shop
 *  ladder reads cheap-first rather than leaving the premium crate as the only
 *  affordable buy. */
const STARTING_COINS = 250;
const STARTING_GEMS = 60;
/** Every duellist opens on Bronze 1's floor, which is also the lowest a trophy
 *  count can go - so a rating is only ever what the player did with it, and a
 *  losing streak costs rungs without ever dropping anyone off the ladder. */
const STARTING_TROPHIES = TROPHY_FLOOR;

const num = (raw: string | undefined, fallback: number): number => {
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, Math.floor(n)));

const obj = (raw: string | undefined): Record<string, number> => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
};

/** A stored duel loadout is only honoured if it still resolves to five legal
 *  pieces of its own class - a card table that changed under a save must not
 *  hand somebody a four-orb board. */
const parsePicked = (
  raw: string | undefined,
  cls: HeroClass | null
): string[] => {
  if (!raw || !cls) return [];
  try {
    const p: unknown = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    const ids = p.filter((x): x is string => typeof x === 'string');
    return loadoutIsLegal(ids, cls) ? ids : [];
  } catch {
    return [];
  }
};

/** Containers are normalised on the way out, so a save written before a class
 *  existed - or one edited to something silly - still reads as a legal record. */
const parseHearts = (raw: string | undefined): Hearts => {
  if (!raw) return normaliseHearts(undefined);
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object' || Array.isArray(p))
      return normaliseHearts(undefined);
    return normaliseHearts(p as Partial<Hearts>);
  } catch {
    return normaliseHearts(undefined);
  }
};

const parseCls = (raw: string | undefined): HeroClass | null =>
  raw === 'Hero' || raw === 'Archer' || raw === 'Mage' ? raw : null;

const parseBest = (raw: string | undefined): BestRun | null => {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<BestRun>;
    if (!Number.isFinite(p.score)) return null;
    return {
      score: Number(p.score),
      waves: Number(p.waves) || 0,
      chain: Number(p.chain) || 0,
      hero: (p.hero ?? 'Hero') as HeroClass,
    };
  } catch {
    return null;
  }
};

/** Packs are stored by id, so a renamed tier would silently strand a paid-for
 *  pack. Fold anything unrecognised onto the entry tier rather than dropping it. */
const PACK_ALIAS: Record<string, string> = {
  apprentice: 'base',
  journeyman: 'bronze',
  artificer: 'gold',
};
const normalisePacks = (
  raw: Record<string, number>
): Record<string, number> => {
  const live = PACKS.map((p) => p.id);
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(raw)) {
    if (!(n > 0)) continue;
    const to = live.includes(k) ? k : (PACK_ALIAS[k] ?? live[0]!);
    out[to] = (out[to] ?? 0) + n;
  }
  return out;
};

const parsePrize = (raw: string | undefined): SeasonPrize | null => {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<SeasonPrize>;
    if (typeof p.week !== 'number' || typeof p.league !== 'string') return null;
    return {
      week: p.week,
      league: p.league,
      rewards: Array.isArray(p.rewards) ? p.rewards : [],
    };
  } catch {
    return null;
  }
};

export const loadProfile = async (
  userId: string,
  username: string
): Promise<Profile> => {
  const h = await redis.hGetAll(profileKey(userId));
  const gear = Object.keys(h).length ? obj(h['gear']) : STARTER_GEAR();
  // Migration: a save written against a smaller card table can leave the picker
  // holding gear the collection says is unowned. Top the starters back up.
  for (const [id, n] of Object.entries(STARTER_GEAR()))
    if (!(gear[id]! > 0)) gear[id] = n;

  const duelCls = parseCls(h['duelCls']);

  let coins = num(h['coins'], STARTING_COINS);
  let gems = num(h['gems'], STARTING_GEMS);
  let packs = normalisePacks(obj(h['packs']));
  let prize = parsePrize(h['duelPrize']);

  // The weekly reset is applied lazily, the first time a profile is read in a
  // new week: the prize for the league the last week ended in, then the
  // promotions, holds and drops for every reset it missed.
  const week = duelWeekOf(Date.now());
  const lastWeek = num(h['duelWeek'], week);
  const stored = num(h['trophies'], STARTING_TROPHIES);
  const trophies =
    lastWeek < week ? settleWeeks(stored, week - lastWeek) : stored;
  let duels = num(h['duelWeekDuels'], 0);
  if (h['duelWeek'] !== String(week)) {
    const fields: Record<string, string> = {
      duelWeek: String(week),
      trophies: String(trophies),
      duelWeekDuels: '0',
    };
    // Only a week that was actually recorded can pay: an account from before
    // weeks were tracked starts counting now.
    const earned =
      h['duelWeek'] !== undefined && lastWeek < week
        ? settlePrize(lastWeek, stored, duels)
        : null;
    // Paid once however many reads race the reset: the first to take the
    // week's key pays, the rest only see the result.
    if (earned && (await claimPrizeWeek(userId, earned.week))) {
      for (const r of earned.rewards) {
        if (r.kind === 'coins') coins += r.amount;
        else if (r.kind === 'gems') gems += r.amount;
        else packs = { ...packs, [r.packId]: (packs[r.packId] ?? 0) + 1 };
      }
      prize = earned;
      fields['coins'] = String(coins);
      fields['gems'] = String(gems);
      fields['packs'] = JSON.stringify(packs);
      fields['duelPrize'] = JSON.stringify(earned);
    }
    duels = 0;
    await redis.hSet(profileKey(userId), fields);
    // The profile is the authority: its first read of the week puts the pool
    // row on the same number, whatever the sweep did with it.
    await syncPoolScore(userId, trophies);
  }

  return {
    username,
    coins,
    gems,
    trophies,
    gear,
    packs,
    best: parseBest(h['best']),
    ascension: clamp(num(h['ascension'], 0), 0, MAX_ASCENSION),
    heartPieces: Math.max(0, Math.floor(num(h['heartPieces'], 0))),
    hearts: parseHearts(h['hearts']),
    progress: clamp(num(h['progress'], 0), 0, MAP_LENGTH),
    seenFtue: h['seenFtue'] === '1',
    seenDuelFtue: h['seenDuelFtue'] === '1',
    seenDuelSetup: h['seenDuelSetup'] === '1',
    duelCls,
    duelPicked: parsePicked(h['duelPicked'], duelCls),
    duelListed: h['duelListed'] === '1',
    duelWeekDuels: duels,
    duelPrize: prize,
  };
};

const prizeKey = (userId: string, week: number) =>
  `duelprize:${userId}:${week}`;

/** True for exactly one caller per player and week. */
const claimPrizeWeek = async (userId: string, week: number) => {
  const key = prizeKey(userId, week);
  const first = (await redis.incrBy(key, 1)) === 1;
  if (first) await redis.expire(key, 30 * 86_400);
  return first;
};

/** One more duel toward this week's prize. */
export const countDuel = async (userId: string): Promise<void> => {
  await redis.hIncrBy(profileKey(userId), 'duelWeekDuels', 1);
};

/** The prize notice has been seen; the payout itself landed at the reset. */
export const dismissPrize = async (userId: string): Promise<void> => {
  await redis.hDel(profileKey(userId), ['duelPrize']);
};

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'coins'
    | 'gems'
    | 'trophies'
    | 'gear'
    | 'packs'
    | 'best'
    | 'ascension'
    | 'progress'
    | 'heartPieces'
    | 'hearts'
    | 'seenFtue'
    | 'seenDuelFtue'
    | 'seenDuelSetup'
    | 'duelCls'
    | 'duelPicked'
    | 'duelListed'
  >
>;

export const saveProfile = async (
  userId: string,
  patch: ProfilePatch
): Promise<void> => {
  const fields: Record<string, string> = {};
  if (patch.coins !== undefined)
    fields['coins'] = String(Math.max(0, Math.floor(patch.coins)));
  if (patch.gems !== undefined)
    fields['gems'] = String(Math.max(0, Math.floor(patch.gems)));
  if (patch.trophies !== undefined)
    fields['trophies'] = String(
      Math.max(TROPHY_FLOOR, Math.floor(patch.trophies))
    );
  if (patch.gear !== undefined) fields['gear'] = JSON.stringify(patch.gear);
  if (patch.packs !== undefined) fields['packs'] = JSON.stringify(patch.packs);
  if (patch.best !== undefined) fields['best'] = JSON.stringify(patch.best);
  if (patch.ascension !== undefined)
    fields['ascension'] = String(clamp(patch.ascension, 0, MAX_ASCENSION));
  if (patch.progress !== undefined)
    fields['progress'] = String(clamp(patch.progress, 0, MAP_LENGTH));
  if (patch.heartPieces !== undefined)
    fields['heartPieces'] = String(Math.max(0, Math.floor(patch.heartPieces)));
  if (patch.hearts !== undefined)
    fields['hearts'] = JSON.stringify(normaliseHearts(patch.hearts));
  if (patch.seenFtue !== undefined)
    fields['seenFtue'] = patch.seenFtue ? '1' : '0';
  if (patch.seenDuelFtue !== undefined)
    fields['seenDuelFtue'] = patch.seenDuelFtue ? '1' : '0';
  if (patch.seenDuelSetup !== undefined)
    fields['seenDuelSetup'] = patch.seenDuelSetup ? '1' : '0';
  if (patch.duelCls !== undefined) fields['duelCls'] = patch.duelCls ?? '';
  if (patch.duelPicked !== undefined)
    fields['duelPicked'] = JSON.stringify(patch.duelPicked);
  if (patch.duelListed !== undefined)
    fields['duelListed'] = patch.duelListed ? '1' : '0';
  if (!Object.keys(fields).length) return;
  await redis.hSet(profileKey(userId), fields);
};
