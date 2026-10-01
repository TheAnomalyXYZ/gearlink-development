/**
 * The opponent pool.
 *
 * Every player who has LISTED their duel loadout sits in one sorted set scored
 * by their trophy count, with a companion hash holding what the lobby needs to
 * draw them: handle, snoovatar, class and their five. A lobby is then just a
 * slice of that set either side of the asker's own score - which is what makes
 * the five rows "people near your rating" rather than a global top list.
 *
 * Nothing here plays a duel. The match is still driven by the local bot; what
 * the pool supplies is WHO it plays as.
 */
import { redis, reddit } from '@devvit/web/server';
import {
  DUEL_LOBBY_SIZE,
  botsInTier,
  skillForTrophies,
} from '../../shared/engine/duel.js';
import type { DuelFoe } from '../../shared/engine/duel.js';
import { duelWeekOf, leagueOf, tierRange } from '../../shared/engine/league.js';
import { loadoutIsLegal } from '../../shared/engine/gear.js';
import type { HeroClass } from '../../shared/engine/types.js';

const POOL_KEY = 'duelpool';
const POOL_META = 'duelpoolmeta';
/** member -> the duel week its pool score was last true for. */
const POOL_WEEK = 'duelpoolweek';
/** The last week the whole pool was swept to. */
const POOL_SWEPT = 'duelpoolswept';

type PoolMeta = {
  username: string;
  cls: HeroClass;
  picked: string[];
  avatar: string;
};

/** A listed player's blurb is their league, not a personality line - the bot
 *  drives their kit, so promising a play style would be a lie. */
const blurbFor = (trophies: number, cls: HeroClass): string =>
  leagueOf(trophies).name + ' - duels as ' + cls;

const readMeta = (raw: string | undefined): PoolMeta | null => {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<PoolMeta>;
    const cls = p.cls;
    if (cls !== 'Hero' && cls !== 'Archer' && cls !== 'Mage') return null;
    const picked = Array.isArray(p.picked)
      ? p.picked.filter((x): x is string => typeof x === 'string')
      : [];
    return {
      username: typeof p.username === 'string' ? p.username : 'someone',
      cls,
      picked: loadoutIsLegal(picked, cls) ? picked : [],
      avatar: typeof p.avatar === 'string' ? p.avatar : '',
    };
  } catch {
    return null;
  }
};

/** Snoovatars are fetched once, when a loadout is listed, and kept on the pool
 *  row - a lobby draws five opponents and must not cost five extra round trips
 *  to Reddit to do it. */
const fetchAvatar = async (username: string): Promise<string> => {
  try {
    return (await reddit.getSnoovatarUrl(username)) ?? '';
  } catch {
    return '';
  }
};

export const listInPool = async (
  userId: string,
  username: string,
  trophies: number,
  cls: HeroClass,
  picked: string[]
): Promise<void> => {
  const avatar = await fetchAvatar(username);
  const meta: PoolMeta = { username, cls, picked, avatar };
  await redis.zAdd(POOL_KEY, { member: userId, score: trophies });
  await redis.hSet(POOL_META, { [userId]: JSON.stringify(meta) });
  await redis.hSet(POOL_WEEK, { [userId]: String(duelWeekOf(Date.now())) });
};

export const removeFromPool = async (userId: string): Promise<void> => {
  await redis.zRem(POOL_KEY, [userId]);
  await redis.hDel(POOL_META, [userId]);
  await redis.hDel(POOL_WEEK, [userId]);
};

export const isInPool = async (userId: string): Promise<boolean> =>
  (await redis.zScore(POOL_KEY, userId)) !== undefined;

/** Keep a listed player's pool score in step with their trophies, so the bands
 *  other people match against stay honest. A player who is not listed is left
 *  alone rather than silently added back. */
export const syncPoolScore = async (
  userId: string,
  trophies: number
): Promise<void> => {
  const at = await redis.zScore(POOL_KEY, userId);
  if (at === undefined) return;
  await redis.zAdd(POOL_KEY, { member: userId, score: trophies });
  await redis.hSet(POOL_WEEK, { [userId]: String(duelWeekOf(Date.now())) });
};

