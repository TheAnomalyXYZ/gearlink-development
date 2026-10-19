/**
 * GEAR LEVELS.
 *
 * A duplicate pull is no longer turned into coins - it stacks on the card, and
 * the spare copies are what levels it up. Every level costs copies AND coins,
 * and both climb with the level, so the first few levels come quickly and the
 * last few are a long-term goal. A level makes the piece hit harder (bigger
 * power), never changes what it does.
 *
 * One copy is always kept: the card itself. Only the copies past it are spare.
 * All numbers are starting values to tune in playtests.
 */
import type { Gear, Rarity } from './types.js';

export const GEAR_MAX_LEVEL = 10;

/** Spare copies spent to go from level L to L+1, indexed by L - 1. */
export const UPGRADE_COPIES: readonly number[] = [1, 2, 3, 4, 5, 6, 8, 10, 12];

/** Coins for the first level-up, by rarity. Later levels multiply it. */
export const UPGRADE_COINS_BASE: Record<Rarity, number> = {
  Common: 40,
  Rare: 80,
  Epic: 160,
  Legendary: 320,
};

/** Coin multiplier to go from level L to L+1, indexed by L - 1. */
export const UPGRADE_COINS_MULT: readonly number[] = [
  1, 2, 3, 5, 7, 10, 14, 19, 25,
];

/** Each level past the first adds this much of the base power, in percent. */
export const POWER_PER_LEVEL_PCT = 10;

export type GearLevels = Record<string, number>;

export const clampGearLevel = (n: number): number =>
  Math.max(1, Math.min(GEAR_MAX_LEVEL, Math.floor(n) || 1));

/** A card's level out of a record that may be partial or junk. Unlisted is 1. */
export const gearLevelOf = (
  levels: GearLevels | null | undefined,
  id: string
): number => clampGearLevel(levels?.[id] ?? 1);

/** Copies past the one the card itself is. */
export const spareCopies = (owned: number): number =>
  Math.max(0, Math.floor(owned) - 1);

/** The power a piece fights with at a level. Integer maths, so the client and
 *  the server's replay always agree. */
export const leveledPower = (power: number, level: number): number =>
  Math.round(
    (power * (100 + POWER_PER_LEVEL_PCT * (clampGearLevel(level) - 1))) / 100
  );

/** The piece as it fights at a level: same card, bigger power. */
export const atLevel = (g: Gear, level: number): Gear =>
  level > 1 ? { ...g, power: leveledPower(g.power, level) } : g;

export type UpgradeCost = { copies: number; coins: number };

/** What the next level costs, or null when the piece is already maxed. */
export const upgradeCost = (
  rarity: Rarity,
  level: number
): UpgradeCost | null => {
  const L = clampGearLevel(level);
  if (L >= GEAR_MAX_LEVEL) return null;
  return {
    copies: UPGRADE_COPIES[L - 1]!,
    coins: UPGRADE_COINS_BASE[rarity] * UPGRADE_COINS_MULT[L - 1]!,
  };
};

export type UpgradeBlock = 'unowned' | 'maxed' | 'copies' | 'coins';

/** Why the next level cannot be bought right now, or null when it can. */
export const upgradeBlock = (
  rarity: Rarity,
  owned: number,
  level: number,
  coins: number
): UpgradeBlock | null => {
  if (owned <= 0) return 'unowned';
  const cost = upgradeCost(rarity, level);
  if (!cost) return 'maxed';
  if (spareCopies(owned) < cost.copies) return 'copies';
  if (coins < cost.coins) return 'coins';
  return null;
};
