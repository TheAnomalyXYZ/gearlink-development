/**
 * Analytics for the moderator admin panel, in Redis.
 *
 *   stats:d:{date}         day counters (DAILY_FIELDS)
 *   stats:td:{date}        the same counters for moderator purchases
 *   stats:dau:{date}       set of users who opened the app that day
 *   stats:loc:{date}       `<locationId>:runs` / `<locationId>:wins`
 *   stats:hero:{date}      heroClass -> runs
 *   stats:quest:{date}     questId -> claims
 *   stats:sku:{date}       sku -> purchases     (stats:tsku for moderators)
 *   stats:skuspend:{date}  sku -> currency spent (stats:tskuspend)
 *   stats:recent:{stream}  newest purchases, scored by time
 *
 *   players:first / players:seen   userId scored by first and last visit
 *   players:names                  lowercase username -> userId
 *   players:handles                userId -> username, as last seen
 *
 * Every day key expires STATS_RETENTION_DAYS after its last write. Recording
 * never throws: a stats write that fails must not fail the run, purchase or
 * duel that triggered it, so each recorder swallows and logs its own errors.
 */
import { redis } from '@devvit/web/server';
import {
  STATS_RETENTION_DAYS,
  dateRange,
  toCounters,
  toNumberHash,
  utcDateKey,
} from '../../shared/admin.js';
import type {
  AdminDay,
  DailyField,
  Population,
  RecentPurchase,
  RecentPurchases,
} from '../../shared/admin.js';
import { MAP_LENGTH } from '../../shared/engine/campaign.js';
import { duelWeekOf } from '../../shared/engine/league.js';
import { isModeratorSafe } from './mods.js';
import { profileKey } from './profile.js';

const TTL_SECONDS = STATS_RETENTION_DAYS * 86_400;

const dayKey = (date: string, test = false) =>
  (test ? 'stats:td:' : 'stats:d:') + date;
const dauKey = (date: string) => 'stats:dau:' + date;
const locKey = (date: string) => 'stats:loc:' + date;
const heroKey = (date: string) => 'stats:hero:' + date;
const questKey = (date: string) => 'stats:quest:' + date;
const skuKey = (date: string, test = false) =>
  (test ? 'stats:tsku:' : 'stats:sku:') + date;
const skuSpendKey = (date: string, test = false) =>
  (test ? 'stats:tskuspend:' : 'stats:skuspend:') + date;
const recentKey = (stream: keyof RecentPurchases) => 'stats:recent:' + stream;

export const PLAYERS_FIRST = 'players:first';
export const PLAYERS_SEEN = 'players:seen';
export const PLAYERS_NAMES = 'players:names';
export const PLAYERS_HANDLES = 'players:handles';
const POPULATION_CACHE = 'stats:population';
const POPULATION_TTL_MS = 5 * 60 * 1000;

const today = () => utcDateKey(Date.now());

const safely = async (label: string, op: () => Promise<unknown>) => {
  try {
    await op();
  } catch (err) {
    console.warn('[stats] ' + label + ' failed: ' + String(err));
  }
};

const bump = async (key: string, fields: Partial<Record<string, number>>) => {
  for (const [field, n] of Object.entries(fields))
    if (n) await redis.hIncrBy(key, field, Math.floor(n));
  await redis.expire(key, TTL_SECONDS);
};

/** Day counters, for the given account's stream. */
const bumpDay = (fields: Partial<Record<DailyField, number>>, test = false) =>
  bump(dayKey(today(), test), fields);

/* ---------- visits ---------- */

/**
 * Called on every app open. Indexes the player for the admin lookup, counts
 * them toward today's DAU, and counts a new player the first time an account
 * with no saved profile is seen. A player who predates the index already has a
 * profile, so indexing them does not count them as new.
 */
export const recordVisit = async (userId: string, username: string) =>
  safely('recordVisit', async () => {
    const now = Date.now();
    const [first, hasProfile] = await Promise.all([
      redis.zScore(PLAYERS_FIRST, userId),
      redis.exists(profileKey(userId)),
    ]);
    const dau = dauKey(today());
    // Independent writes, sent together: this sits in front of every boot.
    await Promise.all([
      first === undefined &&
        redis.zAdd(PLAYERS_FIRST, { member: userId, score: now }),
      first === undefined && !hasProfile && bumpDay({ new_players: 1 }),
      redis.zAdd(PLAYERS_SEEN, { member: userId, score: now }),
      redis.hSet(PLAYERS_NAMES, { [username.toLowerCase()]: userId }),
      redis.hSet(PLAYERS_HANDLES, { [userId]: username }),
      redis
        .zAdd(dau, { member: userId, score: now })
        .then(() => redis.expire(dau, TTL_SECONDS)),
    ]);
  });

/* ---------- gameplay ---------- */

