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
import { removeFromPool } from './duelpool.js';
import { finalStanding, groupStanding } from './solo.js';
import { soloTierById, titleIsLive } from '../../shared/engine/solo.js';
import type { SoloPrize, SoloTitle } from '../../shared/engine/solo.js';
import {
  bandRewards,
  divisionAt,
  divisionIndex,
  groupBandById,
  groupBandFor,
  groupOutcome,
  stepDivision,
} from '../../shared/engine/division.js';
import type { DivState, GroupResult } from '../../shared/engine/division.js';
import type { QuestReward } from '../../shared/engine/quests.js';
import { weeklyFlairFor } from '../../shared/engine/flair.js';
import { MAP_LENGTH, MAX_ASCENSION } from '../../shared/engine/campaign.js';
import { normaliseHearts } from '../../shared/engine/hearts.js';
import { LEVEL_CONFIG } from '../../shared/engine/level.js';
import type { Hearts } from '../../shared/engine/hearts.js';
import type { HeroClass } from '../../shared/engine/types.js';

export const profileKey = (userId: string) => `profile:${userId}`;

/** Each unlocked flair is its own `flair:<id>` field on the profile hash, so
 *  two requests unlocking different flairs at once both land - and an admin
 *  reset, which drops the hash, takes them with it. */
export const FLAIR_FIELD = 'flair:';

/** Unlocked outfits, one `skin:<id>` field each, for the same reasons. */
export const SKIN_FIELD = 'skin:';

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

/** Worn outfits, class -> skin id. Ownership is checked where they are drawn,
 *  so only the shape is policed here. */
const parseSkinWorn = (
  raw: string | undefined
): Partial<Record<HeroClass, string>> => {
  if (!raw) return {};
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object' || Array.isArray(p)) return {};
    const out: Partial<Record<HeroClass, string>> = {};
    for (const [k, v] of Object.entries(p)) {
      const cls = parseCls(k);
      if (cls && typeof v === 'string') out[cls] = v;
    }
    return out;
  } catch {
    return {};
  }
};

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

const parseGroupResult = (g: unknown): GroupResult | null => {
  if (!g || typeof g !== 'object') return null;
  const r = Object.fromEntries(Object.entries(g));
  if (r.outcome !== 'promote' && r.outcome !== 'hold' && r.outcome !== 'demote')
    return null;
  return {
    div: divisionAt(divisionIndex(r.div)).id,
    rank: Number(r.rank) || 0,
    size: Number(r.size) || 0,
    band: groupBandById(String(r.band))?.id ?? null,
    outcome: r.outcome,
    to: divisionAt(divisionIndex(r.to)).id,
  };
};

const parseSoloPrize = (raw: string | undefined): SoloPrize | null => {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<SoloPrize>;
    if (typeof p.week !== 'number') return null;
    const tier = soloTierById(String(p.tier))?.id ?? null;
    const group = parseGroupResult(p.group);
    if (!tier && !group) return null;
    return {
      week: p.week,
      rank: Number(p.rank) || 0,
      tier,
      rewards: Array.isArray(p.rewards) ? p.rewards : [],
      group,
    };
  } catch {
    return null;
  }
};

const parseSoloTitle = (raw: string | undefined): SoloTitle | null => {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<SoloTitle>;
    if (typeof p.week !== 'number' || !soloTierById(String(p.tier)))
      return null;
    return { week: p.week, rank: Number(p.rank) || 0, tier: p.tier! };
  } catch {
    return null;
  }
};

/** Weeks back a returning player is still settled for. Older ladders have
 *  expired anyway. */
const SOLO_LOOKBACK = 4;

/** The wallet alone, read without touching the profile. For the feed view,
 *  which must not create a profile for someone who has only scrolled past -
 *  the first real visit is what counts a new player. */
