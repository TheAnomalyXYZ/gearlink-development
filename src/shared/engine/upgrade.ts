/**
 * GEAR LEVELS AND TIERS.
 *
 * A duplicate pull is no longer turned into coins - it stacks on the card, and
 * the spare copies are what levels it up. Every level costs copies AND coins,
 * and both climb with the level, so the first few levels come quickly and the
 * last few are a long-term goal. A level makes the piece hit harder (bigger
 * power), never changes what it does.
 *
 * Levels run through three tiers: Bronze 1-10, then a promotion to Silver
 * 1-10, then a promotion to Gold, which keeps levelling almost without end.
 * The profile stores ONE integer per card (1-10 Bronze, 11-20 Silver, 21+
 * Gold), so a tier is read off the level rather than stored beside it, and the
 * server's level checks and the replay need no second field.
 *
 * One copy is always kept: the card itself. Only the copies past it are spare.
 * All numbers are starting values to tune in playtests.
 */
import type { Gear, Rarity } from './types.js';

export type GearTier = 'Bronze' | 'Silver' | 'Gold';
export const GEAR_TIERS: readonly GearTier[] = ['Bronze', 'Silver', 'Gold'];

/** Levels in Bronze and in Silver. Topping one out unlocks the promotion. */
export const TIER_LEVELS = 10;

/** Gold's own level cap: "almost infinite", the copy and coin curve is what
 *  really stops a player. */
export const GOLD_MAX_LEVEL = 99;

export const GEAR_MAX_LEVEL = TIER_LEVELS * 2 + GOLD_MAX_LEVEL;

export const TIER_COLOR: Record<GearTier, string> = {
  Bronze: '#C8813E',
  Silver: '#C9D4E8',
  Gold: '#FFCF4A',
};

/** Spare copies spent to go from level L to L+1 inside Bronze or Silver,
 *  indexed by the level within the tier - 1. Rarer tiers ask for fewer: a
 *  specific epic or legendary drops far less often than a specific common, so
 *  one copy curve for all of them put the top levels of the best gear out of
 *  reach. */
export const UPGRADE_COPIES: Record<Rarity, readonly number[]> = {
  Common: [1, 2, 3, 4, 5, 6, 8, 10, 12],
  Rare: [1, 2, 3, 3, 4, 5, 6, 7, 8],
  Epic: [1, 1, 2, 2, 3, 3, 4, 5, 6],
  Legendary: [1, 1, 1, 2, 2, 2, 3, 3, 4],
};

/** Copies to promote Bronze 10 -> Silver, then Silver 10 -> Gold. */
export const PROMOTE_COPIES: Record<Rarity, readonly [number, number]> = {
  Common: [15, 30],
  Rare: [10, 20],
  Epic: [8, 15],
  Legendary: [5, 10],
};

/** Coins for the first level-up, by rarity. Later levels multiply it. */
export const UPGRADE_COINS_BASE: Record<Rarity, number> = {
  Common: 40,
  Rare: 80,
  Epic: 160,
  Legendary: 320,
};

/** Coin multiplier to go from level L to L+1 within a tier, indexed by the
 *  level within the tier - 1. */
export const UPGRADE_COINS_MULT: readonly number[] = [
  1, 2, 3, 5, 7, 10, 14, 19, 25,
];

/** Silver levels cost this many times the Bronze one at the same step. */
export const SILVER_COINS_X = 3;

/** Coin multiplier for each promotion: into Silver, into Gold. */
export const PROMOTE_COINS_MULT: readonly [number, number] = [40, 120];

/** Gold level G -> G+1: coins are the base times (start + step * (G-1)), and
 *  copies are the rarity's top Bronze step plus one more every ten levels. */
export const GOLD_COINS_START = 80;
export const GOLD_COINS_STEP = 10;
export const GOLD_COPIES_EVERY = 10;

/** Power each level adds, in percent of the base, by the tier it lands in.
 *  Gold is shallow on purpose: its levels never end, its power must stay
 *  sane. The promotion step itself adds PROMOTE_POWER_PCT instead. Bronze
 *  numbers are unchanged from before tiers, so existing levels keep their
 *  power. */
export const POWER_PER_LEVEL_PCT = 10;
export const GOLD_POWER_PER_LEVEL_PCT = 2;
export const PROMOTE_POWER_PCT = 25;

export type GearLevels = Record<string, number>;

export const clampGearLevel = (n: number): number =>
  Math.max(1, Math.min(GEAR_MAX_LEVEL, Math.floor(n) || 1));

/** A card's level out of a record that may be partial or junk. Unlisted is 1. */
export const gearLevelOf = (
  levels: GearLevels | null | undefined,
  id: string
): number => clampGearLevel(levels?.[id] ?? 1);

/** The level a tier starts at: Bronze 1, Silver 11, Gold 21. */
export const tierStartLevel = (tier: GearTier): number =>
  GEAR_TIERS.indexOf(tier) * TIER_LEVELS + 1;

/** A card's level once a pull of the given tier lands on it. A card new to
 *  the collection arrives at the tier's level 1; a duplicate is a spare copy
 *  and nothing more, so a gem pack never skips the climb of a card already
 *  being levelled. */
export const levelAfterPull = (
  level: number,
  tier: GearTier,
  isNew: boolean
): number =>
  isNew
    ? Math.max(clampGearLevel(level), tierStartLevel(tier))
    : clampGearLevel(level);

