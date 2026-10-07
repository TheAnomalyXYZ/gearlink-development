/**
 * THE WAR CHEST: one coin pool per subreddit, filled by its players.
 *
 * Coins donated are gone - this is a sink - but what they buy is shared: every
 * tier the chest passes raises the coins EVERY player in the subreddit earns
 * from battles, for the rest of the week. So a donation is a gift to the
 * community rather than to yourself, and the donors list says who gave it.
 *
 * The chest resets on the same Monday 00:00 UTC boundary as the duel league
 * and the weekly quests, so one week is one push.
 */

export type WarChestTier = {
  /** Coins the chest must hold for this tier to be live. */
  at: number;
  /** Extra battle coins while it is live, as a percentage of the base. */
  bonusPct: number;
};

/** Ascending. Tuned for a small subreddit: the first tier is a few players'
 *  spare coins, the last needs most of the community pulling together. */
export const WAR_CHEST_TIERS: WarChestTier[] = [
  { at: 5_000, bonusPct: 10 },
  { at: 20_000, bonusPct: 25 },
  { at: 60_000, bonusPct: 50 },
];

/** The quick-donate buttons. */
export const DONATION_AMOUNTS = [50, 250, 1000] as const;

/** Bounds on one donation, so a typo or a forged request cannot do anything
 *  silly to the chest. */
export const MIN_DONATION = 10;
export const MAX_DONATION = 100_000;

/** Lifetime coins given before the Patron flair unlocks. */
export const PATRON_DONATED = 1_000;

/** How many donors the chest names. */
export const WAR_CHEST_TOP = 5;

/** Whether `amount` is a donation the server will take. */
export const donationIsLegal = (amount: number): boolean =>
  Number.isInteger(amount) &&
  amount >= MIN_DONATION &&
  amount <= MAX_DONATION;

/** The highest tier a chest holding `total` has reached, or null for none. */
export const warChestTier = (total: number): WarChestTier | null => {
  let hit: WarChestTier | null = null;
  for (const t of WAR_CHEST_TIERS) if (total >= t.at) hit = t;
  return hit;
};

/** The next tier to fill, or null once the last one is passed. */
export const nextWarChestTier = (total: number): WarChestTier | null =>
  WAR_CHEST_TIERS.find((t) => total < t.at) ?? null;

/** The live battle-coin bonus for a chest holding `total`, in percent. */
export const warChestBonusPct = (total: number): number =>
  warChestTier(total)?.bonusPct ?? 0;

/** A battle's coins with the chest's bonus applied, rounded down. */
export const boostedCoins = (base: number, bonusPct: number): number =>
  Math.floor((Math.max(0, base) * (100 + Math.max(0, bonusPct))) / 100);
