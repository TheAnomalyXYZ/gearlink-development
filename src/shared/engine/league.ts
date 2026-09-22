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
};

const TIERS: { tier: LeagueTier; color: string; shade: string }[] = [
  { tier: 'Bronze', color: '#CD8B54', shade: '#5E3A22' },
  { tier: 'Silver', color: '#C7D3E4', shade: '#455063' },
  { tier: 'Gold', color: '#FFC24B', shade: '#6A4A0E' },
  { tier: 'Platinum', color: '#7FD8FF', shade: '#18506B' },
  { tier: 'Diamond', color: '#A46BE8', shade: '#3C1E63' },
  { tier: 'Knight', color: '#FF6BD6', shade: '#5C1140' },
];

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
