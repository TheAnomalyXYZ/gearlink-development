/**
 * The seed of each player's next battle, owned by the server.
 *
 *   runseed:{userId}   the one seed this player may submit a run on
 *
 * A seed is handed out ahead of time (with /init and with every run result) so
 * starting a battle needs no round trip. Asking again while one is pending
 * returns the same seed, so there is nothing to reroll; submitting a run takes
 * it, so the same transcript can never be banked twice.
 */
import { redis } from '@devvit/web/server';
import type { Profile } from '../../shared/api.js';
import {
  isRunSeed,
  randomRunSeed,
  teachableSeed,
} from '../../shared/engine/index.js';
import { takeOnce } from './lock.js';

/** Long enough to outlast any battle left open in a tab overnight. */
const SEED_TTL_MS = 24 * 60 * 60 * 1000;

const seedKey = (userId: string) => `runseed:${userId}`;

const parse = (raw: string | undefined): number | null => {
  const n = raw === undefined ? NaN : Number(raw);
  return isRunSeed(n) ? n : null;
};

/** The pending seed, without issuing one. */
export const peekRunSeed = async (userId: string): Promise<number | null> =>
  parse(await redis.get(seedKey(userId)));

/** The pending seed, issuing one if there is none. Two callers racing here
 *  both come back with whichever seed landed first. `issue` picks a new seed
 *  where a plain random one will not do (see `seedFor`). */
export const pendingRunSeed = async (
  userId: string,
  issue: () => number = randomRunSeed
): Promise<number> => {
  const key = seedKey(userId);
  const have = parse(await redis.get(key));
  if (have !== null) return have;
  await redis.set(key, String(issue()), {
    nx: true,
    expiration: new Date(Date.now() + SEED_TTL_MS),
  });
  const now = parse(await redis.get(key));
  if (now === null) throw new Error('could not issue a battle seed');
  return now;
};

/** Burn `seed` if it is the pending one. True for exactly one caller. */
export const consumeRunSeed = async (
  userId: string,
  seed: number
): Promise<boolean> =>
  (await takeOnce(seedKey(userId), (raw) => parse(raw) === seed)) !== undefined;

/** How to issue this player's next seed: a teachable board while the
 *  tutorial fight is still ahead of them, a random one after. */
export const seedFor = (profile: Profile): (() => number) =>
  profile.seenFtueFight
    ? randomRunSeed
    : () => teachableSeed(profile.gear, profile.progress);
