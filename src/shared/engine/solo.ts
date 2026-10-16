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
 * Prizes are deliberately thin - a few coins, at most one low pack, and no gems
 * - so a weekly crown is a bragging right rather than a second economy. The
 * real prize is a TITLE: a subreddit flair only that week's top players can
 * wear, held for the following week and then gone unless it is defended.
 */
import type { QuestReward } from './quests.js';
import { rewardLabel } from './quests.js';

const DAY_MS = 86_400_000;

/** Runs a week needs before it can place for a prize, so one lucky daily
 *  fight on an otherwise quiet ladder does not take the crown. */
export const SOLO_MIN_RUNS = 3;

/** How many rows the board shows. Everyone else still sees their own rank. */
export const SOLO_BOARD_SIZE = 50;

export type SoloTierId = 'champion' | 'podium' | 'top10';

export type SoloTier = {
  id: SoloTierId;
  /** How the title reads in the board, e.g. "CHAMPION". */
  name: string;
  /** The lowest rank that still earns this tier. */
  maxRank: number;
  /** Players the ladder needs before this tier pays at all - on a five-player
   *  week, "top ten" is everyone, and that is not a title. */
  minPlayers: number;
  /** The weekly flair this tier lets its holders wear. */
  flairId: string;
  color: string;
  rewards: QuestReward[];
};

/** Best tier first. A rank takes the first tier it fits. */
export const SOLO_TIERS: SoloTier[] = [
  {
    id: 'champion',
    name: 'CHAMPION',
    maxRank: 1,
    minPlayers: 3,
    flairId: 'weekly-champion',
    color: '#FFC24B',
    rewards: [
      { kind: 'coins', amount: 300 },
      { kind: 'pack', packId: 'bronze' },
    ],
  },
  {
    id: 'podium',
    name: 'TOP 3',
    maxRank: 3,
    minPlayers: 6,
    flairId: 'weekly-podium',
    color: '#C9D4E8',
    rewards: [
      { kind: 'coins', amount: 200 },
      { kind: 'pack', packId: 'base' },
    ],
  },
  {
    id: 'top10',
    name: 'TOP 10',
    maxRank: 10,
    minPlayers: 15,
    flairId: 'weekly-top10',
    color: '#E09A5A',
    rewards: [{ kind: 'coins', amount: 120 }],
  },
];

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
    SOLO_TIERS.find((t) => rank <= t.maxRank && players >= t.minPlayers) ?? null
  );
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
