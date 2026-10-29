/**
 * SHOP / PACKS / CURRENCY.
 *
 * Packs pay out GEAR CARDS, which is what makes a collection matter: the
 * loadout picker only offers gear you own, so "take the highest power" stops
 * being available until you have pulled it. Duplicates are not dead weight -
 * they stack on the card as spare copies, which is what levels it up (see
 * upgrade.ts).
 *
 * `rollPack` takes its randomness as an argument because the roll happens on
 * the server. A client-rolled pack is a client-chosen legendary.
 */
import { GEAR, RARITY_ORDER } from './gear.js';
import type { Gear, Rarity } from './types.js';

/** Real pack art from utils/package.ts, so the shop sells the game's own tiers. */
const PACK_ART = (n: string) => '/art/PocketKnights/Item/' + n + 'Pack_V2.png';
const PACK_GLOW = (n: string) =>
  '/art/PocketKnights/Packs/CardPack_' + n + '_glow_2x.png';

export const COIN_ICON = '/art/NeuraKnights/Item/Gold_V2.png';
export const GEM_ICON = '/art/PocketKnights/Item/Gem_V2.png';

export type Currency = 'coins' | 'gems';

export type Pack = {
  id: string;
  name: string;
  cards: number;
  cur: Currency;
  price: number;
  tint: string;
  floor: Rarity | null;
  img: string;
  glow: string;
  /** Percent weights, shown to players as-is - so nothing here may sit below
   *  `floor`, or the shop advertises a pull the pack can never give. */
  odds: [Rarity, number][];
  blurb: string;
};

export const PACKS: Pack[] = [
  {
    id: 'base',
    name: 'BASE PACK',
    cards: 1,
    cur: 'coins',
    price: 90,
    tint: '#9FB3D1',
    floor: null,
    img: PACK_ART('Base'),
    glow: PACK_GLOW('Base'),
    odds: [
      ['Common', 70],
      ['Rare', 25],
      ['Epic', 5],
    ],
    blurb: 'One gear card. Mostly commons, the odd rare.',
  },
  {
    id: 'bronze',
    name: 'BRONZE PACK',
    cards: 2,
    cur: 'coins',
    price: 450,
    tint: '#C8813E',
    floor: 'Rare',
    img: PACK_ART('Bronze'),
    glow: PACK_GLOW('Bronze'),
    odds: [
      ['Rare', 87],
      ['Epic', 12],
      ['Legendary', 1],
    ],
    blurb: 'Two gear cards, each guaranteed rare or better.',
  },
  {
    id: 'silver',
    name: 'SILVER PACK',
    cards: 2,
    cur: 'gems',
    price: 100,
    tint: '#C9D4E8',
    floor: 'Epic',
    img: PACK_ART('Silver'),
    glow: PACK_GLOW('Silver'),
    odds: [
      ['Epic', 97],
      ['Legendary', 3],
    ],
    blurb: 'Two gear cards, each guaranteed epic or better.',
  },
  {
    id: 'gold',
    name: 'GOLD PACK',
    cards: 3,
    cur: 'gems',
    price: 150,
    tint: '#F4B740',
    floor: 'Epic',
    img: PACK_ART('Gold'),
    glow: PACK_GLOW('Gold'),
    odds: [
      ['Epic', 85],
      ['Legendary', 15],
    ],
    blurb: 'Three gear cards, epic floor and the best legendary odds.',
  },
];

export const packById = (id: string): Pack | null =>
  PACKS.find((p) => p.id === id) ?? null;

/** Soft currency is bought with hard currency. Hard currency is bought with
 *  Reddit Gold through Devvit payments - see `payments` in devvit.json and the
 *  fulfilment route that credits the account. */
export type Bundle = {
  id: string;
  amount: number;
  tint: string;
  /** Coin bundles only: the gem price paid for them. */
  gems?: number;
  /** Gem bundles only: the Devvit product that sells them. */
  sku?: string;
  /** Gem bundles only: the product's price in Reddit Gold. Must stay in step
   *  with the `payments.products` entry in devvit.json - the server reads the
   *  SKU off the fulfilled order and grants what this table says. */
  gold?: number;
};

