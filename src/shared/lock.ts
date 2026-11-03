/**
 * Short-lived Redis locks and one-shot keys.
 *
 * Written against the slice of the Redis client they use rather than the
 * Devvit client itself, so the server passes in the real one and the tests a
 * fake. Devvit's client has no GETDEL and types `set` as always returning a
 * string, so both pieces lean on WATCH instead: a lock is only held if reading
 * it back finds our own token, and a key is only taken if the transaction that
 * deletes it lands.
 */

export type LockTx = {
  multi(): Promise<void>;
  del(...keys: string[]): Promise<unknown>;
  exec(): Promise<unknown[] | null>;
  unwatch(): Promise<unknown>;
};

export type LockStore = {
  get(key: string): Promise<string | undefined>;
  set(
    key: string,
    value: string,
    options?: { nx?: boolean; expiration?: Date }
  ): Promise<unknown>;
  watch(...keys: string[]): Promise<LockTx>;
};

/** Long enough for the slowest handler (a run submit is a couple of dozen
 *  round trips), short enough that a crashed request frees the player fast. */
export const LOCK_TTL_MS = 8_000;
/** Tries before giving up: with the backoff below, about two seconds. */
export const LOCK_ATTEMPTS = 8;

/** Wait before try `attempt` (0-based): nothing first, then a doubling step
 *  capped at 400ms, so two taps landing together sort themselves out quickly
 *  and a held lock is not hammered. */
export const lockBackoffMs = (attempt: number): number =>
  attempt <= 0 ? 0 : Math.min(400, 25 * 2 ** (attempt - 1));

export const lockToken = (): string =>
  Date.now().toString(36) +
  '-' +
  Math.floor(Math.random() * 0xffffffff).toString(36);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One try at the lock. True only if it is now ours. */
export const tryLock = async (
  store: LockStore,
  key: string,
  token: string,
  ttlMs = LOCK_TTL_MS,
  now = Date.now()
): Promise<boolean> => {
  await store.set(key, token, { nx: true, expiration: new Date(now + ttlMs) });
  return (await store.get(key)) === token;
};

/** The lock's token once taken, or null if it stayed held through every try. */
export const acquireLock = async (
  store: LockStore,
  key: string,
  opts: {
    ttlMs?: number;
    attempts?: number;
    wait?: (ms: number) => Promise<void>;
  } = {}
): Promise<string | null> => {
  const token = lockToken();
  const wait = opts.wait ?? sleep;
  for (let i = 0; i < (opts.attempts ?? LOCK_ATTEMPTS); i++) {
    const ms = lockBackoffMs(i);
    if (ms) await wait(ms);
    if (await tryLock(store, key, token, opts.ttlMs)) return token;
  }
  return null;
};

/**
 * Delete `key` and hand back what it held - once. A second caller racing the
 * first gets undefined. `accept` can refuse the value, in which case the key
 * is left exactly as it was (a stale token must not burn the live one).
 */
export const takeKey = async (
  store: LockStore,
  key: string,
  accept: (raw: string) => boolean = () => true
): Promise<string | undefined> => {
  const txn = await store.watch(key);
  const raw = await store.get(key);
  if (raw === undefined || !accept(raw)) {
    await txn.unwatch();
    return undefined;
  }
  await txn.multi();
  await txn.del(key);
  const done = await txn.exec();
  return done && done.length > 0 ? raw : undefined;
};

/** Let the lock go, but only if it is still ours: one that outlived its
 *  expiry may already belong to the next request. */
export const releaseLock = async (
  store: LockStore,
  key: string,
  token: string
): Promise<void> => {
  await takeKey(store, key, (raw) => raw === token);
};
