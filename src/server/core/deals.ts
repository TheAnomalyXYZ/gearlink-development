/**
 * Daily deals, in Redis.
 *
 *   deals:{userId}:{dayKey}   field per bought slot
 *
 * The lineup itself is never stored: it is `dailyDeals(userId, dayKey)`, so
 * only what was bought needs remembering. A new day is a new key, and the old
 * one expires on its own.
 */
import { redis } from '@devvit/web/server';
import type { DealsBoard } from '../../shared/api.js';
import { DAY_MS, nextDailyAt, utcDayKey } from '../../shared/daily.js';
import { dailyDeals } from '../../shared/engine/deals.js';

/** Kept a day past its own, so a buy that straddles midnight still finds it. */
const TTL_SECONDS = 2 * (DAY_MS / 1000);

const dealsKey = (userId: string, dayKey: string) =>
  `deals:${userId}:${dayKey}`;

export const loadDealsBoard = async (
  userId: string,
  now = Date.now()
): Promise<DealsBoard> => {
  const dayKey = utcDayKey(now);
  const bought = await redis.hGetAll(dealsKey(userId, dayKey));
  return {
    dayKey,
    resetAt: nextDailyAt(now),
    deals: dailyDeals(userId, dayKey).map((d) => ({
      ...d,
      bought: !!bought[d.id],
    })),
  };
};

/** Mark a slot sold. Runs under the profile lock, so the read in front of it
 *  and this write cannot interleave with another buy. */
export const markDealBought = async (
  userId: string,
  dayKey: string,
  dealId: string
): Promise<void> => {
  const key = dealsKey(userId, dayKey);
  await redis.hSet(key, { [dealId]: String(Date.now()) });
  await redis.expire(key, TTL_SECONDS);
};
