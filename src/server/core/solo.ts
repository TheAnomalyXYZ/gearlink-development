/**
 * The weekly solo leaderboard, in Redis.
 *
 * Subreddit-wide rather than per post: every campaign battle on every Gearlink
 * post feeds the same ladder. Like the war chest, a new week is simply a new
 * set of keys - there is no reset job - and old weeks expire on their own once
 * their titles and prizes have been read back.
 *
 *   solo:{week}                 sorted set, userId -> weekly points
 *   solo:{week}:meta            hash, userId -> SoloMeta JSON
 *   solo:{week}:best:{userId}   hash, locationId -> best battle score
 *   solo:{week}:passed:{userId} hash, passerId -> PassNote JSON, cleared
 *                               when the player fights again or reads it
 *
 * And the same points again, per group (shared/engine/division.ts):
 *
 *   solo:{week}:seat:{div}      counter, seats taken in a division this week
 *   solo:{week}:join:{userId}   counter, 1 once the player has been seated
 *   solo:{week}:groupof         hash, userId -> "{div}:{n}"
 *   solo:{week}:grp:{div}:{n}   sorted set, userId -> weekly points
 *
 * The rules - what points are, who places - live in shared/engine/solo.ts.
 */
import { redis } from '@devvit/web/server';
import type {
  SoloAlert,
  SoloBoard,
  SoloChase,
  SoloEntry,
  SoloGroupBoard,
  SoloRunResult,
} from '../../shared/api.js';
import {
  DIVISIONS,
  GROUP_SIZE,
  divisionIndex,
  groupZones,
} from '../../shared/engine/division.js';
import type { DivisionId } from '../../shared/engine/division.js';
import { duelWeekOf } from '../../shared/engine/league.js';
import {
  SOLO_BOARD_SIZE,
  nextSoloTier,
  passedRanks,
  soloGain,
  soloPoints,
  soloTierFor,
  soloWeekStart,
} from '../../shared/engine/solo.js';
import type { SoloTier } from '../../shared/engine/solo.js';
import type { HeroClass } from '../../shared/engine/types.js';

const lbKey = (week: number) => `solo:${week}`;
const metaKey = (week: number) => `solo:${week}:meta`;
const bestKey = (week: number, userId: string) => `solo:${week}:best:${userId}`;
const passedKey = (week: number, userId: string) =>
  `solo:${week}:passed:${userId}`;
const seatKey = (week: number, div: DivisionId) => `solo:${week}:seat:${div}`;
const joinKey = (week: number, userId: string) => `solo:${week}:join:${userId}`;
const groupOfKey = (week: number) => `solo:${week}:groupof`;
const grpKey = (week: number, ref: string) => `solo:${week}:grp:${ref}`;

/** "gold:3" - a division and a group number within it, from 0. */
const parseRef = (
  ref: string | null | undefined
): { div: DivisionId; n: number } | null => {
  const [div, n] = (ref ?? '').split(':');
  const d = DIVISIONS.find((x) => x.id === div);
  const num = Number(n);
  return d && n && Number.isInteger(num) && num >= 0
    ? { div: d.id, n: num }
    : null;
};

/** Long enough to settle a player who comes back weeks later, short enough
 *  not to pile up. */
const KEEP_S = 35 * 86_400;

/** A pass is only news while its week is live. */
const PASSED_KEEP_S = 8 * 86_400;

/** One player passing another: who, and when, so the newest leads. */
type PassNote = { username: string; at: number };

const parseNote = (raw: string): PassNote | null => {
  try {
    const n: unknown = JSON.parse(raw);
    if (!n || typeof n !== 'object' || !('username' in n) || !('at' in n))
      return null;
    return typeof n.username === 'string' && typeof n.at === 'number'
      ? { username: n.username, at: n.at }
      : null;
  } catch {
    return null;
  }
};

type SoloMeta = {
  username: string;
  /** The class of the run that last raised the week's points. */
  hero: HeroClass;
  /** Longest link in any run this week. */
  chain: number;
  /** Runs banked this week, scoring or not. */
  runs: number;
};

const parseMeta = (raw: string | null | undefined): Partial<SoloMeta> => {
  if (!raw) return {};
  try {
    const m: unknown = JSON.parse(raw);
    return m && typeof m === 'object' ? (m as Partial<SoloMeta>) : {};
  } catch {
    return {};
  }
};

