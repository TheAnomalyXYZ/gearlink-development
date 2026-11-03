/**
 * The tutorial fight's board: it must hold an attack link, or the drag lesson
 * has nothing to point at.
 *
 * The server owns the battle seed, so the client can no longer re-deal a board
 * that happens to have none. Instead the server, while a player has not yet
 * seen the tutorial fight, hands out a seed whose opening board is teachable.
 * The opening board depends only on the seed, the location and each slot's
 * effect, all of which it knows for that first fight.
 */
import { areAdjacent, orbTypeOf } from './board.js';
import { LOCATIONS } from './campaign.js';
import { MIN_LINK } from './constants.js';
import { ownedLoadout, resolveLoadout } from './gear.js';
import { Run, randomRunSeed } from './run.js';
import type { Gear } from './types.js';

/** Depth-first walk for a path of exactly `target` cells of one orb type. */
const ftueWalk = (
  board: number[],
  path: number[],
  type: number,
  target: number
): number[] | null => {
  if (path.length === target) return path;
  const last = path[path.length - 1]!;
  for (let next = 0; next < board.length; next++) {
    if (path.indexOf(next) >= 0 || !areAdjacent(last, next)) continue;
    const v = board[next];
    if (v == null || orbTypeOf(v) !== type) continue;
    const found = ftueWalk(board, path.concat([next]), type, target);
    if (found) return found;
  }
  return null;
};

/**
 * The shortest attack link off the WEAKEST attack orb equipped - the smallest
 * legal hit in the game, so the tutorial swing cannot one-shot wave 1 and skip
 * the "watch its HP drop" beat.
 */
export const findAttackLink = (
  board: number[],
  loadout: Gear[]
): number[] | null => {
  let best: { path: number[]; power: number } | null = null;
  for (let start = 0; start < board.length; start++) {
    const v = board[start];
    if (v == null) continue;
    const type = orbTypeOf(v);
    const orb = loadout[type];
    if (!orb || orb.effect !== 'attack') continue;
    if (best !== null && orb.power >= best.power) continue;
    const path = ftueWalk(board, [start], type, MIN_LINK);
    if (path) best = { path, power: orb.power };
  }
  return best ? best.path : null;
};

/** Deals tried before settling for an unteachable board (which the client
 *  answers by skipping the drag lesson). A miss is rare well inside this. */
const TEACHABLE_TRIES = 80;

/**
 * A seed for the tutorial fight: the post's default Hero five out of `gear`,
 * at the furthest location `progress` reaches - the same battle the client
 * starts for a player who has not seen it.
 */
export const teachableSeed = (
  gear: Record<string, number>,
  progress: number,
  rand: () => number = Math.random
): number => {
  const picked = ownedLoadout('Hero', gear);
  const loadout = resolveLoadout(picked);
  const location =
    LOCATIONS[Math.min(Math.max(0, progress), LOCATIONS.length - 1)] ??
    LOCATIONS[0]!;
  let seed = randomRunSeed(rand);
  if (!loadout.some((o) => o.effect === 'attack')) return seed;
  for (let tries = 0; tries < TEACHABLE_TRIES; tries++) {
    const start = new Run({
      seed,
      heroClass: 'Hero',
      picked,
      locationId: location.id,
    }).start();
    if (findAttackLink(start.board, loadout)) return seed;
    seed = randomRunSeed(rand);
  }
  return seed;
};
