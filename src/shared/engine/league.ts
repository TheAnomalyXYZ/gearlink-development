/**
 * The duel ladder, ported from the Neura Knights rank order.
 *
 * Six tiers - Bronze, Silver, Gold, Platinum, Diamond, Knight - climbing the
 * same way the rank table there does. Every tier below the top splits into
 * three levels; Knight has none, because a single rung at the top is what makes
 * it worth naming.
 *
 * A league is DERIVED from the trophy count, never stored. That is the whole
 * demotion rule: lose enough trophies and the band you fall into is simply the
 * lower one, with no separate state that could drift out of step with it.
 */

export type LeagueTier =
  'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Knight';

export type League = {
  /** Index into LEAGUES - the only thing worth comparing two leagues by. */
  idx: number;
  tier: LeagueTier;
  /** 1-3 below Knight, 0 for Knight, which is one rung and shows no numeral. */
  level: number;
  /** "Bronze 1", or just "Knight". */
  name: string;
  /** Lowest trophy count that sits in this league. */
  floor: number;
  color: string;
  /** Darker companion, for the badge's fill behind `color`. */
  shade: string;
  /** The rank sprite, same art the Neura Knights BattleRankIcon draws. */
  icon: string;
  /** The level as Neura Knights writes it on the badge: I, II, III. Empty for
   *  Knight, which is one rung and carries no numeral. */
  numeral: string;
};

/** The rank sprites live beside the rest of the art, served from this app's
 *  own origin - a web view's CSP blocks the CDN they come from. */
const RANK_ART = '/art/NeuraKnights/rank/';

const TIERS: {
  tier: LeagueTier;
  color: string;
  shade: string;
  icon: string;
}[] = [
  {
    tier: 'Bronze',
    color: '#CD8B54',
    shade: '#5E3A22',
    icon: RANK_ART + 'Bronze.png',
  },
  {
    tier: 'Silver',
    color: '#C7D3E4',
    shade: '#455063',
    icon: RANK_ART + 'Silver.png',
  },
  {
    tier: 'Gold',
    color: '#FFC24B',
    shade: '#6A4A0E',
    icon: RANK_ART + 'Gold.png',
  },
  {
    tier: 'Platinum',
    color: '#7FD8FF',
    shade: '#18506B',
    icon: RANK_ART + 'Platinum.png',
  },
  {
    tier: 'Diamond',
    color: '#A46BE8',
    shade: '#3C1E63',
    icon: RANK_ART + 'Diamond.png',
  },
  // Knight's own sprite is the black-and-gold one, not another Gold.
  {
    tier: 'Knight',
    color: '#FF6BD6',
    shade: '#5C1140',
    icon: RANK_ART + 'Goldblack.png',
  },
];

const NUMERALS = ['', 'I', 'II', 'III'];

/** Floors, in ladder order. Bronze 1 opens at 500 rather than nothing: that is
 *  where every account starts AND the hard floor it can never fall through, so
 *  a losing streak costs you rungs but never drops you off the ladder. The gaps
 *  widen as they climb, so the early ranks move on a single win and the late
 *  ones take a streak. */
const FLOORS = [
  500,
  600,
  720, // Bronze 1-3
  860,
  1020,
  1200, // Silver 1-3
  1400,
  1620,
  1860, // Gold 1-3
  2120,
  2400,
  2700, // Platinum 1-3
  3020,
  3360,
  3720, // Diamond 1-3
  4100, // Knight
];

export const LEAGUES: League[] = FLOORS.map((floor, idx) => {
  const knight = idx >= FLOORS.length - 1;
  const t = TIERS[knight ? TIERS.length - 1 : Math.floor(idx / 3)]!;
  const level = knight ? 0 : (idx % 3) + 1;
  return {
    idx,
    tier: t.tier,
    level,
    name: knight ? t.tier : t.tier + ' ' + level,
    floor,
    color: t.color,
    shade: t.shade,
    icon: t.icon,
    numeral: NUMERALS[level] ?? '',
  };
});

export const TOP_LEAGUE = LEAGUES[LEAGUES.length - 1]!;

/** Bronze 1's floor, which is also where an account opens and the lowest a
 *  trophy count can go. Every write of `trophies` clamps to this. */
export const TROPHY_FLOOR = LEAGUES[0]!.floor;