export const COIN_BUNDLES: Bundle[] = [
  { id: 'c1', amount: 300, gems: 12, tint: '#9FB3D1' },
  { id: 'c2', amount: 950, gems: 32, tint: '#4F92F0' },
  { id: 'c3', amount: 2200, gems: 65, tint: '#A46BE8' },
  { id: 'c4', amount: 6000, gems: 150, tint: '#F4B740' },
];
export const GEM_BUNDLES: Bundle[] = [
  { id: 'g1', amount: 40, sku: 'gems_40', gold: 25, tint: '#9FB3D1' },
  {
    id: 'g2',
    amount: 220,
    sku: 'gems_220',
    gold: 100,
    tint: '#4F92F0',
  },
  {
    id: 'g3',
    amount: 600,
    sku: 'gems_500',
    gold: 250,
    tint: '#A46BE8',
  },
  {
    id: 'g4',
    amount: 1300,
    sku: 'gems_1300',
    gold: 500,
    tint: '#F4B740',
  },
];

/** The SKU is what a fulfilled order carries, so grants are looked up by it
 *  rather than by the client telling the server which bundle it bought. */
export const gemsForSku = (sku: string): number | null =>
  GEM_BUNDLES.find((b) => b.sku === sku)?.amount ?? null;
export const bundleById = (list: Bundle[], id: string): Bundle | null =>
  list.find((b) => b.id === id) ?? null;

const bundlePrice = (b: Bundle): number => b.gems ?? b.gold ?? 0;

/** How much more a bundle gives per unit spent than the first (smallest) one
 *  in its list, in whole percent, rounded down so the shop never overstates
 *  it. Worked out from the numbers rather than stored, so a retuned amount or
 *  price cannot leave a stale label behind. Integer maths: 6000 coins for 150
 *  gems must read +60, not +59. */
export const bundleBonusPct = (list: Bundle[], b: Bundle): number => {
  const base = list[0];
  if (!base) return 0;
  const num = b.amount * bundlePrice(base) * 100;
  const den = bundlePrice(b) * base.amount;
  return den > 0 ? Math.max(0, Math.floor(num / den) - 100) : 0;
};

const rollRarity = (odds: [Rarity, number][], rand: () => number): Rarity => {
  let total = 0;
  for (const [, w] of odds) total += w;
  let roll = rand() * total;
  for (const [r, w] of odds) {
    roll -= w;
    if (roll < 0) return r;
  }
  return odds[odds.length - 1]![0];
};

const gearOfRarity = (r: Rarity): Gear[] => GEAR.filter((g) => g.rarity === r);

/** One card. `atLeast` enforces a pack's floor by re-rolling the tier upward. */
export const rollCard = (
  odds: [Rarity, number][],
  atLeast: Rarity | null,
  rand: () => number
): Gear => {
  let r = rollRarity(odds, rand);
  if (atLeast && RARITY_ORDER.indexOf(r) < RARITY_ORDER.indexOf(atLeast))
    r = atLeast;
  let pool = gearOfRarity(r);
  // Legendary only exists on a few weapons, so a tier with no cards steps down.
  while (!pool.length && RARITY_ORDER.indexOf(r) > 0) {
    r = RARITY_ORDER[RARITY_ORDER.indexOf(r) - 1]!;
    pool = gearOfRarity(r);
  }
  return pool[Math.floor(rand() * pool.length)]!;
};

/** `owned` is the copies held once this card lands, so a duplicate can show
 *  how far it moved the stack. */
export type PulledCard = { id: string; isNew: boolean; owned: number };

/** Roll a whole pack against a wallet snapshot, deciding new-vs-duplicate as it
 *  goes so two copies in one pack cannot both read as new. */
export const rollPack = (
  pack: Pack,
  owned: Record<string, number>,
  rand: () => number
): PulledCard[] => {
  const cards: PulledCard[] = [];
  for (let i = 0; i < pack.cards; i++) {
    const g = rollCard(pack.odds, pack.floor, rand);
    const already =
      (owned[g.id] ?? 0) + cards.filter((c) => c.id === g.id).length;
    cards.push({ id: g.id, isNew: already === 0, owned: already + 1 });
  }
  return cards;
};