/** The tier a level sits in. */
export const gearTierOf = (level: number): GearTier =>
  GEAR_TIERS[
    Math.min(2, Math.floor((clampGearLevel(level) - 1) / TIER_LEVELS))
  ]!;

/** The level as the player reads it: 1-10 in Bronze and Silver, 1-99 in Gold. */
export const tierLevelOf = (level: number): number => {
  const L = clampGearLevel(level);
  return L - GEAR_TIERS.indexOf(gearTierOf(L)) * TIER_LEVELS;
};

/** The tier's own cap, as the player reads it. */
export const tierMaxOf = (tier: GearTier): number =>
  tier === 'Gold' ? GOLD_MAX_LEVEL : TIER_LEVELS;

/** "SILVER LV 4" - short enough for a badge. */
export const levelLabel = (level: number): string =>
  gearTierOf(level).toUpperCase() + ' LV ' + tierLevelOf(level);

/** True when the next step out of this level is a promotion, not a level. */
export const isPromotion = (level: number): boolean => {
  const L = clampGearLevel(level);
  return gearTierOf(L) !== 'Gold' && tierLevelOf(L) === TIER_LEVELS;
};

/** Total power bonus at a level, in percent of the base. */
export const levelPowerPct = (level: number): number => {
  const L = clampGearLevel(level);
  let pct = 0;
  for (let at = 2; at <= L; at++) {
    if (gearTierOf(at) !== gearTierOf(at - 1)) pct += PROMOTE_POWER_PCT;
    else if (gearTierOf(at) === 'Gold') pct += GOLD_POWER_PER_LEVEL_PCT;
    else pct += POWER_PER_LEVEL_PCT;
  }
  return pct;
};

/** Copies past the one the card itself is. */
export const spareCopies = (owned: number): number =>
  Math.max(0, Math.floor(owned) - 1);

/** The power a piece fights with at a level. Integer maths, so the client and
 *  the server's replay always agree. */
export const leveledPower = (power: number, level: number): number =>
  Math.round((power * (100 + levelPowerPct(level))) / 100);

/** The piece as it fights at a level: same card, bigger power. */
export const atLevel = (g: Gear, level: number): Gear =>
  level > 1 ? { ...g, power: leveledPower(g.power, level) } : g;

export type UpgradeCost = { copies: number; coins: number };

/** What the next level (or promotion) costs, or null when the piece is
 *  already maxed. */
export const upgradeCost = (
  rarity: Rarity,
  level: number
): UpgradeCost | null => {
  const L = clampGearLevel(level);
  if (L >= GEAR_MAX_LEVEL) return null;
  const tier = gearTierOf(L);
  const step = tierLevelOf(L);
  const base = UPGRADE_COINS_BASE[rarity];
  if (tier === 'Gold') {
    const top = UPGRADE_COPIES[rarity][TIER_LEVELS - 2]!;
    return {
      copies: top + Math.floor((step - 1) / GOLD_COPIES_EVERY),
      coins: base * (GOLD_COINS_START + GOLD_COINS_STEP * (step - 1)),
    };
  }
  const t = tier === 'Bronze' ? 0 : 1;
  if (step === TIER_LEVELS)
    return {
      copies: PROMOTE_COPIES[rarity][t],
      coins: base * PROMOTE_COINS_MULT[t],
    };
  return {
    copies: UPGRADE_COPIES[rarity][step - 1]!,
    coins: base * UPGRADE_COINS_MULT[step - 1]! * (t ? SILVER_COINS_X : 1),
  };
};

/**
 * SHARDS. A spare copy of a card nobody will level - another hero's, a heal
 * piece that never gets equipped - can be salvaged into shards of its rarity,
 * and a shard stands in for a missing copy on ANY card of that rarity. Two
 * copies make one shard, so a matching duplicate is still worth more than a
 * stray one, but no pull is wasted.
 */
export const SALVAGE_COPIES_PER_SHARD = 2;

export type Shards = Record<Rarity, number>;

export const NO_SHARDS: Shards = { Common: 0, Rare: 0, Epic: 0, Legendary: 0 };

/** True when a card has the spare copies to salvage into one shard. */
export const canSalvage = (owned: number): boolean =>
  spareCopies(owned) >= SALVAGE_COPIES_PER_SHARD;

/** How a level's copies are paid: the card's own spare copies first, shards
 *  of its rarity for the rest. */
export const upgradeSpend = (
  cost: UpgradeCost,
  owned: number
): { copies: number; shards: number } => {
  const copies = Math.min(spareCopies(owned), cost.copies);
  return { copies, shards: cost.copies - copies };
};

export type UpgradeBlock = 'unowned' | 'maxed' | 'copies' | 'coins';

/** Why the next level cannot be bought right now, or null when it can.
 *  `shards` are the player's shards of this card's rarity. */
export const upgradeBlock = (
  rarity: Rarity,
  owned: number,
  level: number,
  coins: number,
  shards = 0
): UpgradeBlock | null => {
  if (owned <= 0) return 'unowned';
  const cost = upgradeCost(rarity, level);
  if (!cost) return 'maxed';
  if (spareCopies(owned) + Math.max(0, shards) < cost.copies) return 'copies';
  if (coins < cost.coins) return 'coins';
  return null;
};
