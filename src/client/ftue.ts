/**
 * First-run coaching: seven steps, in order, seen once per ACCOUNT.
 *
 * It comes in two halves. A new player is dropped straight into a tutorial
 * fight that teaches the board (FTUE_FIGHT); only once that is done does the
 * map, the hero and the gear get explained (FTUE_BUILD), on the way into the
 * second fight.
 *
 * The pre-battle steps are completed by DOING the thing, so they never block
 * input and advance off the phase change rather than a Next button. Only `drag`
 * is interactive inside the arena: the scrim lifts, a sample link glows, and
 * the guide waits for the player to draw it for real.
 */

export type FtueStep =
  'fight' | 'location' | 'hero' | 'gear' | 'orbs' | 'drag' | 'damage' | 'waves';

export const FTUE_FIGHT: FtueStep[] = ['orbs', 'drag', 'damage', 'waves'];
export const FTUE_BUILD: FtueStep[] = ['location', 'hero', 'gear'];
export const FTUE_ORDER: FtueStep[] = [...FTUE_FIGHT, ...FTUE_BUILD];

/** The steps of whichever half `step` is in, for the progress dots. */
export const ftueHalf = (step: FtueStep | null): FtueStep[] =>
  step !== null && FTUE_BUILD.indexOf(step) >= 0 ? FTUE_BUILD : FTUE_FIGHT;

/** Which phase each pre-battle step belongs to, so back-navigation re-points
 *  the card instead of stranding it on a screen that is no longer showing. */
export const FTUE_PHASE_STEP: Record<string, FtueStep> = {
  // Home IS the map, so the first thing taught is which location to take.
  home: 'location',
  hero: 'hero',
  gear: 'gear',
};

/** Steps the player completes by acting. These never raise a scrim. */
export const FTUE_DOING: Record<string, boolean> = {
  location: true,
  hero: true,
  gear: true,
  drag: true,
};

export const FTUE_TARGET: Record<
  string,
  { target: string; place: 'above' | 'below' }
> = {
  location: { target: 'map', place: 'below' },
  hero: { target: 'hero', place: 'below' },
  gear: { target: 'slots', place: 'above' },
  orbs: { target: 'board', place: 'above' },
  drag: { target: 'board', place: 'above' },
  damage: { target: 'enemyHp', place: 'above' },
  waves: { target: 'track', place: 'below' },
};

export const FTUE_COPY: Record<string, { title: string; body: string }> = {
  location: {
    title: 'Choose where to fight',
    body: 'That fight was one place on this map. Each one is a battle of 3 to 5 waves, and the last wave is the elite guarding it - take one and the road opens to the next. Tap a place to go.',
  },
  hero: {
    title: 'Pick your hero',
    body: "Your hero's perk lasts the whole run - stronger attack links, stronger block, or stronger heals. Tap one, then continue.",
  },
  gear: {
    title: 'Equip five pieces',
    body: 'Tap gear below to fill these five slots - max 2 per type. Each piece becomes one orb colour on the board, like the ones you just linked.',
  },
  orbs: {
    title: 'Welcome to the fight!',
    body: 'Your hero carries five pieces of gear, and each one is an orb colour on this board. The colour tells you what a link of it does:',
  },
  drag: {
    title: 'Drag to link',
    body: 'Press an orb and drag through 3 or more of the SAME colour (any direction, diagonals count), then let go. Try it now on the glowing red orbs - red is attack.',
  },
  damage: { title: 'Nice hit!', body: '' },
  waves: {
    title: 'Clear the location',
    body: 'The bar fills one notch per move; when it reaches the red notch the enemy swings, so block or heal before it does. Kill it and the next wave walks in. The last wave is the elite that guards this place - put it down and the location is yours.',
  },
};

/** The inline post's battle has no notch bar: the enemy's next move is
 *  spelled out beside it instead, so the waves step says so. */
export const FTUE_POST_COPY: Record<string, { title: string; body: string }> = {
  waves: {
    title: 'Clear the location',
    body: 'Beside the enemy is what it does next and in how many turns - when it is about to hit, block or heal before it does. Kill it and the next wave walks in. The last wave is the elite that guards this place - put it down and the location is yours.',
  },
};

export const FTUE_LEGEND: Record<string, { label: string; blurb: string }> = {
  attack: { label: 'ATK', blurb: 'Damages the enemy' },
  block: { label: 'BLK', blurb: "Soaks the enemy's next hit" },
  effect: { label: 'HEAL', blurb: 'Restores your HP' },
};

export const FTUE_ARROW_GAP = 6;

/** The board walk lives with the engine, which deals the tutorial's seed. */
export { findAttackLink } from '../shared/engine/index.js';

/**
 * Which phase each duel SETUP step belongs to. The setup card is an overlay on
 * the screen that step is about, so it never floats over a screen the player
 * cannot act on - and the step only appears once its own phase is showing.
 */
export const DUEL_SETUP_PHASE: string[] = ['hero', 'hero', 'gear', 'duelOptIn'];
