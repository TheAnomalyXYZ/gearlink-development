/**
 * Per-player write locks.
 *
 * Handlers read a profile, work out the new wallet and write the absolute
 * numbers back, so two requests for the same player interleaving would each
 * write over the other's result: a double-spend, or a payout wiped out by a
 * stale write. Every handler that changes a profile runs inside
 * `withProfileLock`, which serialises them per player.
 *
 *   lock:profile:{userId}   the holder's token, with a short expiry
 *
 * The lock is re-entrant within one request (tracked in AsyncLocalStorage), so
 * a locked handler can call `loadProfile`, whose lazy weekly settlement takes
 * the same lock for itself.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { redis } from '@devvit/web/server';
import { acquireLock, releaseLock, takeKey } from '../../shared/lock.js';

/** Thrown when the lock stayed taken through every retry. The api answers
 *  it with a 409 the client can simply retry. */
export class BusyError extends Error {
  constructor() {
    super('Still saving your last action - try again.');
    this.name = 'BusyError';
  }
}

const held = new AsyncLocalStorage<ReadonlySet<string>>();

/** Run `fn` holding `key`. Throws BusyError if it cannot be taken. */
export const withLock = async <T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> => {
  const mine = held.getStore();
  if (mine?.has(key)) return await fn();
  const token = await acquireLock(redis, key);
  if (!token) throw new BusyError();
  try {
    return await held.run(new Set([...(mine ?? []), key]), fn);
  } finally {
    await releaseLock(redis, key, token).catch((err: unknown) =>
      console.error('lock release failed: ' + String(err))
    );
  }
};

export const profileLockKey = (userId: string) => `lock:profile:${userId}`;

export const withProfileLock = <T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> => withLock(profileLockKey(userId), fn);

/** GET + DEL as one step: the value for exactly one caller. */
export const takeOnce = (
  key: string,
  accept?: (raw: string) => boolean
): Promise<string | undefined> => takeKey(redis, key, accept);
