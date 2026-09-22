/**
 * First-run coaching: seven steps, in order, seen once per ACCOUNT.
 *
 * The pre-battle steps are completed by DOING the thing, so they never block
 * input and advance off the phase change rather than a Next button. Only `drag`
 * is interactive inside the arena: the scrim lifts, a sample link glows, and
 * the guide waits for the player to draw it for real.
 */
import { MIN_LINK, areAdjacent, orbTypeOf } from '../shared/engine/index.js';
import type { Gear } from '../shared/engine/types.js';

export type FtueStep =
  'fight' | 'hero' | 'gear' | 'orbs' | 'drag' | 'damage' | 'waves';

export const FTUE_ORDER: FtueStep[] = [
  'fight',
  'hero',
  'gear',
  'orbs',
  'drag',
  'damage',
  'waves',
];

/** Which phase each pre-battle step belongs to, so back-navigation re-points
 *  the card instead of stranding it on a screen that is no longer showing. */
export const FTUE_PHASE_STEP: Record<string, FtueStep> = {
  home: 'fight',
  hero: 'hero',
  gear: 'gear',
};

/** Steps the player completes by acting. These never raise a scrim. */
export const FTUE_DOING: Record<string, boolean> = {
  fight: true,
  hero: true,
  gear: true,
  drag: true,
};

export const FTUE_TARGET: Record<
  string,
  { target: string; place: 'above' | 'below' }
> = {
  fight: { target: 'fight', place: 'above' },
  hero: { target: 'hero', place: 'below' },
  gear: { target: 'slots', place: 'above' },
  orbs: { target: 'board', place: 'above' },
  drag: { target: 'board', place: 'above' },
  damage: { target: 'enemyHp', place: 'above' },
  waves: { target: 'track', place: 'below' },
};

export const FTUE_COPY: Record<string, { title: string; body: string }> = {
  fight: {
    title: 'Start a run',
    body: "Tap FIGHT to set up a run. You'll pick a hero first, then equip the gear you take in.",
  },
  hero: {
    title: 'Pick your hero',
    body: "Your hero's perk lasts the whole run - stronger attack links, stronger block, or stronger heals. Tap one, then continue.",
  },
  gear: {
    title: 'Equip five pieces',
    body: 'Tap gear below to fill these five slots - max 2 per type. Each piece becomes one orb colour on the board.',
  },
  orbs: {
    title: 'Your gear, as orbs',
    body: 'Each piece you equipped became one orb colour on the board. The colour tells you what a link of it does:',
  },
  drag: {
    title: 'Drag to link',
    body: 'Press an orb and drag through 3 or more of the SAME colour (any direction, diagonals count), then let go. Try it now on the glowing red orbs - red is attack.',
  },
  damage: { title: 'Nice hit!', body: '' },
  waves: {
    title: 'Beat waves to win',
    body: 'The bar fills one notch per move; when it reaches the red notch the enemy swings, so block or heal before it does. Kill an enemy and the next wave walks in - the further you get, the bigger the reward.',
  },
};

export const FTUE_LEGEND: Record<string, { label: string; blurb: string }> = {
  attack: { label: 'ATK', blurb: 'Damages the enemy' },
  block: { label: 'BLK', blurb: "Soaks the enemy's next hit" },
  effect: { label: 'HEAL', blurb: 'Restores your HP' },
};

export const FTUE_ARROW_GAP = 6;

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

/**
 * Which phase each duel SETUP step belongs to. The setup card is an overlay on
 * the screen that step is about, so it never floats over a screen the player
 * cannot act on - and the step only appears once its own phase is showing.
 */
export const DUEL_SETUP_PHASE: string[] = ['hero', 'hero', 'gear', 'duelOptIn'];
