/**
 * The weekly solo leaderboard.
 *
 * One ladder for the whole subreddit, reset every Monday 00:00 UTC on the same
 * boundary as duels and weekly quests. A player's standing is their WEEKLY
 * POINTS: the sum, over every location, of their best battle score there this
 * week. Battle scores already scale with map depth and ascension, so:
 *
 *   - Climbing pays: each new location opened is a new row to score on, and a
 *     deeper one is worth more for the same play.
 *   - Mastery pays: a higher ascension multiplies every location's points.
 *   - Grinding does not: only a location's BEST counts, so replaying the same
 *     fight only moves the ladder by however much it beat that best.
 *
 * The top ten take a TITLE: a subreddit flair only that week's top players can
 * wear, held for the following week and then gone unless it is defended. The
 * crown has to out-pay a week of daily logins, or the login calendar is the
 * better use of the week, so the titles pay real packs - but never gems,
 * which stay a quest and shop currency.
 *
 * Below the titles, every player who qualifies still banks something, by how
 * far up the ladder they finished - so a mid-table week is worth finishing
 * and a rank lost midweek is worth taking back.
 */
import type { QuestReward } from './quests.js';
import { rewardLabel } from './quests.js';

const DAY_MS = 86_400_000;

/** Runs a week needs before it can place for a prize, so one lucky daily
 *  fight on an otherwise quiet ladder does not take the crown. */
export const SOLO_MIN_RUNS = 3;

/** How many rows the board shows. Everyone else still sees their own rank. */
export const SOLO_BOARD_SIZE = 50;

export type SoloTierId =
  'champion' | 'podium' | 'top10' | 'top25' | 'top50' | 'finisher';

/** Where a tier stops: a fixed place for the titles, a share of the ladder
 *  for the bands below them. */
export type SoloCut =
  { kind: 'rank'; rank: number } | { kind: 'share'; pct: number };

export type SoloTier = {
  id: SoloTierId;
  /** How the tier reads in the board, e.g. "CHAMPION". */
  name: string;
  cut: SoloCut;
  /** Players the ladder needs before this tier pays at all - on a five-player
   *  week, "top ten" is everyone, and that is not a title. */
  minPlayers: number;
  /** The weekly flair this tier lets its holders wear. Null for the bands
   *  below the titles, which pay but do not crown. */
  flairId: string | null;
  color: string;
  rewards: QuestReward[];
};

/** Best tier first. A rank takes the first tier it fits. */
export const SOLO_TIERS: SoloTier[] = [
  {
    id: 'champion',
    name: 'CHAMPION',
    cut: { kind: 'rank', rank: 1 },
    minPlayers: 3,
    flairId: 'weekly-champion',
    color: '#FFC24B',
    rewards: [
      { kind: 'coins', amount: 600 },
      { kind: 'pack', packId: 'silver' },
    ],
  },
  {
    id: 'podium',
    name: 'TOP 3',
    cut: { kind: 'rank', rank: 3 },
    minPlayers: 6,
    flairId: 'weekly-podium',
    color: '#C9D4E8',
    rewards: [
      { kind: 'coins', amount: 400 },
      { kind: 'pack', packId: 'bronze' },
    ],
  },
  {
    id: 'top10',
    name: 'TOP 10',
    cut: { kind: 'rank', rank: 10 },
    minPlayers: 15,
    flairId: 'weekly-top10',
    color: '#E09A5A',
    rewards: [
      { kind: 'coins', amount: 250 },
      { kind: 'pack', packId: 'base' },
    ],
  },
  {
    id: 'top25',
    name: 'TOP 25%',
    cut: { kind: 'share', pct: 0.25 },
    minPlayers: 8,
    flairId: null,
    color: '#7FD3FF',
    rewards: [{ kind: 'coins', amount: 150 }],
  },
  {
    id: 'top50',
    name: 'TOP 50%',
    cut: { kind: 'share', pct: 0.5 },
    minPlayers: 4,
    flairId: null,
    color: '#9DB4D4',
    rewards: [{ kind: 'coins', amount: 100 }],
  },
  {
    id: 'finisher',
    name: 'FINISHER',
    cut: { kind: 'share', pct: 1 },
    minPlayers: 1,
    flairId: null,
    color: '#7F93B8',
    rewards: [{ kind: 'coins', amount: 60 }],
  },
];

