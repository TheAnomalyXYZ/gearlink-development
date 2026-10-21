/**
 * Weekly divisions: the solo leaderboard cut into small groups of equals.
 *
 * One subreddit-wide ladder is won by whoever has climbed furthest, every week,
 * and a newcomer reading "#143" has no reason to look again. So every player
 * also sits in a DIVISION - Bronze up to Diamond - and their first battle of
 * the week seats them in a GROUP of up to GROUP_SIZE players of that division.
 * The group is where a normal week is won:
 *
 *   - Its top players move up a division at the reset, its bottom players
 *     move down, and everyone between holds.
 *   - Every qualified finish pays, by place in the group, and a higher
 *     division pays more for the same place.
 *   - Reaching a division for the first time pays a one-off bonus, so the
 *     bonus cannot be farmed by dropping and climbing back.
 *
 * A week away is forgiven once: the division holds through the first missed
 * week and drops one for each missed week after it, so the ladder above stays
 * made of people who play.
 *
 * Groups fill in the order players arrive, like the war chest - no matchmaking
 * job, just a seat counter per division and week.
 */
import type { QuestReward } from './quests.js';
import { SOLO_MIN_RUNS, nextTier, tierFor } from './solo.js';
import type { CutTier } from './solo.js';

/** Seats per group: small enough that #1 is in reach, big enough to race. */
export const GROUP_SIZE = 20;

/** Most players one group sends up, or down. */
export const MOVE_MAX = 5;

/** A group this small sends nobody down - with a handful of players the
 *  bottom quarter is just whoever turned up last. */
export const DEMOTE_MIN_GROUP = 8;

/** Missed weeks forgiven before the division starts to fall. */
export const IDLE_GRACE = 1;

export type DivisionId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type Division = {
  id: DivisionId;
  name: string;
  color: string;
  /** What a group finish here pays, against Bronze's. */
  payScale: number;
  /** Paid the first time a player is promoted into this division. */
  firstReach: QuestReward[];
};

/** Lowest first: a division's index is its height. */
export const DIVISIONS: Division[] = [
  {
    id: 'bronze',
    name: 'BRONZE',
    color: '#D08A52',
    payScale: 1,
    firstReach: [],
  },
  {
    id: 'silver',
    name: 'SILVER',
    color: '#C9D4E8',
    payScale: 1.25,
    firstReach: [{ kind: 'pack', packId: 'base' }],
  },
  {
    id: 'gold',
    name: 'GOLD',
    color: '#FFC24B',
    payScale: 1.5,
    firstReach: [{ kind: 'pack', packId: 'bronze' }],
  },
  {
    id: 'platinum',
    name: 'PLATINUM',
    color: '#7FE0D8',
    payScale: 2,
    firstReach: [{ kind: 'pack', packId: 'silver' }],
  },
  {
    id: 'diamond',
    name: 'DIAMOND',
    color: '#9BB8FF',
    payScale: 2.5,
    firstReach: [{ kind: 'pack', packId: 'gold' }],
  },
];

export const TOP_DIVISION = DIVISIONS.length - 1;

export const divisionIndex = (id: string | null | undefined): number => {
  const i = DIVISIONS.findIndex((d) => d.id === id);
  return i < 0 ? 0 : i;
};

export const divisionAt = (i: number): Division =>
  DIVISIONS[Math.max(0, Math.min(TOP_DIVISION, i))]!;

export type GroupBandId = 'first' | 'top25' | 'top50' | 'finisher';

export type GroupBand = CutTier & {
  id: GroupBandId;
  name: string;
  color: string;
  /** Bronze's payout; a division scales it by its payScale. */
  coins: number;
};

/** Best band first. Every qualified finish fits one. */
export const GROUP_BANDS: GroupBand[] = [
  {
    id: 'first',
    name: 'GROUP #1',
    cut: { kind: 'rank', rank: 1 },
    minPlayers: 3,
    color: '#FFC24B',
    coins: 200,
  },
  {
    id: 'top25',
    name: 'TOP 25%',
    cut: { kind: 'share', pct: 0.25 },
    minPlayers: 8,
    color: '#7FD3FF',
    coins: 120,
  },
  {
    id: 'top50',
    name: 'TOP 50%',
    cut: { kind: 'share', pct: 0.5 },
    minPlayers: 4,
    color: '#9DB4D4',
    coins: 80,
  },
  {
    id: 'finisher',
    name: 'FINISHER',
    cut: { kind: 'share', pct: 1 },
    minPlayers: 1,
    color: '#7F93B8',
    coins: 50,
  },
];

