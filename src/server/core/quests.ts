/**
 * Quest progress, in Redis, one hash per player per period.
 *
 *   quests:{userId}:d{day}   daily metrics and claims
 *   quests:{userId}:w{week}  weekly metrics and claims
 *
 * Fields are `m:<metric>` for counters and `c:<questId>` for claims. A period
 * rolling over is just a new key, and the old one expires on its own.
 */
import { redis } from '@devvit/web/server';
import type { QuestBoard, QuestView } from '../../shared/api.js';
import {
  BEST_METRICS,
  QUESTS,
  questById,
  questPeriodKey,
  questResetAt,
  questStatus,
  rewardLabel,
  sortQuestStatuses,
} from '../../shared/engine/quests.js';
import type {
  QuestEvent,
  QuestMetric,
  QuestPeriod,
  QuestProgress,
} from '../../shared/engine/quests.js';
import { loadProfile, saveProfile } from './profile.js';

const PERIODS: QuestPeriod[] = ['daily', 'weekly'];

/** Kept a little past the period's end, so a request that straddles midnight
 *  still finds the hash it started on. */
const TTL_SECONDS: Record<QuestPeriod, number> = {
  daily: 2 * 86_400,
  weekly: 8 * 86_400,
};

const questKey = (userId: string, period: QuestPeriod, now: number) =>
  `quests:${userId}:${questPeriodKey(period, now)}`;

const METRICS: readonly QuestMetric[] = [
  'battles',
  'wins',
  'kings',
  'waves',
  'chain',
  'coins',
  'duels',
  'duelWins',
  'packs',
  'dailies',
];

const readProgress = async (
  userId: string,
  period: QuestPeriod,
  now: number
): Promise<QuestProgress> => {
  const h = await redis.hGetAll(questKey(userId, period, now));
  const metrics: QuestProgress['metrics'] = {};
  for (const m of METRICS) {
    const n = Number(h['m:' + m]);
    if (Number.isFinite(n) && n > 0) metrics[m] = Math.floor(n);
  }
  const claimed = Object.keys(h)
    .filter((f) => f.startsWith('c:') && h[f] === '1')
    .map((f) => f.slice(2));
  return { metrics, claimed };
};

/**
 * Bump both periods' counters. Called AFTER the thing being counted has been
 * banked, and never allowed to fail it: a quest that misses one tick is a far
 * smaller wrong than a run that errors after its coins were paid.
 */
export const recordQuestEvents = async (
  userId: string,
  events: QuestEvent[],
  now = Date.now()
): Promise<void> => {
  try {
    for (const period of PERIODS) {
      const key = questKey(userId, period, now);
      for (const e of events) {
        if (!(e.amount > 0)) continue;
        const field = 'm:' + e.metric;
        if (BEST_METRICS.includes(e.metric)) {
          const cur = Number(await redis.hGet(key, field)) || 0;
          if (e.amount > cur)
            await redis.hSet(key, { [field]: String(e.amount) });
        } else {
          await redis.hIncrBy(key, field, Math.floor(e.amount));
        }
      }
      await redis.expire(key, TTL_SECONDS[period]);
    }
  } catch (err) {
    console.error('quest progress failed: ' + String(err));
  }
};

/** Drop this period's progress and claims, as for a fresh account. */
export const resetQuests = async (
  userId: string,
  now = Date.now()
): Promise<void> => {
  await redis.del(...PERIODS.map((p) => questKey(userId, p, now)));
};

export const loadQuestBoard = async (
  userId: string,
  now = Date.now()
): Promise<QuestBoard> => {
  const [daily, weekly] = await Promise.all(
    PERIODS.map((p) => readProgress(userId, p, now))
  );
  const views = (period: QuestPeriod, p: QuestProgress): QuestView[] =>
    sortQuestStatuses(
      QUESTS.filter((q) => q.period === period).map((q) => questStatus(q, p))
    ).map((s) => ({
      id: s.def.id,
      period: s.def.period,
      title: s.def.title,
      blurb: s.def.blurb,
      progress: s.progress,
      target: s.def.target,
      reward: s.def.reward,
      claimed: s.claimed,
      claimable: s.claimable,
    }));
  return {
    daily: views('daily', daily!),
    weekly: views('weekly', weekly!),
    dailyResetAt: questResetAt('daily', now),
    weeklyResetAt: questResetAt('weekly', now),
  };
};

export type ClaimResult =
  { ok: true; message: string } | { ok: false; message: string };

/**
 * Pay out one finished quest. The claim flag is written with HSETNX BEFORE the
 * reward lands, so two taps racing each other can only ever pay once - the
 * same burn-first order the pack collect uses.
 */
export const claimQuest = async (
  userId: string,
  username: string,
  questId: string,
  now = Date.now()
): Promise<ClaimResult> => {
  const def = questById(questId);
  if (!def) return { ok: false, message: 'no such quest' };

  const progress = await readProgress(userId, def.period, now);
  const status = questStatus(def, progress);
  if (status.claimed) return { ok: false, message: 'Already claimed.' };
  if (!status.claimable) return { ok: false, message: 'Not finished yet.' };

  const key = questKey(userId, def.period, now);
  const won = await redis.hSetNX(key, 'c:' + def.id, '1');
  if (!won) return { ok: false, message: 'Already claimed.' };
  await redis.expire(key, TTL_SECONDS[def.period]);

  const profile = await loadProfile(userId, username);
  const r = def.reward;
  if (r.kind === 'coins')
    await saveProfile(userId, { coins: profile.coins + r.amount });
  else if (r.kind === 'gems')
    await saveProfile(userId, { gems: profile.gems + r.amount });
  else
    await saveProfile(userId, {
      packs: {
        ...profile.packs,
        [r.packId]: (profile.packs[r.packId] ?? 0) + 1,
      },
    });

  // The daily capstone counts the OTHER dailies, so claiming it adds nothing.
  if (def.period === 'daily' && def.metric !== 'dailies')
    await recordQuestEvents(userId, [{ metric: 'dailies', amount: 1 }], now);

  return {
    ok: true,
    message: def.title + ' complete: ' + rewardLabel(r) + '.',
  };
};