const nums = (h: Record<string, string>): Record<string, number> =>
  Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Number(v) || 0]));

/** The live week. */
export const soloWeekNow = (): number => duelWeekOf(Date.now());

/**
 * Bank one finished campaign battle on this week's ladder. Only a location's
 * best counts, so the week's points are re-added from the per-location bests
 * rather than incremented - two runs racing each other cannot double-count.
 */
export const recordSoloRun = async (
  userId: string,
  run: {
    username: string;
    hero: HeroClass;
    chain: number;
    locationId: string;
    score: number;
    /** The player's division, which seats them on their first run. */
    division: DivisionId;
  }
): Promise<SoloRunResult> => {
  const week = soloWeekNow();
  const bk = bestKey(week, userId);
  const prev = Number(await redis.hGet(bk, run.locationId)) || 0;
  const gained = soloGain(prev, run.score);
  if (gained > 0) {
    await redis.hSet(bk, { [run.locationId]: String(Math.floor(run.score)) });
    await redis.expire(bk, KEEP_S);
  }
  const points = soloPoints(nums(await redis.hGetAll(bk)));

  const meta = parseMeta(await redis.hGet(metaKey(week), userId));
  const next: SoloMeta = {
    username: run.username,
    hero: gained > 0 || !meta.hero ? run.hero : meta.hero,
    chain: Math.max(meta.chain ?? 0, run.chain),
    runs: (meta.runs ?? 0) + 1,
  };
  await redis.hSet(metaKey(week), { [userId]: JSON.stringify(next) });
  const ref = await joinGroup(week, userId, run.division);
  const gk = ref ? grpKey(week, ref) : null;
  // Where the run started in its group, to tell whoever it climbs past.
  const before = gk && gained > 0 ? await standingIn(gk, userId) : null;
  if (points > 0) {
    await redis.zAdd(lbKey(week), { member: userId, score: points });
    if (gk) await redis.zAdd(gk, { member: userId, score: points });
  }
  await redis.expire(metaKey(week), KEEP_S);
  await redis.expire(lbKey(week), KEEP_S);
  if (gk) await redis.expire(gk, KEEP_S);

  const [{ rank, players }, inGroup] = await Promise.all([
    standing(week, userId),
    gk ? standingIn(gk, userId) : Promise.resolve(null),
  ]);
  if (gk && before && inGroup?.rank)
    await notifyPassed(
      week,
      gk,
      userId,
      run.username,
      before.rank,
      inGroup.rank,
      inGroup.players
    );
  // Fighting again is the answer to being passed; the notice has done its job.
  await redis.del(passedKey(week, userId));
  return {
    week,
    points,
    gained,
    rank,
    players,
    groupRank: inGroup?.rank ?? null,
    groupSize: inGroup?.players ?? 0,
  };
};

/**
 * The player's group this week, seating them in the first open one of their
 * division on their first run. Seats are handed out by a counter, so groups
 * fill one after another in the order players arrive. Null only for a run
 * that raced the one doing the seating; the next run finds the seat.
 */
const joinGroup = async (
  week: number,
  userId: string,
  div: DivisionId
): Promise<string | null> => {
  const have = await redis.hGet(groupOfKey(week), userId);
  if (have) return have;
  const first = (await redis.incrBy(joinKey(week, userId), 1)) === 1;
  await redis.expire(joinKey(week, userId), KEEP_S);
  // Lost the race: the winner may have written the seat by now.
  if (!first) return (await redis.hGet(groupOfKey(week), userId)) ?? null;
  const seat = await redis.incrBy(seatKey(week, div), 1);
  const ref = div + ':' + Math.floor((seat - 1) / GROUP_SIZE);
  await redis.hSet(groupOfKey(week), { [userId]: ref });
  await redis.expire(seatKey(week, div), KEEP_S);
  await redis.expire(groupOfKey(week), KEEP_S);
  return ref;
};

/** Leave a note on each player a run just climbed past, for their next visit. */
const notifyPassed = async (
  week: number,
  key: string,
  userId: string,
  username: string,
  before: number | null,
  after: number,
  players: number
): Promise<void> => {
  const span = passedRanks(before, after, players);
  if (!span) return;
  const rows = await redis.zRange(key, span.from - 1, span.to - 1, {
    by: 'rank',
    reverse: true,
  });
  const note = JSON.stringify({ username, at: Date.now() });
  await Promise.all(
    rows
      .filter((r) => r.member !== userId)
      .map(async (r) => {
        await redis.hSet(passedKey(week, r.member), { [userId]: note });
        await redis.expire(passedKey(week, r.member), PASSED_KEEP_S);
      })
  );
};

