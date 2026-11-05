/**
 * The seed of each player's next battle, owned by the server.
 *
 *   runseed:{userId}               the one seed this player may submit a run on,
 *                                  stored as `seed` or `seed:tag`
 *   dailytry:{userId}:{dayKey}     how many of a day's seeds they have banked
 *
 * A seed is handed out ahead of time (with /init and with every run result) so
 * starting a battle needs no round trip. Asking again while one is pending
 * returns the same seed, so there is nothing to reroll; submitting a run takes
 * it, so the same transcript can never be banked twice.
 *
 * The tag says where a seed came from. A Daily Battle post deals the day's
 * shared seeds, and swaps out a pending seed some other post dealt - the
 * swap only ever lands on the day's fixed seed, so it rerolls nothing. Any
 * other post swaps a day's seed back out, so the day's first try is never
 * spent away from its post.
 */
import { redis } from '@devvit/web/server';
import type { DailyBattle, Profile } from '../../shared/api.js';
import { dailyRunSeed, utcDayKey } from '../../shared/daily.js';
import {
  isRunSeed,
  randomRunSeed,
  teachableSeed,
} from '../../shared/engine/index.js';
import { takeOnce } from './lock.js';

/** Long enough to outlast any battle left open in a tab overnight. */
const SEED_TTL_MS = 24 * 60 * 60 * 1000;

/** Outlives the day it counts, then cleans itself up. */
const TRY_TTL_SECONDS = 48 * 60 * 60;

const seedKey = (userId: string) => `runseed:${userId}`;
const tryKey = (userId: string, dayKey: string) =>
  `dailytry:${userId}:${dayKey}`;

/** Tags a seed a day's post dealt: `d` and the day. */
const DAILY_TAG = 'd';

const split = (raw: string | undefined) => {
  if (raw === undefined) return null;
  const [n, tag = null] = raw.split(':');
  const seed = Number(n);
  return isRunSeed(seed) ? { seed, tag } : null;
};

const parse = (raw: string | undefined): number | null =>
  split(raw)?.seed ?? null;

/** How a player's next seed is dealt, and which pending seed it leaves be. */
export type SeedIssuer = {
  tag: string | null;
  issue: (userId: string) => number | Promise<number>;
  /** Keep a pending seed with this tag rather than deal over it. */
  keeps: (tag: string | null) => boolean;
};

const RANDOM: SeedIssuer = {
  tag: null,
  issue: () => randomRunSeed(),
  keeps: (tag) => !tag?.startsWith(DAILY_TAG),
};

/** The pending seed, without issuing one. */
export const peekRunSeed = async (userId: string): Promise<number | null> =>
  parse(await redis.get(seedKey(userId)));

/** The pending seed, issuing one if there is none (or the one there is the
 *  issuer's to replace). Two callers racing here both come back with
 *  whichever seed landed first. */
export const pendingRunSeed = async (
  userId: string,
  issuer: SeedIssuer = RANDOM
): Promise<number> => {
  const key = seedKey(userId);
  const have = split(await redis.get(key));
  if (have && issuer.keeps(have.tag)) return have.seed;
  const seed = await issuer.issue(userId);
  await redis.set(
    key,
    issuer.tag === null ? String(seed) : seed + ':' + issuer.tag,
    {
      // Dealing over a seed means writing over it; a fresh one must not.
      nx: !have,
      expiration: new Date(Date.now() + SEED_TTL_MS),
    }
  );
  const now = parse(await redis.get(key));
  if (now === null) throw new Error('could not issue a battle seed');
  return now;
};

/** Burn `seed` if it is the pending one. True for exactly one caller. A
 *  day's seed burnt is one of that day's tries used up. */
export const consumeRunSeed = async (
  userId: string,
  seed: number
): Promise<boolean> => {
  const raw = await takeOnce(seedKey(userId), (r) => parse(r) === seed);
  if (raw === undefined) return false;
  const tag = split(raw)?.tag;
  if (tag?.startsWith(DAILY_TAG)) {
    const key = tryKey(userId, tag.slice(DAILY_TAG.length));
    if ((await redis.incrBy(key, 1)) === 1)
      await redis.expire(key, TRY_TTL_SECONDS);
  }
  return true;
};

/** A Daily Battle post's seeds: the day's shared first seed, then one per
 *  try banked. Counted on banking, not dealing, so deals that race - or a
 *  seed swapped out unplayed - land on the same try rather than skip one. */
const dailyIssuer = (daily: DailyBattle): SeedIssuer => {
  const dayKey = utcDayKey(daily.endsAt - 1);
  const tag = DAILY_TAG + dayKey;
  return {
    tag,
    issue: async (userId) => {
      const banked = Number((await redis.get(tryKey(userId, dayKey))) ?? 0);
      return dailyRunSeed(daily.day, banked + 1);
    },
    keeps: (t) => t === tag,
  };
};

/** How to issue this player's next seed: a teachable board while the
 *  tutorial fight is still ahead of them, the day's seeds on a Daily Battle
 *  post while its day lasts, a random one anywhere else. Once the day is
 *  over its tries stop counting (and their count expires), so its seeds
 *  stop too - dealt again, a banked transcript could be banked again. */
export const seedFor = (
  profile: Profile,
  daily: DailyBattle | null = null
): SeedIssuer => {
  if (!profile.seenFtueFight)
    return {
      tag: null,
      issue: () => teachableSeed(profile.gear, profile.progress),
      keeps: () => true,
    };
  return daily && Date.now() < daily.endsAt ? dailyIssuer(daily) : RANDOM;
};