export const recordRun = async (run: {
  heroClass: string;
  locationId: string;
  won: boolean;
  king: boolean;
  ascended: boolean;
}) =>
  safely('recordRun', async () => {
    const date = today();
    await bumpDay({
      runs: 1,
      run_wins: run.won ? 1 : 0,
      kings: run.king ? 1 : 0,
      ascensions: run.ascended ? 1 : 0,
    });
    await bump(locKey(date), {
      [run.locationId + ':runs']: 1,
      [run.locationId + ':wins']: run.won ? 1 : 0,
    });
    await bump(heroKey(date), { [run.heroClass]: 1 });
  });

export const recordDuel = async (ranked: boolean, won: boolean) =>
  safely('recordDuel', () =>
    bumpDay({
      duels_ranked: ranked ? 1 : 0,
      duels_friendly: ranked ? 0 : 1,
      duel_wins: won ? 1 : 0,
    })
  );

export const recordQuestClaim = async (questId: string) =>
  safely('recordQuestClaim', async () => {
    await bumpDay({ quests_claimed: 1 });
    await bump(questKey(today()), { [questId]: 1 });
  });

/** Any one-off day counter with no extra breakdown. */
export const recordEvent = async (
  field:
    | 'hearts_applied'
    | 'league_entries'
    | 'challenge_posts'
    | 'packs_opened'
    | 'ftue_done'
) => safely('recordEvent ' + field, () => bumpDay({ [field]: 1 }));

/* ---------- purchases ---------- */

// The log keeps a few more than the dashboard shows, to cover near-simultaneous
// buys, and lives this long past the last one logged.
const RECENT_CAP = 25;
export const RECENT_SHOWN = 10;
const RECENT_TTL_SECONDS = 100 * 86_400;

const logRecent = async (
  stream: keyof RecentPurchases,
  entry: Omit<RecentPurchase, 'ts'>
) => {
  const ts = Date.now();
  const key = recentKey(stream);
  // The nonce keeps two identical buys in one millisecond from collapsing
  // into a single sorted-set member.
  const nonce = Math.random().toString(36).slice(2, 8);
  await redis.zAdd(key, {
    member: JSON.stringify({ ts, ...entry, nonce }),
    score: ts,
  });
  await redis.zRemRangeByRank(key, 0, -(RECENT_CAP + 1));
  await redis.expire(key, RECENT_TTL_SECONDS);
};

const bumpSku = async (
  sku: string,
  spend: number,
  test: boolean,
  date = today()
) => {
  await bump(skuKey(date, test), { [sku]: 1 });
  if (spend) await bump(skuSpendKey(date, test), { [sku]: spend });
};

/**
 * Something bought with an in-game currency. A moderator's buy is a test buy
 * and goes to the tester stream; only real players' gem spends reach the
 * recent-purchases log.
 */
export const recordSpend = async (
  userId: string,
  username: string,
  sku: string,
  currency: 'gems' | 'coins',
  amount: number
) =>
  safely('recordSpend', async () => {
    const test = await isModeratorSafe(userId);
    await bumpDay(
      currency === 'gems'
        ? { gem_spends: 1, gems_spent: amount }
        : { coin_spends: 1, coins_spent: amount },
      test
    );
    await bumpSku(sku, amount, test);
    if (!test && currency === 'gems')
      await logRecent('gems', { sku, amount, username });
  });

/** A Reddit Gold order paid out. `skus` are already prefixed with goldSku. */
export const recordGoldOrder = async (
  userId: string,
  username: string,
  skus: string[],
  gems: number
) =>
  safely('recordGoldOrder', async () => {
    const test = await isModeratorSafe(userId);
    await bumpDay({ gold_orders: 1, gems_purchased: gems }, test);
    for (const sku of skus) await bumpSku(sku, 0, test);
    // The gems granted are counted once per order, against its first SKU.
    if (skus[0]) await bump(skuSpendKey(today(), test), { [skus[0]]: gems });
    if (!test)
      await logRecent('gold', { sku: skus.join(', '), amount: gems, username });
  });

export const recordRefund = async (userId: string) =>
  safely('recordRefund', async () =>
    bumpDay({ refunds: 1 }, await isModeratorSafe(userId))
  );

/* ---------- reading ---------- */

const readHash = async (key: string) =>
  (await redis.hGetAll(key).catch(() => null)) ?? {};

const readDay = async (date: string): Promise<AdminDay> => {
  const [
    counters,
    testCounters,
    locations,
    heroes,
    quests,
    skus,
    skuSpend,
    testSkus,
    testSkuSpend,
    dau,
  ] = await Promise.all([
    readHash(dayKey(date)),
    readHash(dayKey(date, true)),
    readHash(locKey(date)),
    readHash(heroKey(date)),
    readHash(questKey(date)),
    readHash(skuKey(date)),
    readHash(skuSpendKey(date)),
    readHash(skuKey(date, true)),
    readHash(skuSpendKey(date, true)),
    redis.zCard(dauKey(date)).catch(() => 0),
  ]);
  return {
    date,
    dau,
    counters: toCounters(counters),
    testCounters: toCounters(testCounters),
    locations: toNumberHash(locations),
    heroes: toNumberHash(heroes),
    quests: toNumberHash(quests),
    skus: toNumberHash(skus),
    skuSpend: toNumberHash(skuSpend),
    testSkus: toNumberHash(testSkus),
    testSkuSpend: toNumberHash(testSkuSpend),
  };
};