export const peekCoins = async (userId: string): Promise<number> =>
  num(await redis.hGet(profileKey(userId), 'coins'), STARTING_COINS);

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
    // League entry lasts one week and never renews itself: the new week
    // starts everyone out of the pool until they choose to enter again.
    fields['duelListed'] = '0';
    await redis.hSet(profileKey(userId), fields);
    await removeFromPool(userId);
  }
  const listed =
    h['duelListed'] === '1' && num(h['duelListedWeek'], -1) === week;

  /* The solo leaderboard settles the same lazy way: the first read in a new
     week looks up where the player finished every week since the last one it
     checked - subreddit-wide for a title, in their group for the division
     and its prize - pays each week once, and hands out last week's title. */
  let soloPrize = parseSoloPrize(h['soloPrize']);
  let soloTitle = parseSoloTitle(h['soloTitle']);
  let divs: DivState = {
    div: divisionIndex(h['soloDiv']),
    idle: Math.max(0, num(h['soloDivIdle'], 0)),
    best: Math.max(0, num(h['soloDivBest'], 0)),
  };
  if (h['soloSettled'] !== String(week - 1)) {
    const fields: Record<string, string> = { soloSettled: String(week - 1) };
    const settled = num(h['soloSettled'], week - 2);
    const from = Math.max(settled + 1, week - SOLO_LOOKBACK);
    // Weeks too old to read back were not played in any ladder still kept.
    for (let w = settled + 1; w < from; w++)
      divs = stepDivision(divs, null).next;
    for (let w = from; w <= week - 1; w++) {
      const [placed, grp] = await Promise.all([
        finalStanding(w, userId).catch(() => null),
        groupStanding(w, userId).catch(() => null),
      ]);
      // The division the week was played in, as seated.
      const div = grp ? divisionIndex(grp.div) : divs.div;
      const outcome = grp
        ? groupOutcome(grp.rank, grp.size, grp.runs, div)
        : null;
      const stepped = stepDivision({ ...divs, div }, outcome);
      divs = stepped.next;
      const band = grp ? groupBandFor(grp.rank, grp.size, grp.runs) : null;
      const rewards: QuestReward[] = [
        ...(placed?.tier.rewards ?? []),
        ...(band ? bandRewards(band, div) : []),
        ...stepped.bonus,
      ];
      // A quiet week - seated, held, nothing earned - needs no notice.
      if (!rewards.length && outcome !== 'promote' && outcome !== 'demote')
        continue;
      if (!(await claimSoloWeek(userId, w))) continue;
      for (const r of rewards) {
        if (r.kind === 'coins') coins += r.amount;
        else if (r.kind === 'gems') gems += r.amount;
        else packs = { ...packs, [r.packId]: (packs[r.packId] ?? 0) + 1 };
      }
      soloPrize = {
        week: w,
        rank: placed?.rank ?? 0,
        tier: placed?.tier.id ?? null,
        rewards,
        group:
          grp && outcome
            ? {
                div: grp.div,
                rank: grp.rank ?? 0,
                size: grp.size,
                band: band?.id ?? null,
                outcome,
                to: divisionAt(divs.div).id,
              }
            : null,
      };
      fields['coins'] = String(coins);
      fields['gems'] = String(gems);
      fields['packs'] = JSON.stringify(packs);
      fields['soloPrize'] = JSON.stringify(soloPrize);
      if (w === week - 1 && placed) {
        soloTitle = { tier: placed.tier.id, week: w, rank: placed.rank };
        fields['soloTitle'] = JSON.stringify(soloTitle);
      }
    }
    fields['soloDiv'] = divisionAt(divs.div).id;
    fields['soloDivIdle'] = String(divs.idle);
    fields['soloDivBest'] = String(divs.best);
    await redis.hSet(profileKey(userId), fields);
  }
  if (!titleIsLive(soloTitle, week)) soloTitle = null;
  const titleFlair = soloTitle ? weeklyFlairFor(soloTitle.tier) : null;

  return {
    username,
    coins,
    gems,
    trophies,
    gear,
    gearLevels: obj(h['gearLevels']),
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
    duelListed: listed,
    duelWeekDuels: duels,
    duelPrize: prize,
    soloPrize,
    soloDiv: divisionAt(divs.div).id,
    soloTitle,
    // Banked unlocks, plus the weekly title flair while it is held.
    flairs: [
      ...Object.keys(h)
        .filter((f) => f.startsWith(FLAIR_FIELD) && h[f] === '1')
        .map((f) => f.slice(FLAIR_FIELD.length)),
      ...(titleFlair ? [titleFlair.id] : []),
    ],
    flair: h['flair'] || null,
    skins: Object.keys(h)
      .filter((f) => f.startsWith(SKIN_FIELD) && h[f] === '1')
      .map((f) => f.slice(SKIN_FIELD.length)),
    skinWorn: parseSkinWorn(h['skinWorn']),
    donated: Math.max(0, Math.floor(num(h['donated'], 0))),
    level: clamp(Math.floor(num(h['level'], 1)), 1, LEVEL_CONFIG.cap),
    xp: Math.max(0, Math.floor(num(h['xp'], 0))),
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

/** True for exactly one caller per player and solo week. */
const claimSoloWeek = async (userId: string, week: number) => {
  const key = `soloprize:${userId}:${week}`;
  const first = (await redis.incrBy(key, 1)) === 1;
  if (first) await redis.expire(key, 60 * 86_400);
  return first;
};

/** The leaderboard prize notice has been seen; the payout already landed. */
export const dismissSoloPrize = async (userId: string): Promise<void> => {
  await redis.hDel(profileKey(userId), ['soloPrize']);
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
    | 'gearLevels'
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
    | 'flair'
    | 'skinWorn'
    | 'level'
    | 'xp'
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
  if (patch.gearLevels !== undefined)
    fields['gearLevels'] = JSON.stringify(patch.gearLevels);
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
  if (patch.duelListed !== undefined) {
    fields['duelListed'] = patch.duelListed ? '1' : '0';
    // Entry is stamped with its week, so it lapses at the reset on its own.
    if (patch.duelListed)
      fields['duelListedWeek'] = String(duelWeekOf(Date.now()));
  }
  if (patch.flair !== undefined) fields['flair'] = patch.flair ?? '';
  if (patch.skinWorn !== undefined)
    fields['skinWorn'] = JSON.stringify(patch.skinWorn);
  if (patch.level !== undefined)
    fields['level'] = String(
      clamp(Math.floor(patch.level), 1, LEVEL_CONFIG.cap)
    );
  if (patch.xp !== undefined)
    fields['xp'] = String(Math.max(0, Math.floor(patch.xp)));
  if (!Object.keys(fields).length) return;
  await redis.hSet(profileKey(userId), fields);
};
