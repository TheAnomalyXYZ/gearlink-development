/**
 * Who moderates the subreddit the app is running in.
 *
 * The admin panel and the tester purchase stream both ask this, so the
 * moderator list is cached per server instance for a few minutes rather than
 * fetched from Reddit on every request.
 */
import { context, reddit } from '@devvit/web/server';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { subreddit: string; ids: Set<string>; until: number } | null =
  null;

export const isModerator = async (userId: string | undefined) => {
  const subredditName = context.subredditName;
  if (!userId || !subredditName) return false;
  const now = Date.now();
  if (!cached || cached.subreddit !== subredditName || now > cached.until) {
    const mods = await reddit.getModerators({ subredditName }).all();
    cached = {
      subreddit: subredditName,
      ids: new Set(mods.map((m) => m.id)),
      until: now + CACHE_TTL_MS,
    };
  }
  return cached.ids.has(userId);
};

/** For callers where a failed lookup must not break the request: a Reddit
 *  error reads as "not a moderator". */
export const isModeratorSafe = async (userId: string | undefined) => {
  try {
    return await isModerator(userId);
  } catch (err) {
    console.warn('moderator lookup failed: ' + String(err));
    return false;
  }
};
