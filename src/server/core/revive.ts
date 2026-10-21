/**
 * The CONTINUEs a player has paid for, per battle. A battle is its seed, so
 * the count is keyed on it: the coins come off when the revive is bought, and
 * the submission may spend no more revives than this says were paid.
 */
import { redis } from '@devvit/web/server';

/** Long enough to outlast any battle left open in a tab. */
const REVIVE_TTL_SECONDS = 2 * 24 * 60 * 60;

const reviveKey = (userId: string, seed: number) =>
  'revive:' + userId + ':' + seed;

export const paidRevives = async (
  userId: string,
  seed: number
): Promise<number> =>
  Number((await redis.get(reviveKey(userId, seed))) ?? 0) || 0;

/** Count one more paid revive for this battle and return the new total. */
export const notePaidRevive = async (
  userId: string,
  seed: number
): Promise<number> => {
  const key = reviveKey(userId, seed);
  const n = await redis.incrBy(key, 1);
  await redis.expire(key, REVIVE_TTL_SECONDS);
  return n;
};

/** Hand back a revive that could not be paid for. */
export const releasePaidRevive = async (
  userId: string,
  seed: number
): Promise<void> => {
  await redis.incrBy(reviveKey(userId, seed), -1);
};

/** The battle is banked: its paid revives are spent either way. */
export const clearPaidRevives = async (
  userId: string,
  seed: number
): Promise<void> => {
  await redis.del(reviveKey(userId, seed));
};