/** Who passed a player in their group this week since they last fought or
 *  looked. Ranks are the group's. */
export const getSoloAlert = async (
  week: number,
  userId: string
): Promise<SoloAlert | null> => {
  const notes = Object.values(await redis.hGetAll(passedKey(week, userId)))
    .map(parseNote)
    .filter((n): n is PassNote => n !== null)
    .sort((a, b) => b.at - a.at);
  if (!notes.length) return null;
  const ref = await redis.hGet(groupOfKey(week), userId);
  if (!ref) return null;
  const gk = grpKey(week, ref);
  const { rank, players } = await standingIn(gk, userId);
  let above: SoloAlert['above'] = null;
  if (rank !== null && rank > 1) {
    const [rows, mine] = await Promise.all([
      redis.zRange(gk, rank - 2, rank - 2, {
        by: 'rank',
        reverse: true,
      }),
      redis.zScore(gk, userId),
    ]);
    const row = rows[0];
    if (row)
      above = {
        username:
          parseMeta(await redis.hGet(metaKey(week), row.member)).username ??
          'someone',
        gap: Math.floor(row.score - (mine ?? 0)) + 1,
      };
  }
  return {
    week,
    passers: notes.slice(0, 3).map((n) => n.username),
    count: notes.length,
    rank,
    players,
    above,
  };
};

/** The pass notice has been seen. */
export const dismissSoloAlert = async (userId: string): Promise<void> => {
  await redis.del(passedKey(soloWeekNow(), userId));
};

/** A player's 1-based rank on a ladder, highest first, and its size. */
const standingIn = async (
  key: string,
  userId: string
): Promise<{ rank: number | null; players: number }> => {
  const [low, players] = await Promise.all([
    redis.zRank(key, userId),
    redis.zCard(key),
  ]);
  // zRank counts from the bottom; the ladder reads highest-first.
  return { rank: low === undefined ? null : players - low, players };
};

/** A player's 1-based rank in a week, subreddit-wide. */
const standing = (week: number, userId: string) =>
  standingIn(lbKey(week), userId);

const entryOf = (
  rank: number,
  member: string,
  points: number,
  raw: string | null | undefined,
  viewerId: string | undefined
): SoloEntry => {
  const m = parseMeta(raw);
  return {
    rank,
    username: m.username ?? 'someone',
    points: Math.round(points),
    hero: m.hero ?? 'Hero',
    chain: m.chain ?? 0,
    runs: m.runs ?? 0,
    isYou: !!viewerId && member === viewerId,
  };
};

