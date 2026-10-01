/**
 * The moderator admin panel's contract, and the pure maths both ends share.
 *
 * Everything the dashboard draws comes from per-UTC-day Redis records written as
 * the game is played (see server/core/stats.ts). The server hands back the raw
 * day records; summing a 7, 30 or 90 day window is done here, so the client's
 * range toggle never has to ask again.
 */
import { packById } from './engine/economy.js';

/** Plain day-level counters, one hash per day. The zero record is the source
 *  of truth for which fields exist. */
const ZERO_COUNTERS = {
  new_players: 0,
  runs: 0,
  run_wins: 0,
  kings: 0,
  ascensions: 0,
  hearts_applied: 0,
  duels_ranked: 0,
  duels_friendly: 0,
  duel_wins: 0,
  league_entries: 0,
  challenge_posts: 0,
  packs_opened: 0,
  quests_claimed: 0,
  ftue_done: 0,
  // Purchase totals. A moderator's buys land in the tester hash instead, so
  // these only ever count real players.
  gold_orders: 0,
  gems_purchased: 0,
  refunds: 0,
  gem_spends: 0,
  gems_spent: 0,
  coin_spends: 0,
  coins_spent: 0,
};

export type DailyField = keyof typeof ZERO_COUNTERS;
export type Counters = Record<DailyField, number>;

export const DAILY_FIELDS: readonly DailyField[] = [
  'new_players',
  'runs',
  'run_wins',
  'kings',
  'ascensions',
  'hearts_applied',
  'duels_ranked',
  'duels_friendly',
  'duel_wins',
  'league_entries',
  'challenge_posts',
  'packs_opened',
  'quests_claimed',
  'ftue_done',
  'gold_orders',
  'gems_purchased',
  'refunds',
  'gem_spends',
  'gems_spent',
  'coin_spends',
  'coins_spent',
];

export type NumberHash = Record<string, number>;

/** The windows the dashboard offers. */
export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

/** How many days the dashboard reads; the export reads the whole retention. */
export const DASHBOARD_DAYS = 90;
export const STATS_RETENTION_DAYS = 180;

export type AdminDay = {
  /** YYYY-MM-DD, UTC. */
  date: string;
  dau: number;
  counters: Counters;
  /** Counters from moderator accounts, kept apart so test buys never read as
   *  revenue. Only the purchase fields are ever written here. */
  testCounters: Counters;
  /** `<locationId>:runs` and `<locationId>:wins`. */
  locations: NumberHash;
  /** heroClass -> runs started with it. */
  heroes: NumberHash;
  /** questId -> claims. */
  quests: NumberHash;
  /** sku -> purchases, and sku -> currency spent on it (see `skuCurrency`). */
  skus: NumberHash;
  skuSpend: NumberHash;
  testSkus: NumberHash;
  testSkuSpend: NumberHash;
};

/** A current snapshot of every indexed player, cached for a few minutes. */
export type Population = {
  totalPlayers: number;
  ftueDone: number;
  /** Entered in this week's duel league. */
  leagueListed: number;
  /** index = locations open (the map frontier), value = players there. */
  byProgress: number[];
  /** ascension -> players. */
  byAscension: NumberHash;
  computedAt: number;
};

export type RecentPurchase = {
  ts: number;
  sku: string;
  /** Gems granted for a Gold order; gems spent for a gem spend. */
  amount: number;
  username: string;
};

export type RecentPurchases = {
  gold: RecentPurchase[];
  gems: RecentPurchase[];
};

export type AdminDashboardResponse = {
  type: 'adminDashboard';
  days: AdminDay[];
  population: Population;
  recentPurchases: RecentPurchases;
};

export type AdminExportResponse = {
  type: 'adminExport';
  format: 'gearlink-analytics';
  version: 1;
  exportedAt: string;
  days: AdminDay[];
  population: Population;
};

export type AdminUserRow = {
  userId: string;
  username: string;
  firstSeen: number | null;
  lastSeen: number | null;
};

export type AdminUsersResponse = {
  type: 'adminUsers';
  users: AdminUserRow[];
  /** False once the list has run out. */
  more: boolean;
};

