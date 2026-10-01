/**
 * The Daily Gauntlet post.
 *
 * Once a UTC day the scheduler puts up a fresh GearLink post. Every post keeps
 * its own ladder, so each day starts with an empty board and a crown nobody
 * holds yet - something to play for even on a day no one throws a challenge.
 */
import { reddit, redis } from '@devvit/web/server';
import type { DailyPoster } from '../../shared/api.js';
import {
  dailyFoe,
  gauntletNumber,
  posterFor,
  utcDayKey,
} from '../../shared/daily.js';
import { getLeaderboard, ladderSize } from './leaderboard.js';
import { readPostData } from './post.js';

/** What a daily post carries. */
type DailyData = { daily: number; date: string };

const guardKey = (dayKey: string) => `daily:post:${dayKey}`;

/** Longer than a day, short enough to clean itself up. */
const GUARD_TTL_MS = 48 * 60 * 60 * 1000;

const submitDailyPost = async (dayKey: string) => {
  const day = gauntletNumber(Date.parse(dayKey + 'T00:00:00Z'));
  const foe = dailyFoe(day);
  const data: DailyData = { daily: 1, date: dayKey };
  return await reddit.submitCustomPost({
    title:
      'Daily Gauntlet #' +
      day +
      ' - ' +
      foe.foe +
      ' guards the ' +
      foe.region +
      '. Who takes the crown today?',
    postData: { ...data },
    textFallback: {
      text: "Today's GearLink Daily Gauntlet. Fresh ladder, empty crown - open the post to play.",
    },
  });
};

export type DailyPostResult =
  | { status: 'created'; dayKey: string; postId: string }
  | { status: 'skipped'; dayKey: string; postId?: string };

/**
 * Put up today's gauntlet, at most once per UTC day.
 *
 * The scheduler delivers at least once, and a moderator can post the day by
 * hand, so the day's slot is claimed atomically before anything is submitted.
 * A failure releases the claim so the next attempt can retry.
 */
export const postDailyOnce = async (
  now = Date.now()
): Promise<DailyPostResult> => {
  const dayKey = utcDayKey(now);
  const key = guardKey(dayKey);
  const expiration = new Date(now + GUARD_TTL_MS);

  const txn = await redis.watch(key);
  const existing = await redis.get(key);
  if (existing) {
    await txn.unwatch();
    return existing === 'pending'
      ? { status: 'skipped', dayKey }
      : { status: 'skipped', dayKey, postId: existing };
  }
  await txn.multi();
  await txn.set(key, 'pending', { expiration });
  const claim = await txn.exec();
  if (!claim || claim.length === 0) return { status: 'skipped', dayKey };

  try {
    const post = await submitDailyPost(dayKey);
    await redis.set(key, post.id, { expiration });
    return { status: 'created', dayKey, postId: post.id };
  } catch (err) {
    await redis.del(key);
    throw err;
  }
};

const readDailyDate = (raw: unknown): string | null => {
  if (!raw || typeof raw !== 'object') return null;
  if (!('daily' in raw) || !raw.daily || !('date' in raw)) return null;
  const date = raw.date;
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : null;
};

/**
 * The poster an ordinary post's inline view draws, or null for a challenge
 * post. A daily post is drawn as its own day; any other post as today's.
 */
export const readPoster = async (
  postId: string
): Promise<DailyPoster | null> => {
  const raw = await readPostData(postId);
  if (raw && typeof raw === 'object' && 'challenge' in raw) return null;
  const date = readDailyDate(raw);
  const [rows, players] = await Promise.all([
    getLeaderboard(postId, undefined, 3),
    ladderSize(postId),
  ]);
  return posterFor(
    !!date,
    date ?? utcDayKey(Date.now()),
    rows.map((r) => ({ username: r.username, score: r.score, hero: r.hero })),
    players
  );
};