export const groupBandById = (id: string): GroupBand | null =>
  GROUP_BANDS.find((b) => b.id === id) ?? null;

/** The band a group finish earns, or null for none. */
export const groupBandFor = (
  rank: number | null,
  size: number,
  runs: number
): GroupBand | null => tierFor(GROUP_BANDS, rank, size, runs);

/** The next band up from a place in the group. */
export const nextGroupBand = (
  rank: number,
  size: number,
  runs: number
): { tier: GroupBand; rank: number } | null =>
  nextTier(GROUP_BANDS, rank, size, runs);

/** What a band pays in a division: its coins, scaled, to the nearest 5. */
export const bandRewards = (band: GroupBand, div: number): QuestReward[] => [
  {
    kind: 'coins',
    amount: Math.round((band.coins * divisionAt(div).payScale) / 5) * 5,
  },
];

/** How many of a group go up: a quarter, at least one, at most MOVE_MAX. */
export const promoteCount = (size: number): number =>
  size < 1 ? 0 : Math.min(MOVE_MAX, Math.max(1, Math.floor(size / 4)));

/** How many of a group go down: a quarter, once the group is big enough. */
export const demoteCount = (size: number): number =>
  size < DEMOTE_MIN_GROUP ? 0 : Math.min(MOVE_MAX, Math.floor(size / 4));

export type DivOutcome = 'promote' | 'hold' | 'demote';

/**
 * Where a group finish moves a player. `rank` is null for someone seated who
 * never scored, who counts as last. Promotion needs SOLO_MIN_RUNS, as every
 * prize does; the top division has nowhere to go up and the bottom nowhere
 * to go down.
 */
export const groupOutcome = (
  rank: number | null,
  size: number,
  runs: number,
  div: number
): DivOutcome => {
  const place = rank ?? size + 1;
  if (
    div < TOP_DIVISION &&
    runs >= SOLO_MIN_RUNS &&
    place <= promoteCount(size)
  )
    return 'promote';
  if (div > 0 && place > size - demoteCount(size)) return 'demote';
  return 'hold';
};

/** The rank that still promotes and the first rank that drops, for drawing
 *  the zones on a group's table. Zero for a zone the group does not have. */
export const groupZones = (
  size: number,
  div: number
): { promote: number; demote: number } => ({
  promote: div < TOP_DIVISION ? promoteCount(size) : 0,
  demote: div > 0 && demoteCount(size) ? size - demoteCount(size) + 1 : 0,
});

/** A player's place in the divisions, carried week to week on the profile. */
export type DivState = {
  /** Current division, as an index into DIVISIONS. */
  div: number;
  /** Weeks missed in a row. */
  idle: number;
  /** The highest division ever reached - first-reach bonuses pay above it. */
  best: number;
};

export const START_DIV: DivState = { div: 0, idle: 0, best: 0 };

/** One settled week: where it leaves the player, and what promotion paid. */
export const stepDivision = (
  s: DivState,
  outcome: DivOutcome | null
): { next: DivState; bonus: QuestReward[] } => {
  if (outcome === null) {
    const idle = s.idle + 1;
    const div = idle > IDLE_GRACE ? Math.max(0, s.div - 1) : s.div;
    return { next: { ...s, div, idle }, bonus: [] };
  }
  const div =
    outcome === 'promote'
      ? Math.min(TOP_DIVISION, s.div + 1)
      : outcome === 'demote'
        ? Math.max(0, s.div - 1)
        : s.div;
  const bonus = div > s.best ? divisionAt(div).firstReach : [];
  return { next: { div, idle: 0, best: Math.max(s.best, div) }, bonus };
};

/** How a week went in a group, for the reset notice. */
export type GroupResult = {
  /** The division the week was played in. */
  div: DivisionId;
  rank: number;
  size: number;
  band: GroupBandId | null;
  outcome: DivOutcome;
  /** The division the reset left the player in. */
  to: DivisionId;
};