export type AdminUserResponse = {
  type: 'adminUser';
  user: AdminUserRow;
  /** The profile hash exactly as stored. Empty for someone who was reset. */
  raw: Record<string, string>;
  inPool: boolean;
};

export type AdminGiftRequest = {
  coins?: number;
  gems?: number;
  heartPieces?: number;
  /** packId -> how many to add. */
  packs?: Record<string, number>;
};

export type AdminActionResponse = {
  type: 'adminAction';
  message: string;
};

export const MAX_GIFT_AMOUNT = 100_000;

/* ---------- SKUs ---------- */

/** Every purchase is filed under one SKU string, whose prefix says what it was. */
export const packSku = (packId: string) => 'pack:' + packId;
export const coinBundleSku = (bundleId: string) => 'coins:' + bundleId;
export const goldSku = (sku: string) => 'gold:' + sku;

export type SkuCurrency = 'gold' | 'gems' | 'coins';

/** The currency a SKU's spend is counted in. Gold orders count the gems they
 *  granted, since the Gold price itself is Reddit's. */
export const skuCurrency = (sku: string): SkuCurrency => {
  if (sku.startsWith('gold:')) return 'gold';
  if (sku.startsWith('coins:')) return 'gems';
  if (sku.startsWith('pack:')) {
    const pack = packById(sku.slice(5));
    return pack?.cur === 'gems' ? 'gems' : 'coins';
  }
  return 'coins';
};

/* ---------- maths ---------- */

export const emptyCounters = (): Counters => ({ ...ZERO_COUNTERS });

/** Raw Redis hash -> counters, with anything missing or junk read as 0. */
export const toCounters = (raw: Record<string, string>): Counters => {
  const out = emptyCounters();
  for (const f of DAILY_FIELDS) {
    const n = Number(raw[f]);
    if (Number.isFinite(n)) out[f] = n;
  }
  return out;
};

export const toNumberHash = (raw: Record<string, string>): NumberHash => {
  const out: NumberHash = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
};

export const sumCounters = (list: Counters[]): Counters => {
  const out = emptyCounters();
  for (const c of list) for (const f of DAILY_FIELDS) out[f] += c[f];
  return out;
};

export const sumHashes = (list: NumberHash[]): NumberHash => {
  const out: NumberHash = {};
  for (const h of list)
    for (const [k, v] of Object.entries(h)) out[k] = (out[k] ?? 0) + v;
  return out;
};

/** The last `days` UTC dates up to and including `now`'s, oldest first. */
export const dateRange = (days: number, now = Date.now()): string[] => {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--)
    out.push(utcDateKey(now - i * 86_400_000));
  return out;
};

export const utcDateKey = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

/** "Oct 1" for "2026-10-01". */
export const dayLabel = (date: string): string => {
  const d = new Date(date + 'T00:00:00Z');
  return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
};

/** Whole-number percentage, 0 when there is nothing to divide by. */
export const pct = (n: number, of: number): number =>
  of > 0 ? Math.round((n / of) * 100) : 0;

export type SkuRow = {
  sku: string;
  count: number;
  spend: number;
  currency: SkuCurrency;
};

/** One row per SKU across a window, most-bought first. */
export const skuRows = (counts: NumberHash, spend: NumberHash): SkuRow[] =>
  Object.entries(counts)
    .map(([sku, count]) => ({
      sku,
      count,
      spend: spend[sku] ?? 0,
      currency: skuCurrency(sku),
    }))
    .sort((a, b) => b.count - a.count || a.sku.localeCompare(b.sku));

export type LocationRow = {
  id: string;
  runs: number;
  wins: number;
  winRate: number;
};

/** Runs and wins per location, in the order the map lists them. */
export const locationRows = (
  locationIds: readonly string[],
  hash: NumberHash
): LocationRow[] =>
  locationIds.map((id) => {
    const runs = hash[id + ':runs'] ?? 0;
    const wins = hash[id + ':wins'] ?? 0;
    return { id, runs, wins, winRate: pct(wins, runs) };
  });
