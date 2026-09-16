/**
 * SHOP / PACKS / CURRENCY.
 *
 * Packs pay out GEAR CARDS, which is what makes a collection matter: the
 * loadout picker only offers gear you own, so "take the highest power" stops
 * being available until you have pulled it. Duplicates are not dead weight -
 * they refund coins by rarity.
 *
 * `rollPack` takes its randomness as an argument because the roll happens on
 * the server. A client-rolled pack is a client-chosen legendary.
 */
import { GEAR, RARITY_ORDER } from './gear.js';
import type { Gear, Rarity } from './types.js';

export const DUPE_COINS: Record<Rarity, number> = {
  Common: 25,
  Rare: 60,
  Epic: 150,
  Legendary: 400,
};

/** Real pack art from utils/package.ts, so the shop sells the game's own tiers. */
const PACK_ART = (n: string) =>
  '/art/PocketKnights/Item/' + n + 'Pack_V2.png';
const PACK_GLOW = (n: string) =>
  '/art/PocketKnights/Packs/CardPack_' +
  n +
  '_glow_2x.png';

export const COIN_ICON =
  '/art/NeuraKnights/Item/Gold_V2.png';
export const GEM_ICON =
  '/art/PocketKnights/Item/Gem_V2.png';

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
    blurb: 'One card. Mostly commons, the odd rare.',
  },
  {
    id: 'bronze',
    name: 'BRONZE PACK',
    cards: 1,
    cur: 'coins',
    price: 220,
    tint: '#C8813E',
    floor: 'Rare',
    img: PACK_ART('Bronze'),
    glow: PACK_GLOW('Bronze'),
    odds: [
      ['Common', 45],
      ['Rare', 40],
      ['Epic', 13],
      ['Legendary', 2],
    ],
    blurb: 'One card, guaranteed rare or better.',
  },
  {
    id: 'silver',
    name: 'SILVER PACK',
    cards: 1,
    cur: 'coins',
    price: 500,
    tint: '#C9D4E8',
    floor: 'Epic',
    img: PACK_ART('Silver'),
    glow: PACK_GLOW('Silver'),
    odds: [
      ['Common', 25],
      ['Rare', 45],
      ['Epic', 27],
      ['Legendary', 3],
    ],
    blurb: 'One card, guaranteed epic or better.',
  },
  {
    id: 'gold',
    name: 'GOLD PACK',
    cards: 1,
    cur: 'gems',
    price: 15,
    tint: '#F4B740',
    floor: 'Epic',
    img: PACK_ART('Gold'),
    glow: PACK_GLOW('Gold'),
    odds: [
      ['Common', 10],
      ['Rare', 40],
      ['Epic', 42],
      ['Legendary', 8],
    ],
    blurb: 'One card, epic floor and the best legendary odds.',
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
  bonus: number;
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
  { id: 'c1', amount: 300, gems: 12, bonus: 0, tint: '#9FB3D1' },
  { id: 'c2', amount: 950, gems: 32, bonus: 18, tint: '#4F92F0' },
  { id: 'c3', amount: 2200, gems: 65, bonus: 35, tint: '#A46BE8' },
  { id: 'c4', amount: 6000, gems: 150, bonus: 60, tint: '#F4B740' },
];
export const GEM_BUNDLES: Bundle[] = [
  { id: 'g1', amount: 40, sku: 'gems_40', gold: 25, bonus: 0, tint: '#9FB3D1' },
  {
    id: 'g2',
    amount: 220,
    sku: 'gems_220',
    gold: 100,
    bonus: 10,
    tint: '#4F92F0',
  },
  {
    id: 'g3',
    amount: 500,
    sku: 'gems_500',
    gold: 250,
    bonus: 25,
    tint: '#A46BE8',
  },
  {
    id: 'g4',
    amount: 1300,
    sku: 'gems_1300',
    gold: 500,
    bonus: 40,
    tint: '#F4B740',
  },
];

/** The SKU is what a fulfilled order carries, so grants are looked up by it
 *  rather than by the client telling the server which bundle it bought. */
export const gemsForSku = (sku: string): number | null =>
  GEM_BUNDLES.find((b) => b.sku === sku)?.amount ?? null;
export const bundleById = (list: Bundle[], id: string): Bundle | null =>
  list.find((b) => b.id === id) ?? null;

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

export type PulledCard = { id: string; isNew: boolean; refund: number };

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
    cards.push({
      id: g.id,
      isNew: already === 0,
      refund: already === 0 ? 0 : (DUPE_COINS[g.rarity] ?? 25),
    });
  }
  return cards;
};
