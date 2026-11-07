/**
 * DAILY DEALS.
 *
 * Three offers per player per UTC day, each buyable once:
 *   - a named Rare card for coins,
 *   - a named Epic card for gems,
 *   - one of the shop's packs at a discount.
 *
 * The lineup is a pure function of (userId, day), so the server never has to
 * store it - only which slots were bought. It also means nobody can reroll
 * their deals by asking again, switching hero, or opening a second tab.
 *
 * A named card is the point: packs are a gamble, a deal is "this one, today".
 * That is why a deal card costs a little more per pull than the pack that
 * could give it, but a lot less than chasing it.
 */
import { GEAR } from './gear.js';
import { PACKS } from './economy.js';
import type { Currency, Pack } from './economy.js';
import { hash32, mulberry32 } from './rng.js';
import type { Gear, Rarity } from './types.js';

export type DealKind = 'gear' | 'pack';

export type Deal = {
  /** The slot index as a string: what a purchase names. */
  id: string;
  kind: DealKind;
  /** Gear deals: the card. Pack deals: the pack. */
  itemId: string;
  cur: Currency;
  price: number;
  /** What it would cost outside the deal, for the struck-through label. Gear
   *  has no shelf price, so its is the pack that guarantees its rarity. */
  was: number;
  /** Whole percent off `was`, worked out from the two prices. */
  pctOff: number;
};

/** Card deals: the price for a named card of each rarity. */
export const GEAR_DEAL_PRICE: Partial<
  Record<Rarity, { cur: Currency; price: number; was: number }>
> = {
  // A Bronze pack (450) guarantees Rare-or-better, but not WHICH rare.
  Rare: { cur: 'coins', price: 300, was: 450 },
  // A Silver pack (100 gems) guarantees Epic-or-better, but not which epic.
  Epic: { cur: 'gems', price: 80, was: 100 },
};

/** Pack deals take this much off, rounded so the price stays a whole number. */
export const PACK_DEAL_PCT_OFF = 40;

export const DEAL_COUNT = 3;

const pctOff = (price: number, was: number): number =>
  was > 0 ? Math.max(0, Math.round(((was - price) / was) * 100)) : 0;

/** Deals only sell base pieces - a variant is its own reward elsewhere. */
const baseOfRarity = (r: Rarity): Gear[] =>
  GEAR.filter((g) => g.rarity === r && !g.variantOf);

const pick = <T>(list: readonly T[], rand: () => number): T | null =>
  list.length ? list[Math.floor(rand() * list.length)]! : null;

const gearDeal = (
  slot: number,
  r: Rarity,
  rand: () => number
): Deal | null => {
  const price = GEAR_DEAL_PRICE[r];
  const g = pick(baseOfRarity(r), rand);
  if (!price || !g) return null;
  return {
    id: String(slot),
    kind: 'gear',
    itemId: g.id,
    cur: price.cur,
    price: price.price,
    was: price.was,
    pctOff: pctOff(price.price, price.was),
  };
};

const packDeal = (slot: number, pack: Pack): Deal => {
  const price = Math.max(
    1,
    Math.round((pack.price * (100 - PACK_DEAL_PCT_OFF)) / 100)
  );
  return {
    id: String(slot),
    kind: 'pack',
    itemId: pack.id,
    cur: pack.cur,
    price,
    was: pack.price,
    pctOff: pctOff(price, pack.price),
  };
};

/** The seed a player's day of deals is drawn from. */
export const dealSeed = (userId: string, dayKey: string): number =>
  hash32('deals:' + userId + ':' + dayKey);

/** Today's lineup for one player. Same inputs, same deals - always. */
export const dailyDeals = (userId: string, dayKey: string): Deal[] => {
  const rand = mulberry32(dealSeed(userId, dayKey));
  const out: Deal[] = [];
  const rare = gearDeal(out.length, 'Rare', rand);
  if (rare) out.push(rare);
  const epic = gearDeal(out.length, 'Epic', rand);
  if (epic) out.push(epic);
  const pack = pick(PACKS, rand);
  if (pack) out.push(packDeal(out.length, pack));
  return out;
};

export const dealById = (deals: Deal[], id: string): Deal | null =>
  deals.find((d) => d.id === id) ?? null;