/** One week's board: its top rows, and the viewer's own row wherever it is. */
export const getSoloBoard = async (
  week: number,
  viewerId: string | undefined,
  limit = SOLO_BOARD_SIZE
): Promise<SoloBoard> => {
  const rows = await redis.zRange(lbKey(week), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  const metas = rows.length
    ? await redis.hMGet(
        metaKey(week),
        rows.map((r) => r.member)
      )
    : [];
  const entries = rows.map((r, i) =>
    entryOf(i + 1, r.member, r.score, metas[i], viewerId)
  );

  let you = entries.find((e) => e.isYou) ?? null;
  let players: number;
  if (viewerId) {
    const st = await standing(week, viewerId);
    players = st.players;
    if (!you && st.rank !== null) {
      const [pts, raw] = await Promise.all([
        redis.zScore(lbKey(week), viewerId),
        redis.hGet(metaKey(week), viewerId),
      ]);
      you = entryOf(st.rank, viewerId, pts ?? 0, raw, viewerId);
    }
    // Runs that scored nothing still count toward the prize's minimum.
    if (!you) {
      const raw = await redis.hGet(metaKey(week), viewerId);
      if (raw) you = entryOf(0, viewerId, 0, raw, viewerId);
    }
  } else {
    players = await redis.zCard(lbKey(week));
  }

  let above: SoloEntry | null = null;
  let below: SoloEntry | null = null;
  let chase: SoloChase | null = null;
  if (you && you.rank > 0) {
    const r = you.rank;
    const first = Math.max(1, r - 1);
    const near = await redis.zRange(lbKey(week), first - 1, r, {
      by: 'rank',
      reverse: true,
    });
    const nearMeta = near.length
      ? await redis.hMGet(
          metaKey(week),
          near.map((n) => n.member)
        )
      : [];
    for (const [i, n] of near.entries()) {
      const e = entryOf(first + i, n.member, n.score, nearMeta[i], viewerId);
      if (e.rank === r - 1) above = e;
      else if (e.rank === r + 1) below = e;
    }
    const next = nextSoloTier(r, players, you.runs);
    if (next) {
      const held =
        next.rank === r - 1 && above
          ? above.points
          : (
              await redis.zRange(lbKey(week), next.rank - 1, next.rank - 1, {
                by: 'rank',
                reverse: true,
              })
            )[0]?.score;
      if (held !== undefined)
        chase = {
          tier: next.tier.id,
          rank: next.rank,
          points: Math.round(held),
        };
    }
  }

  return {
    week,
    startsAt: soloWeekStart(week),
    endsAt: soloWeekStart(week + 1),
    players,
    entries,
    you,
    above,
    below,
    chase,
  };
};

/** Where a player finished a week, and the tier that standing earned. */
export const finalStanding = async (
  week: number,
  userId: string
): Promise<{ rank: number; tier: SoloTier } | null> => {
  const { rank, players } = await standing(week, userId);
  if (rank === null) return null;
  const runs = parseMeta(await redis.hGet(metaKey(week), userId)).runs ?? 0;
  const tier = soloTierFor(rank, players, runs);
  return tier ? { rank, tier } : null;
};

/** The usernames and ids that held a tier in a week - for stripping titles
 *  that lapsed from players who never came back to see it happen. */
export const titleHolders = async (
  week: number
): Promise<{ userId: string; username: string; tier: SoloTier }[]> => {
  const rows = await redis.zRange(lbKey(week), 0, 9, {
    by: 'rank',
    reverse: true,
  });
  if (!rows.length) return [];
  const [players, metas] = await Promise.all([
    redis.zCard(lbKey(week)),
    redis.hMGet(
      metaKey(week),
      rows.map((r) => r.member)
    ),
  ]);
  const out: { userId: string; username: string; tier: SoloTier }[] = [];
  rows.forEach((r, i) => {
    const m = parseMeta(metas[i]);
    const tier = soloTierFor(i + 1, players, m.runs ?? 0);
    if (tier && m.username)
      out.push({ userId: r.member, username: m.username, tier });
  });
  return out;
};

/** A player's group this week: the whole table, best first. Null until their
 *  first run seats them. */
export const getGroupBoard = async (
  week: number,
  viewerId: string
): Promise<SoloGroupBoard | null> => {
  const ref = await redis.hGet(groupOfKey(week), viewerId);
  const at = parseRef(ref);
  if (!ref || !at) return null;
  const gk = grpKey(week, ref);
  const rows = await redis.zRange(gk, 0, -1, { by: 'rank', reverse: true });
  const metas = rows.length
    ? await redis.hMGet(
        metaKey(week),
        rows.map((r) => r.member)
      )
    : [];
  const entries = rows.map((r, i) =>
    entryOf(i + 1, r.member, r.score, metas[i], viewerId)
  );
  let you = entries.find((e) => e.isYou) ?? null;
  // Seated but not scored yet: still their group, with their battles counted.
  if (!you) {
    const raw = await redis.hGet(metaKey(week), viewerId);
    if (raw) you = entryOf(0, viewerId, 0, raw, viewerId);
  }
  const size = entries.length;
  const zones = groupZones(size, divisionIndex(at.div));
  return {
    week,
    div: at.div,
    group: at.n + 1,
    endsAt: soloWeekStart(week + 1),
    size,
    entries,
    you,
    promote: zones.promote,
    demote: zones.demote,
  };
};

/** Where a player finished in their group, for the reset. Null for a week
 *  they never fought in. */
export const groupStanding = async (
  week: number,
  userId: string
): Promise<{
  div: DivisionId;
  rank: number | null;
  size: number;
  runs: number;
} | null> => {
  const at = parseRef(await redis.hGet(groupOfKey(week), userId));
  if (!at) return null;
  const [{ rank, players }, raw] = await Promise.all([
    standingIn(grpKey(week, at.div + ':' + at.n), userId),
    redis.hGet(metaKey(week), userId),
  ]);
  return { div: at.div, rank, size: players, runs: parseMeta(raw).runs ?? 0 };
};
