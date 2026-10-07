/**
 * The subreddit's war chest, in Redis.
 *
 * Redis is already scoped to one installation, which is one subreddit, so the
 * keys only need the week. A new week is simply a new key - there is no reset
 * job - and old weeks expire on their own.
 *
 *   warchest:{week}          coins in the chest
 *   warchest:{week}:donors   sorted set, userId -> coins given this week
 *   warchest:{week}:names    hash, userId -> username, for the donors list
 */
import { redis } from '@devvit/web/server';
import type { Profile, WarChest } from '../../shared/api.js';
import {
  WAR_CHEST_TOP,
  duelSeasonEndsAt,
  duelWeekOf,
  nextWarChestTier,
  warChestBonusPct,
  warChestTier,
} from '../../shared/engine/index.js';
import { profileKey } from './profile.js';

const chestKey = (week: number) => `warchest:${week}`;
const donorsKey = (week: number) => `warchest:${week}:donors`;
const namesKey = (week: number) => `warchest:${week}:names`;

/** Long enough to look back at last week's chest, short enough not to pile up. */
const CHEST_TTL_SECONDS = 60 * 86_400;

const readTotal = async (week: number): Promise<number> => {
  const n = Number(await redis.get(chestKey(week)));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** The battle-coin bonus live right now, in percent. */
export const liveChestBonusPct = async (now = Date.now()): Promise<number> =>
  warChestBonusPct(await readTotal(duelWeekOf(now)));

export const loadWarChest = async (
  userId: string,
  now = Date.now()
): Promise<WarChest> => {
  const week = duelWeekOf(now);
  const [total, rows, names, yours, donors] = await Promise.all([
    readTotal(week),
    redis.zRange(donorsKey(week), 0, WAR_CHEST_TOP - 1, {
      by: 'rank',
      reverse: true,
    }),
    redis.hGetAll(namesKey(week)),
    redis.zScore(donorsKey(week), userId),
    redis.zCard(donorsKey(week)),
  ]);
  return {
    total,
    bonusPct: warChestBonusPct(total),
    yours: Math.floor(yours ?? 0),
    top: rows.map((r) => ({
      username: names[r.member] ?? 'someone',
      amount: Math.floor(r.score),
      isYou: r.member === userId,
    })),
    donors,
    resetAt: duelSeasonEndsAt(now),
  };
};

export type DonateResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * Move `amount` coins from the player's wallet into this week's chest.
 *
 * The wallet is debited with HINCRBY rather than the read-modify-write the
 * shop uses: two taps landing together must not both spend the same coins
 * and put twice as many into the chest as left the wallet. A debit that went
 * below zero is put straight back.
 */
export const donate = async (
  userId: string,
  username: string,
  profile: Profile,
  amount: number,
  now = Date.now()
): Promise<DonateResult> => {
  const key = profileKey(userId);
  // A fresh account's starting coins are a default, not a stored field, and
  // HINCRBY on a missing field would count down from zero instead.
  if ((await redis.hGet(key, 'coins')) === undefined)
    await redis.hSet(key, { coins: String(profile.coins) });

  const left = await redis.hIncrBy(key, 'coins', -amount);
  if (left < 0) {
    await redis.hIncrBy(key, 'coins', amount);
    return { ok: false, message: 'Not enough coins for that donation.' };
  }

  const week = duelWeekOf(now);
  const after = await redis.incrBy(chestKey(week), amount);
  await redis.zIncrBy(donorsKey(week), userId, amount);
  await redis.hSet(namesKey(week), { [userId]: username });
  await redis.hIncrBy(key, 'donated', amount);
  await Promise.all([
    redis.expire(chestKey(week), CHEST_TTL_SECONDS),
    redis.expire(donorsKey(week), CHEST_TTL_SECONDS),
    redis.expire(namesKey(week), CHEST_TTL_SECONDS),
  ]);

  const before = after - amount;
  const reached = warChestTier(after);
  if (reached && warChestTier(before) !== reached)
    return {
      ok: true,
      message:
        'The war chest hit +' +
        reached.bonusPct +
        '% battle coins for everyone this week!',
    };
  const next = nextWarChestTier(after);
  return {
    ok: true,
    message:
      'Gave ' +
      amount +
      ' coins.' +
      (next
        ? ' ' + (next.at - after).toLocaleString('en-US') + ' to the next bonus.'
        : ''),
  };
};
