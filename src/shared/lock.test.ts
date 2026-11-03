import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCK_ATTEMPTS,
  acquireLock,
  lockBackoffMs,
  releaseLock,
  takeKey,
  tryLock,
} from './lock.js';
import type { LockStore, LockTx } from './lock.js';

/** An in-memory Redis with just enough WATCH: a key written after it was
 *  watched fails the transaction, as the real one does. */
const fakeStore = () => {
  const data = new Map<string, { value: string; expires: number }>();
  const version = new Map<string, number>();
  let clock = 0;
  const bump = (key: string) => version.set(key, (version.get(key) ?? 0) + 1);
  const live = (key: string) => {
    const e = data.get(key);
    if (e && e.expires <= clock) {
      data.delete(key);
      bump(key);
    }
    return data.get(key);
  };
  /** Runs between the WATCHed read and EXEC, to stage a race. */
  let beforeExec: (() => void) | null = null;
  const store: LockStore = {
    get: async (key) => live(key)?.value,
    set: async (key, value, options) => {
      if (options?.nx && live(key)) return '';
      data.set(key, {
        value,
        expires: options?.expiration
          ? options.expiration.getTime()
          : Number.POSITIVE_INFINITY,
      });
      bump(key);
      return 'OK';
    },
    watch: async (...keys) => {
      const seen = keys.map((k) => version.get(k) ?? 0);
      const queued: string[] = [];
      const tx: LockTx = {
        multi: async () => undefined,
        del: async (...ks) => {
          queued.push(...ks);
          return tx;
        },
        unwatch: async () => tx,
        exec: async () => {
          beforeExec?.();
          beforeExec = null;
          if (keys.some((k, i) => (version.get(k) ?? 0) !== seen[i]))
            return null;
          for (const k of queued) {
            data.delete(k);
            bump(k);
          }
          return queued.map(() => 1);
        },
      };
      return tx;
    },
  };
  return {
    store,
    data,
    tick: (ms: number) => {
      clock += ms;
    },
    now: () => clock,
    race: (fn: () => void) => {
      beforeExec = fn;
    },
  };
};

void test('backoff starts at zero, doubles and caps', () => {
  assert.equal(lockBackoffMs(0), 0);
  assert.equal(lockBackoffMs(1), 25);
  assert.equal(lockBackoffMs(2), 50);
  assert.equal(lockBackoffMs(3), 100);
  assert.equal(lockBackoffMs(20), 400);
});

void test('a lock is held by exactly one token until it expires', async () => {
  const f = fakeStore();
  assert.equal(await tryLock(f.store, 'l', 'a', 1000, f.now()), true);
  assert.equal(await tryLock(f.store, 'l', 'b', 1000, f.now()), false);
  f.tick(1000);
  assert.equal(await tryLock(f.store, 'l', 'b', 1000, f.now()), true);
});

void test('acquire retries with backoff and gives up with null', async () => {
  const f = fakeStore();
  await f.store.set('l', 'someone else');
  const waits: number[] = [];
  const got = await acquireLock(f.store, 'l', {
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  assert.equal(got, null);
  assert.equal(waits.length, LOCK_ATTEMPTS - 1);

  // Freed part way through: the next try takes it.
  let n = 0;
  const later = await acquireLock(f.store, 'l', {
    wait: async () => {
      if (++n === 2) f.data.delete('l');
    },
  });
  assert.equal(typeof later, 'string');
  assert.equal(await f.store.get('l'), later);
});

void test('release only frees a lock that is still ours', async () => {
  const f = fakeStore();
  await f.store.set('l', 'mine');
  await releaseLock(f.store, 'l', 'not mine');
  assert.equal(await f.store.get('l'), 'mine');
  await releaseLock(f.store, 'l', 'mine');
  assert.equal(await f.store.get('l'), undefined);
});

void test('a key is taken once; a refused value is left alone', async () => {
  const f = fakeStore();
  await f.store.set('k', '42');
  assert.equal(await takeKey(f.store, 'k', (raw) => raw === '7'), undefined);
  assert.equal(await f.store.get('k'), '42');
  assert.equal(await takeKey(f.store, 'k'), '42');
  assert.equal(await takeKey(f.store, 'k'), undefined);
});

void test('a take that loses the race to a write gets nothing', async () => {
  const f = fakeStore();
  await f.store.set('k', 'old');
  f.race(() => {
    void f.store.set('k', 'new');
  });
  assert.equal(await takeKey(f.store, 'k'), undefined);
  assert.equal(await f.store.get('k'), 'new');
});
