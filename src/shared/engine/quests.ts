/**
 * Quests, ported from Neura Knights' Daily Duties and Weekly Trials.
 *
 * Neura Knights keeps its quests in a database the API edits live. GearLink has
 * no such table, so the list is static here and only the PROGRESS lives in
 * Redis: one hash per player per period, which simply stops being read when the
 * period rolls over. Nothing has to be reset - a new day is a new key.
 *
 * Every quest counts one metric. The server bumps metrics off what it has
 * already verified (a replayed run, a bounded duel result, a collected pack),
 * so a quest can never be advanced by anything the client merely claims.
 */
import { packById } from './economy.js';

export type QuestPeriod = 'daily' | 'weekly';

export type QuestMetric =
  /** Runs banked, won or lost. */
  | 'battles'
  /** Runs where the location's boss fell. */
  | 'wins'
  /** The Castle's boss - an ascension. */
  | 'kings'
  /** Waves cleared, summed across runs. */
  | 'waves'
  /** Longest single chain linked in one run. A best, not a sum. */
  | 'chain'
  /** Coins banked from runs. */
  | 'coins'
  /** Duels finished inside the credible time window. */
  | 'duels'
  | 'duelWins'
  /** Packs collected. */
  | 'packs'
  /** Other daily quests claimed today - the capstone's own counter. */
  | 'dailies';

/** Metrics that keep the highest value seen rather than a running total. */
export const BEST_METRICS: readonly QuestMetric[] = ['chain'];

export type QuestReward =
  | { kind: 'coins'; amount: number }
  | { kind: 'gems'; amount: number }
  | { kind: 'pack'; packId: string };

export type QuestDef = {
  id: string;
  period: QuestPeriod;
  title: string;
  blurb: string;
  metric: QuestMetric;
  target: number;
  reward: QuestReward;
};

/** Neura Knights' two gameplay groups. Ids are stored against claims, so a
 *  quest that is retuned keeps its id and one that is replaced gets a new one. */
export const QUESTS: QuestDef[] = [
  {
    id: 'd_battles',
    period: 'daily',
    title: 'Take the Field',
    blurb: 'Fight 3 battles on the map.',
    metric: 'battles',
    target: 3,
    reward: { kind: 'coins', amount: 60 },
  },
  {
    id: 'd_wins',
    period: 'daily',
    title: 'Hold the Line',
    blurb: 'Win 2 battles.',
    metric: 'wins',
    target: 2,
    reward: { kind: 'coins', amount: 100 },
  },
  {
    id: 'd_waves',
    period: 'daily',
    title: 'Wave Breaker',
    blurb: 'Clear 12 waves.',
    metric: 'waves',
    target: 12,
    reward: { kind: 'coins', amount: 80 },
  },
  {
    id: 'd_chain',
    period: 'daily',
    title: 'Long Link',
    blurb: 'Link a chain of 8 in one battle.',
    metric: 'chain',
    target: 8,
    reward: { kind: 'gems', amount: 5 },
  },
  {
    id: 'd_duels',
    period: 'daily',
    title: 'Sparring Partner',
    blurb: 'Play 2 duels.',
    metric: 'duels',
    target: 2,
    reward: { kind: 'coins', amount: 80 },
  },
  {
    id: 'd_packs',
    period: 'daily',
    title: 'Fresh Steel',
    blurb: 'Open a pack.',
    metric: 'packs',
    target: 1,
    reward: { kind: 'coins', amount: 60 },
  },
  {
    id: 'd_all',
    period: 'daily',
    title: 'Daily Duties',
    blurb: 'Claim 4 other daily quests.',
    metric: 'dailies',
    target: 4,
    reward: { kind: 'pack', packId: 'base' },
  },
  {
    id: 'w_wins',
    period: 'weekly',
    title: 'Campaigner',
    blurb: 'Win 15 battles.',
    metric: 'wins',
    target: 15,
    reward: { kind: 'pack', packId: 'bronze' },
  },
  {
    id: 'w_coins',
    period: 'weekly',
    title: 'War Chest',
    blurb: 'Bank 2,000 coins from battles.',
    metric: 'coins',
    target: 2000,
    reward: { kind: 'pack', packId: 'silver' },
  },
  {
    id: 'w_duelWins',
    period: 'weekly',
    title: 'Duellist',
    blurb: 'Win 10 duels.',
    metric: 'duelWins',
    target: 10,
    reward: { kind: 'gems', amount: 25 },
  },
  {
    id: 'w_packs',
    period: 'weekly',
    title: 'Collector',
    blurb: 'Open 6 packs.',
    metric: 'packs',
    target: 6,
    reward: { kind: 'gems', amount: 20 },
  },
  {
    id: 'w_king',
    period: 'weekly',
    title: 'Regicide',
    blurb: 'Defeat The King.',
    metric: 'kings',
    target: 1,
    reward: { kind: 'pack', packId: 'gold' },
  },
];

