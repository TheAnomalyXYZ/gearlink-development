/**
 * The per-post ladder.
 *
 * A sorted set holds one entry per player - their best score on this post - and
 * a companion hash holds the detail the ladder shows beside it. Scoring only
 * ever moves up, so a bad run cannot cost someone their place.
 */
import { redis } from '@devvit/web/server';
import type { LeaderboardEntry } from '../../shared/api.js';
import type { HeroClass } from '../../shared/engine/types.js';

const lbKey = (postId: string) => `lb:${postId}`;
const metaKey = (postId: string) => `lbmeta:${postId}`;

export const LEADERBOARD_SIZE = 20;

type Meta = { username: string; waves: number; chain: number; hero: HeroClass };

export const recordScore = async (
  postId: string,
  userId: string,
  meta: Meta,
  score: number
): Promise<{ isBest: boolean; rank: number | null }> => {
  const prev = await redis.zScore(lbKey(postId), userId);
  const isBest = prev === undefined || score > prev;
  if (isBest) {
    await redis.zAdd(lbKey(postId), { member: userId, score });
    await redis.hSet(metaKey(postId), { [userId]: JSON.stringify(meta) });
  }
  const rank = await redis.zRank(lbKey(postId), userId);
  // zRank counts from the bottom; the ladder reads highest-first.
  const total = await redis.zCard(lbKey(postId));
  return { isBest, rank: rank === undefined ? null : total - rank };
};

export const getLeaderboard = async (
  postId: string,
  viewerId: string | undefined,
  limit = LEADERBOARD_SIZE
): Promise<LeaderboardEntry[]> => {
  const rows = await redis.zRange(lbKey(postId), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  if (!rows.length) return [];
  const meta = await redis.hGetAll(metaKey(postId));
  return rows.map((r, i) => {
    let m: Partial<Meta>;
    try {
      m = JSON.parse(meta[r.member] ?? '{}') as Partial<Meta>;
    } catch {
      m = {};
    }
    return {
      rank: i + 1,
      username: m.username ?? 'someone',
      score: Math.round(r.score),
      waves: m.waves ?? 0,
      chain: m.chain ?? 0,
      hero: (m.hero ?? 'Hero') as HeroClass,
      isYou: !!viewerId && r.member === viewerId,
    };
  });
};
