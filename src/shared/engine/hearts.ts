/**
 * Heart containers: the one stat the player upgrades permanently.
 *
 * Lifted from Neura Knights' shape - PIECES drop, three of them make a
 * CONTAINER, and a container is applied to ONE hero class. The pieces are a
 * shared pool, so a drop is never wasted on a class you were not going to
 * play; the containers are per class, so building a hero up is a decision
 * rather than an account-wide tick.
 *
 * HP still does not come back between waves. A bigger pool is exactly what
 * makes the deeper locations survivable, which is the point of upgrading it.
 */
import { PLAYER_HP } from './constants.js';
import { HERO_CLASSES } from './gear.js';
import type { HeroClass } from './types.js';

/** Three pieces make one container, as in Neura Knights. */
export const HEART_PIECES_PER_CONTAINER = 3;
/** GearLink's pool is 40, not 500, so a container is +4 rather than +50. */
export const HP_PER_HEART_CONTAINER = 4;
/** Ten containers doubles the pool, and that is where it stops. */
export const MAX_HEART_CONTAINERS = 10;

export type Hearts = Record<HeroClass, number>;

export const NO_HEARTS: Hearts = { Hero: 0, Archer: 0, Mage: 0 };

export const clampContainers = (n: number): number =>
  Math.max(0, Math.min(MAX_HEART_CONTAINERS, Math.floor(n) || 0));

/** Read one class's containers out of a record that may be partial or junk. */
export const heartsFor = (
  hearts: Partial<Hearts> | undefined,
  cls: HeroClass
): number => clampContainers(hearts?.[cls] ?? 0);

export const normaliseHearts = (raw: Partial<Hearts> | undefined): Hearts => {
  const out = { ...NO_HEARTS };
  for (const cls of HERO_CLASSES) out[cls] = heartsFor(raw, cls);
  return out;
};

/** The pool a hero fights with. The engine takes the CONTAINER count, not this
 *  figure, so a tampered max HP cannot be submitted. */
export const maxHpFor = (containers: number): number =>
  PLAYER_HP + clampContainers(containers) * HP_PER_HEART_CONTAINER;

/**
 * What a location's boss drops, by how deep it is. Deeper bosses are worth
 * more, so the pieces keep coming as the containers get harder to fill.
 */
export const heartPiecesForBoss = (locIndex: number): number =>
  1 + Math.floor(Math.max(0, locIndex) / 2);

/** No dedicated heart art ships yet, so the health potion stands in - it is
 *  the one icon in the bundle that already reads as "this restores you". */
export const HEART_PIECE_ICON =
  '/art/PocketKnights/Item/RegularHealthPotion_v1.png';

/** Whether `pieces` can be spent on another container for this class. */
export const canApplyHeart = (pieces: number, containers: number): boolean =>
  pieces >= HEART_PIECES_PER_CONTAINER &&
  clampContainers(containers) < MAX_HEART_CONTAINERS;