// Days are read in batches so a full retention window does not fire every
// Redis read at once.
const DAYS_PER_BATCH = 30;

/** The last `days` days, oldest first. */
export const readDays = async (days: number): Promise<AdminDay[]> => {
  const dates = dateRange(days);
  const out: AdminDay[] = [];
  for (let i = 0; i < dates.length; i += DAYS_PER_BATCH)
    out.push(
      ...(await Promise.all(dates.slice(i, i + DAYS_PER_BATCH).map(readDay)))
    );
  return out;
};

export const isEmptyDay = (d: AdminDay): boolean =>
  d.dau === 0 &&
  Object.values(d.counters).every((v) => v === 0) &&
  Object.values(d.testCounters).every((v) => v === 0) &&
  [
    d.locations,
    d.heroes,
    d.quests,
    d.skus,
    d.skuSpend,
    d.testSkus,
    d.testSkuSpend,
  ].every((h) => Object.keys(h).length === 0);

const parseRecent = (member: string): RecentPurchase | null => {
  try {
    const p: unknown = JSON.parse(member);
    if (!p || typeof p !== 'object') return null;
    const ts = 'ts' in p ? Number(p.ts) : NaN;
    const amount = 'amount' in p ? Number(p.amount) : NaN;
    const sku = 'sku' in p && typeof p.sku === 'string' ? p.sku : null;
    const username =
      'username' in p && typeof p.username === 'string' ? p.username : '?';
    if (!Number.isFinite(ts) || !Number.isFinite(amount) || !sku) return null;
    return { ts, sku, amount, username };
  } catch {
    return null;
  }
};

export const readRecentPurchases = async (): Promise<RecentPurchases> => {
  const read = async (stream: keyof RecentPurchases) => {
    const entries = await redis
      .zRange(recentKey(stream), 0, RECENT_SHOWN - 1, {
        by: 'rank',
        reverse: true,
      })
      .catch(() => []);
    return entries
      .map((e) => parseRecent(e.member))
      .filter((p): p is RecentPurchase => p !== null);
  };
  const [gold, gems] = await Promise.all([read('gold'), read('gems')]);
  return { gold, gems };
};

const parsePopulation = (raw: string): Population | null => {
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    const n = (k: string) => (k in p ? Number(Reflect.get(p, k)) : Number.NaN);
    const byProgress: unknown = Reflect.get(p, 'byProgress');
    const byAscension: unknown = Reflect.get(p, 'byAscension');
    if (!Array.isArray(byProgress) || !byAscension) return null;
    const computedAt = n('computedAt');
    if (!Number.isFinite(computedAt)) return null;
    return {
      totalPlayers: n('totalPlayers') || 0,
      ftueDone: n('ftueDone') || 0,
      leagueListed: n('leagueListed') || 0,
      byProgress: byProgress.map((x) => Number(x) || 0),
      byAscension: Object.fromEntries(
        Object.entries(byAscension).map(([k, v]) => [k, Number(v) || 0])
      ),
      computedAt,
    };
  } catch {
    return null;
  }
};

/**
 * One read per indexed player, so it is cached and recomputed at most once per
 * POPULATION_TTL_MS, and only when a moderator opens the dashboard.
 */
export const computePopulation = async (): Promise<Population> => {
  const cached = await redis.get(POPULATION_CACHE);
  const hit = cached ? parsePopulation(cached) : null;
  if (hit) return hit;

  const players = await redis.zRange(PLAYERS_FIRST, 0, -1);
  const week = String(duelWeekOf(Date.now()));
  const pop: Population = {
    totalPlayers: players.length,
    ftueDone: 0,
    leagueListed: 0,
    byProgress: new Array<number>(MAP_LENGTH + 1).fill(0),
    byAscension: {},
    computedAt: Date.now(),
  };
  const BATCH = 50;
  for (let i = 0; i < players.length; i += BATCH) {
    const rows = await Promise.all(
      players
        .slice(i, i + BATCH)
        .map((p) =>
          redis.hMGet(profileKey(p.member), [
            'seenFtue',
            'progress',
            'ascension',
            'duelListed',
            'duelListedWeek',
          ])
        )
    );
    for (const [ftue, progress, ascension, listed, listedWeek] of rows) {
      if (ftue === '1') pop.ftueDone++;
      if (listed === '1' && listedWeek === week) pop.leagueListed++;
      const at = Math.max(0, Math.min(MAP_LENGTH, Number(progress) || 0));
      pop.byProgress[at] = (pop.byProgress[at] ?? 0) + 1;
      const asc = String(Number(ascension) || 0);
      pop.byAscension[asc] = (pop.byAscension[asc] ?? 0) + 1;
    }
  }
  await redis.set(POPULATION_CACHE, JSON.stringify(pop), {
    expiration: new Date(Date.now() + POPULATION_TTL_MS),
  });
  return pop;
};