export const questById = (id: string): QuestDef | null =>
  QUESTS.find((q) => q.id === id) ?? null;

/** "+60 coins", "+5 gems", "BRONZE PACK". */
export const rewardLabel = (r: QuestReward): string =>
  r.kind === 'coins'
    ? '+' + r.amount + ' coins'
    : r.kind === 'gems'
      ? '+' + r.amount + ' gems'
      : (packById(r.packId)?.name ?? 'PACK');

export type QuestEvent = { metric: QuestMetric; amount: number };

/** What a banked run is worth to the quest board. */
export const runQuestEvents = (r: {
  won: boolean;
  king: boolean;
  waves: number;
  chain: number;
  coins: number;
}): QuestEvent[] => {
  const out: QuestEvent[] = [{ metric: 'battles', amount: 1 }];
  if (r.won) out.push({ metric: 'wins', amount: 1 });
  if (r.king) out.push({ metric: 'kings', amount: 1 });
  if (r.waves > 0) out.push({ metric: 'waves', amount: r.waves });
  if (r.chain > 0) out.push({ metric: 'chain', amount: r.chain });
  if (r.coins > 0) out.push({ metric: 'coins', amount: r.coins });
  return out;
};

const DAY_MS = 86_400_000;

/** Days since the epoch, UTC. */
const dayNumber = (now: number): number => Math.floor(now / DAY_MS);

/** The epoch was a Thursday; weeks here start on Monday, UTC, the way Neura
 *  Knights' weekly reset does. */
const weekStartDay = (now: number): number => {
  const d = dayNumber(now);
  return d - ((d + 3) % 7);
};

/** The key a period's progress is stored under. A new day or week is simply a
 *  new key, so there is no reset job. */
export const questPeriodKey = (period: QuestPeriod, now: number): string =>
  period === 'daily' ? 'd' + dayNumber(now) : 'w' + weekStartDay(now);

/** When the period containing `now` ends, in epoch ms. */
export const questResetAt = (period: QuestPeriod, now: number): number =>
  period === 'daily'
    ? (dayNumber(now) + 1) * DAY_MS
    : (weekStartDay(now) + 7) * DAY_MS;

export type QuestProgress = {
  metrics: Partial<Record<QuestMetric, number>>;
  claimed: string[];
};

export type QuestStatus = {
  def: QuestDef;
  /** Capped at the target, so a bar never overfills. */
  progress: number;
  claimed: boolean;
  claimable: boolean;
};

export const questStatus = (def: QuestDef, p: QuestProgress): QuestStatus => {
  const have = Math.max(0, Math.floor(p.metrics[def.metric] ?? 0));
  const claimed = p.claimed.includes(def.id);
  const progress = Math.min(have, def.target);
  return {
    def,
    progress,
    claimed,
    claimable: !claimed && progress >= def.target,
  };
};

/** Claimable first, then in progress, then done - Neura Knights' sort. Ties
 *  keep the table's own order. */
export const sortQuestStatuses = (list: QuestStatus[]): QuestStatus[] => {
  const rank = (s: QuestStatus) => (s.claimable ? 0 : s.claimed ? 2 : 1);
  return list
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map((x) => x.s);
};
