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
import { reddit, redis } from '@devvit/web/server';
import type { Profile, WarChest } from '../../shared/api.js';
import {
  WAR_CHEST_TIERS,
  WAR_CHEST_TOP,
  duelWeekOf,
  nextWarChestTier,
  warChestBonusPct,
  warChestEndsAt,
  warChestTier,
  warChestWeekLabel,
} from '../../shared/engine/index.js';
import { profileKey } from './profile.js';
import { readPostData } from './post.js';

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

/** A week's chest as `userId` sees it - this week's unless told otherwise.
 *  A logged-out reader has no row of their own. */
export const loadWarChest = async (
  userId: string | undefined,
  week = duelWeekOf(Date.now())
): Promise<WarChest> => {
  const [total, rows, names, yours, donors] = await Promise.all([
    readTotal(week),
    redis.zRange(donorsKey(week), 0, WAR_CHEST_TOP - 1, {
      by: 'rank',
      reverse: true,
    }),
    redis.hGetAll(namesKey(week)),
    userId ? redis.zScore(donorsKey(week), userId) : Promise.resolve(undefined),
    redis.zCard(donorsKey(week)),
  ]);
  return {
    week,
    total,
    bonusPct: warChestBonusPct(total),
    yours: Math.floor(yours ?? 0),
    top: rows.map((r) => ({
      username: names[r.member] ?? 'someone',
      amount: Math.floor(r.score),
      isYou: !!userId && r.member === userId,
    })),
    donors,
    resetAt: warChestEndsAt(week),
  };
};

export type DonateResult =
  { ok: true; message: string } | { ok: false; message: string };

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
        ? ' ' +
          (next.at - after).toLocaleString('en-US') +
          ' to the next bonus.'
        : ''),
  };
};

/* ---------- the weekly post ---------- */

/** What a War Chest post carries: the week it was made for. */
type WarChestData = { warchest: 1; week: number };

const postGuardKey = (week: number) => `warchest:${week}:post`;

const submitWarChestPost = async (week: number) => {
  const top = WAR_CHEST_TIERS[WAR_CHEST_TIERS.length - 1]!;
  const data: WarChestData = { warchest: 1, week };
  return await reddit.submitCustomPost({
    title:
      'War Chest - week of ' +
      warChestWeekLabel(week) +
      '. Fill it together for up to +' +
      top.bonusPct +
      '% battle coins for everyone!',
    postData: { ...data },
    textFallback: {
      text: "This week's GearLink War Chest. Give coins from the post to raise everyone's battle coins until Monday.",
    },
  });
};

export type WarChestPostResult =
  | { status: 'created'; week: number; postId: string }
  | { status: 'skipped'; week: number; postId?: string };

/**
 * Put up this week's War Chest post, at most once per week.
 *
 * Same claim-then-submit shape as the Daily Battle: the scheduler delivers at
 * least once and a moderator can post by hand, so the week's slot is taken
 * atomically first, and a failed submit gives it back.
 */
export const postWarChestOnce = async (
  now = Date.now()
): Promise<WarChestPostResult> => {
  const week = duelWeekOf(now);
  const key = postGuardKey(week);
  const expiration = new Date(warChestEndsAt(week) + 7 * 86_400_000);

  const txn = await redis.watch(key);
  const existing = await redis.get(key);
  if (existing) {
    await txn.unwatch();
    return existing === 'pending'
      ? { status: 'skipped', week }
      : { status: 'skipped', week, postId: existing };
  }
  await txn.multi();
  await txn.set(key, 'pending', { expiration });
  const claim = await txn.exec();
  if (!claim || claim.length === 0) return { status: 'skipped', week };

  try {
    const post = await submitWarChestPost(week);
    await redis.set(key, post.id, { expiration });
    return { status: 'created', week, postId: post.id };
  } catch (err) {
    await redis.del(key);
    throw err;
  }
};

/** The week a War Chest post was made for, or null for any other post. */
export const readWarChestWeek = async (
  postId: string
): Promise<number | null> => {
  const raw = await readPostData(postId);
  if (!raw || typeof raw !== 'object' || !('warchest' in raw)) return null;
  const week = 'week' in raw ? Number(raw.week) : NaN;
  return raw.warchest && Number.isInteger(week) ? week : null;
};
