/**
 * The daily login streak, in Redis, one hash per player:
 *
 *   streak:{userId}   last, count, best, shields
 *
 * Kept apart from the profile hash so a claim can WATCH just this key: two
 * taps racing each other see the same `last`, and only the first transaction
 * lands. The rules themselves live in `shared/engine/streak.ts`.
 */
import { redis } from '@devvit/web/server';
import {
  EMPTY_STREAK,
  claimStreak,
  rewardLabel,
  streakDayOf,
  streakView,
} from '../../shared/engine/index.js';
import type {
  QuestReward,
  StreakState,
  StreakView,
} from '../../shared/engine/index.js';
import { loadProfile, saveProfile } from './profile.js';

const streakKey = (userId: string) => `streak:${userId}`;

const int = (raw: string | undefined, fallback: number): number => {
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

const parse = (h: Record<string, string>): StreakState => ({
  last: int(h['last'], EMPTY_STREAK.last),
  count: Math.max(0, int(h['count'], 0)),
  best: Math.max(0, int(h['best'], 0)),
  shields: Math.max(0, int(h['shields'], 0)),
});

const readStreak = async (userId: string): Promise<StreakState> =>
  parse(await redis.hGetAll(streakKey(userId)));

export const loadStreak = async (
  userId: string,
  now = Date.now()
): Promise<StreakView> => streakView(await readStreak(userId), now);

/** Drop the streak, as for a fresh account. */
export const resetStreak = async (userId: string): Promise<void> => {
  await redis.del(streakKey(userId));
};

export type StreakClaimResult =
  | {
      ok: true;
      message: string;
      rewards: QuestReward[];
      milestone: number | null;
    }
  | { ok: false; message: string };

/** "Day 4 streak: +120 coins.", with the shield and milestone news after. */
const claimMessage = (
  count: number,
  rewards: QuestReward[],
  extra: { shieldsUsed: number; shieldEarned: boolean; restarted: boolean }
): string => {
  const parts = [
    'Day ' + count + ' reward: ' + rewards.map(rewardLabel).join(', ') + '.',
  ];
  if (extra.shieldsUsed > 0)
    parts.push(
      extra.shieldsUsed === 1
        ? 'A shield saved your streak.'
        : extra.shieldsUsed + ' shields saved your streak.'
    );
  if (extra.shieldEarned) parts.push('Shield earned!');
  if (extra.restarted) parts.push('A new streak begins.');
  return parts.join(' ');
};

/**
 * Pay today's login reward. The new streak state is committed in a WATCHed
 * transaction BEFORE the reward lands, so a double tap can only ever pay once
 * - the same burn-first order quest claims use.
 */
export const claimDailyStreak = async (
  userId: string,
  username: string,
  now = Date.now()
): Promise<StreakClaimResult> => {
  const key = streakKey(userId);
  const today = streakDayOf(now);

  const txn = await redis.watch(key);
  const claim = claimStreak(await readStreak(userId), today);
  if (!claim) {
    await txn.unwatch();
    return { ok: false, message: "Today's reward is already claimed." };
  }
  await txn.multi();
  await txn.hSet(key, {
    last: String(claim.state.last),
    count: String(claim.state.count),
    best: String(claim.state.best),
    shields: String(claim.state.shields),
  });
  const done = await txn.exec();
  if (!done || done.length === 0)
    return { ok: false, message: "Today's reward is already claimed." };

  const profile = await loadProfile(userId, username);
  let coins = profile.coins;
  let gems = profile.gems;
  const packs = { ...profile.packs };
  for (const r of claim.rewards) {
    if (r.kind === 'coins') coins += r.amount;
    else if (r.kind === 'gems') gems += r.amount;
    else packs[r.packId] = (packs[r.packId] ?? 0) + 1;
  }
  await saveProfile(userId, { coins, gems, packs });

  return {
    ok: true,
    message: claimMessage(claim.state.count, claim.rewards, claim),
    rewards: claim.rewards,
    milestone: claim.milestone,
  };
};