export const leagueOf = (trophies: number): League => {
  const t = Number.isFinite(trophies) ? trophies : 0;
  let found = LEAGUES[0]!;
  for (const l of LEAGUES) if (t >= l.floor) found = l;
  return found;
};

export const nextLeague = (trophies: number): League | null =>
  LEAGUES[leagueOf(trophies).idx + 1] ?? null;

/** How far through the current league a trophy count sits, 0-1. Knight has no
 *  ceiling, so it always reads full. */
export const leagueProgress = (trophies: number): number => {
  const here = leagueOf(trophies);
  const up = nextLeague(trophies);
  if (!up) return 1;
  const span = up.floor - here.floor;
  return span <= 0
    ? 1
    : Math.min(1, Math.max(0, (trophies - here.floor) / span));
};

/** Trophies still needed for the next rung, or null at the top. */
export const toNextLeague = (trophies: number): number | null => {
  const up = nextLeague(trophies);
  return up ? Math.max(0, up.floor - trophies) : null;
};

/* ---------- the weekly season ---------- */

/**
 * Trophies move you between the three levels of a tier during the week, but
 * never across a tier line: the tier only changes at the weekly reset. Then
 * level 3 promotes to level 1 of the tier above, level 2 holds, and level 1
 * drops to DEMOTE_LEVEL of the tier below. Knight is one rung and holds.
 *
 * Settling is a pure function of the trophy count, so a profile and its pool
 * row, settled separately, always land on the same number.
 */

/** Where a demotion lands. Level 2 rather than 3, so a player who stops
 *  playing settles into a tier instead of bouncing between two forever. */
export const DEMOTE_LEVEL = 2;

const DAY_MS = 86_400_000;

/** Weeks since the epoch, starting Monday 00:00 UTC - the same boundary the
 *  weekly quests reset on. */
export const duelWeekOf = (now: number): number =>
  Math.floor((Math.floor(now / DAY_MS) + 3) / 7);

/** When the week containing `now` ends, in epoch ms. */
export const duelSeasonEndsAt = (now: number): number =>
  ((duelWeekOf(now) + 1) * 7 - 3) * DAY_MS;

/** The first and last league index of the tier a trophy count sits in. */
const tierSpan = (trophies: number): { lo: League; hi: League } => {
  const here = leagueOf(trophies);
  const inTier = LEAGUES.filter((l) => l.tier === here.tier);
  return { lo: inTier[0]!, hi: inTier[inTier.length - 1]! };
};

/** Trophy range of the tier `trophies` is in - what the lobby searches, and
 *  what a week's results are held inside. `max` is Infinity at Knight. */
export const tierRange = (trophies: number): { min: number; max: number } => {
  const { lo, hi } = tierSpan(trophies);
  const above = LEAGUES[hi.idx + 1];
  return { min: lo.floor, max: above ? above.floor - 1 : Infinity };
};

/** Apply a duel result: the new count, held inside the current tier. */
export const applyDuelDelta = (trophies: number, delta: number): number => {
  const { min, max } = tierRange(trophies);
  return Math.min(max, Math.max(min, Math.floor(trophies + delta)));
};

/** Where a player ends up at ONE weekly reset. */
export const settleWeek = (trophies: number): number => {
  const here = leagueOf(trophies);
  if (here.level === 3) {
    const up = LEAGUES[here.idx + 1];
    return up ? up.floor : trophies;
  }
  if (here.level === 1 && here.idx > 0) {
    const down = LEAGUES[here.idx - 3 + (DEMOTE_LEVEL - 1)];
    return down ? down.floor : trophies;
  }
  return trophies;
};

/** Settle every reset missed. Bounded: a few weeks reaches a fixed point. */
export const settleWeeks = (trophies: number, weeks: number): number => {
  let t = trophies;
  for (let i = 0; i < Math.min(Math.max(0, weeks), 12); i++) {
    const next = settleWeek(t);
    if (next === t) break;
    t = next;
  }
  return t;
};

/** What the reset will do to this player, as the lobby banner says it. */
export const weeklyOutcome = (
  trophies: number
): 'promote' | 'hold' | 'demote' => {
  const s = settleWeek(trophies);
  return s > trophies ? 'promote' : s < trophies ? 'demote' : 'hold';
};