/**
 * Clear last week's entries, once per week. Entering the league lasts one week
 * and does not renew, so a row stamped for an older week - or one from before
 * weeks were stamped - is simply dropped. A player who enters again is listed
 * afresh at their settled trophy count.
 */
const sweepPool = async (): Promise<void> => {
  const week = duelWeekOf(Date.now());
  if (Number(await redis.get(POOL_SWEPT)) === week) return;
  // First caller this week does the sweep; everyone else carries on.
  const lock = POOL_SWEPT + ':' + week;
  if ((await redis.incrBy(lock, 1)) !== 1) return;
  await redis.expire(lock, 8 * 86_400);
  const rows = await redis.zRange(POOL_KEY, 0, -1);
  const weeks = rows.length ? await redis.hGetAll(POOL_WEEK) : {};
  const stale = rows
    .map((r) => r.member)
    .filter((m) => Number(weeks[m] ?? -1) < week);
  if (stale.length) {
    await redis.zRem(POOL_KEY, stale);
    await redis.hDel(POOL_META, stale);
    await redis.hDel(POOL_WEEK, stale);
  }
  await redis.set(POOL_SWEPT, String(week));
};

/**
 * Up to five opponents in the asker's TIER - any of its three levels - never
 * the asker. Real duellists always come first; the tier's house bots only pad
 * a lobby the pool cannot fill, and there are more of them in the low tiers
 * where a player most needs someone to climb against.
 *
 * The cursor is what REFRESH moves - it rotates the window through everyone in
 * the tier, so pressing it walks the list instead of reshuffling the same five.
 */
export const opponentsInTier = async (
  userId: string,
  trophies: number,
  cursor: number
): Promise<{ opponents: DuelFoe[]; padded: boolean }> => {
  await sweepPool();
  const { min, max } = tierRange(trophies);
  let rows = await redis.zRange(
    POOL_KEY,
    min,
    Number.isFinite(max) ? max : '+inf',
    { by: 'score' }
  );
  rows = rows.filter((r) => r.member !== userId);
  // Closest first, so the list leads with the fairest matches in the tier.
  rows.sort(
    (a, b) => Math.abs(a.score - trophies) - Math.abs(b.score - trophies)
  );

  const window: { member: string; score: number }[] = [];
  if (rows.length) {
    const start = ((cursor % rows.length) + rows.length) % rows.length;
    for (let i = 0; i < Math.min(DUEL_LOBBY_SIZE, rows.length); i++)
      window.push(rows[(start + i) % rows.length]!);
  }

  const metas = window.length
    ? await redis.hMGet(
        POOL_META,
        window.map((r) => r.member)
      )
    : [];
  const opponents: DuelFoe[] = [];
  const refreshed: Record<string, string> = {};
  for (let i = 0; i < window.length; i++) {
    const r = window[i]!;
    const m = readMeta(metas[i] ?? undefined);
    if (!m) continue;
    // The row is a PERSON, so it wears their snoovatar. One missing at listing
    // time is asked for again here and kept, rather than written off.
    let avatar = m.avatar;
    if (!avatar) {
      avatar = await fetchAvatar(m.username);
      if (avatar) refreshed[r.member] = JSON.stringify({ ...m, avatar });
    }
    opponents.push({
      kind: 'player',
      id: r.member,
      name: m.username,
      cls: m.cls,
      rating: Math.round(r.score),
      skill: skillForTrophies(r.score),
      blurb: blurbFor(r.score, m.cls),
      avatar,
      picked: m.picked,
    });
  }
  if (Object.keys(refreshed).length) await redis.hSet(POOL_META, refreshed);

  const padded = opponents.length < DUEL_LOBBY_SIZE;
  if (padded) {
    const bots = botsInTier(trophies).map((b) => ({
      ...b,
      blurb: leagueOf(b.rating).name + ' - ' + b.blurb,
    }));
    // Rotate the bots too, so REFRESH changes the padding as well as the people.
    for (let i = 0; opponents.length < DUEL_LOBBY_SIZE && i < bots.length; i++)
      opponents.push(
        bots[(((cursor + i) % bots.length) + bots.length) % bots.length]!
      );
  }

  return { opponents, padded };
};
