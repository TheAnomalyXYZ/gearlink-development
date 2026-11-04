/**
 * SHARE on a Daily Battle's end screen: the player's last battle on the post,
 * left as a comment from their own account, so the day's post fills with
 * results to compare.
 *
 *   dailyrun:{userId}:{postId}      the last battle banked on the post
 *   dailyshared:{userId}:{postId}   set once they have shared on it
 *
 * The comment is written from what the server banked, never from anything
 * the client sends, and goes up at most once per player per post.
 */
import { reddit, redis } from '@devvit/web/server';
import { shareText, type DailyRun } from '../../shared/daily.js';

/** Long enough to share yesterday's battle the morning after. */
const TTL_MS = 48 * 60 * 60 * 1000;

const isPostId = (id: string): id is `t3_${string}` => id.startsWith('t3_');

const runKey = (userId: string, postId: string) =>
  `dailyrun:${userId}:${postId}`;
const sharedKey = (userId: string, postId: string) =>
  `dailyshared:${userId}:${postId}`;

export const recordDailyRun = async (
  userId: string,
  postId: string,
  run: DailyRun
): Promise<void> => {
  await redis.set(runKey(userId, postId), JSON.stringify(run), {
    expiration: new Date(Date.now() + TTL_MS),
  });
};

const num = (o: object, k: string): number | null => {
  const v: unknown = k in o ? Reflect.get(o, k) : undefined;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

const readRun = (raw: string | undefined): DailyRun | null => {
  if (!raw) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object') return null;
  const hero: unknown = 'hero' in o ? o.hero : null;
  const day = num(o, 'day'),
    score = num(o, 'score'),
    waves = num(o, 'waves'),
    waveCount = num(o, 'waveCount'),
    chain = num(o, 'chain');
  if (
    day === null ||
    score === null ||
    waves === null ||
    waveCount === null ||
    chain === null ||
    (hero !== 'Hero' && hero !== 'Archer' && hero !== 'Mage')
  )
    return null;
  return {
    day,
    score,
    waves,
    waveCount,
    chain,
    hero,
    won: 'won' in o && o.won === true,
    rank: num(o, 'rank'),
  };
};

export type ShareOutcome = 'shared' | 'nothing' | 'already';

/** Comment the player's last battle on the post, once. */
export const shareDailyRun = async (
  userId: string,
  postId: string
): Promise<ShareOutcome> => {
  const run = readRun(await redis.get(runKey(userId, postId)));
  if (!run || !isPostId(postId)) return 'nothing';
  // Claimed by token read-back, as the profile lock does: two taps racing
  // here leave one comment.
  const key = sharedKey(userId, postId);
  const token = String(Math.random());
  await redis.set(key, token, {
    nx: true,
    expiration: new Date(Date.now() + TTL_MS),
  });
  if ((await redis.get(key)) !== token) return 'already';
  try {
    await reddit.submitComment({
      id: postId,
      text: shareText(run),
      runAs: 'USER',
    });
  } catch (err) {
    // Let them try again once Reddit takes it.
    await redis.del(key);
    throw err;
  }
  return 'shared';
};