/** The lowest rank that still earns a tier on a ladder this size. */
export const soloTierCut = (tier: SoloTier, players: number): number =>
  tier.cut.kind === 'rank'
    ? tier.cut.rank
    : Math.max(1, Math.ceil(players * tier.cut.pct));

/** The tiers that crown: their holders wear a flair for the week after. */
export const isSoloTitle = (tier: SoloTier | null): boolean =>
  !!tier && tier.flairId !== null;

export const soloTierById = (id: string): SoloTier | null =>
  SOLO_TIERS.find((t) => t.id === id) ?? null;

/** The tier a final standing earns, or null for none. */
export const soloTierFor = (
  rank: number | null,
  players: number,
  runs: number
): SoloTier | null => {
  if (rank === null || rank < 1 || runs < SOLO_MIN_RUNS) return null;
  return (
    SOLO_TIERS.find(
      (t) => players >= t.minPlayers && rank <= soloTierCut(t, players)
    ) ?? null
  );
};

/** The next tier up from where a player stands - the closest one that pays
 *  better and is open on a ladder this size - and the rank that earns it.
 *  Null at the top. A player still short of SOLO_MIN_RUNS chases the tier
 *  their rank would already earn, since only the battles are missing. */
export const nextSoloTier = (
  rank: number,
  players: number,
  runs: number
): { tier: SoloTier; rank: number } | null => {
  if (rank < 1) return null;
  const now = soloTierFor(rank, players, runs);
  const better = SOLO_TIERS.slice(0, now ? SOLO_TIERS.indexOf(now) : undefined)
    .filter((t) => players >= t.minPlayers)
    .map((t) => ({ tier: t, rank: soloTierCut(t, players) }));
  if (runs < SOLO_MIN_RUNS) {
    const fits = better.filter((b) => rank <= b.rank);
    if (fits.length) return fits[0]!;
  }
  const ahead = better.filter((b) => b.rank < rank);
  return ahead.length ? ahead[ahead.length - 1]! : null;
};

/** The last stretch of the week, when the board warns who is about to lose
 *  a place. */
export const SOLO_FINAL_MS = 48 * 3_600_000;

/** Players one run tells it passed them, closest first. Anyone further down
 *  the ladder learns from the board itself. */
export const SOLO_ALERT_FANOUT = 5;

/**
 * The ranks, as the ladder reads after a run, of the players that run just
 * passed: everyone between where the runner now sits and where they sat
 * before - or the bottom of the ladder, for a first score. Capped at
 * SOLO_ALERT_FANOUT from the top. Null when the run passed nobody.
 */
export const passedRanks = (
  before: number | null,
  after: number,
  players: number
): { from: number; to: number } | null => {
  const last = Math.min(before ?? players, players, after + SOLO_ALERT_FANOUT);
  return after < 1 || last <= after ? null : { from: after + 1, to: last };
};

/** Weekly points: every location's best this week, added up. */
export const soloPoints = (bests: Record<string, number>): number =>
  Object.values(bests).reduce(
    (sum, n) => sum + (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0),
    0
  );

/** What one run adds to the week: only what it beat the location's best by. */
export const soloGain = (prevBest: number, score: number): number =>
  Math.max(0, Math.floor(score) - Math.max(0, Math.floor(prevBest)));

/** When week `week` starts, in epoch ms. Weeks start Monday 00:00 UTC. */
export const soloWeekStart = (week: number): number => (week * 7 - 3) * DAY_MS;

/** A title earned in `week` is worn through the week after it and lapses at
 *  the start of the one after that. */
export const titleExpiresAt = (week: number): number => soloWeekStart(week + 2);

/** A title is live only in the week straight after the one that earned it. */
export const titleIsLive = (title: SoloTitle | null, week: number): boolean =>
  !!title && title.week + 1 === week;

/** A title held: which tier, and the week that earned it. */
export type SoloTitle = { tier: SoloTierId; week: number; rank: number };

/** Last week's placing, already paid, until its notice is dismissed. */
export type SoloPrize = {
  week: number;
  rank: number;
  tier: SoloTierId;
  rewards: QuestReward[];
};

/** "+300 coins, BRONZE PACK" - one line for a tier's bundle. */
export const soloPrizeLabel = (rewards: QuestReward[]): string =>
  rewards.map(rewardLabel).join(', ');
