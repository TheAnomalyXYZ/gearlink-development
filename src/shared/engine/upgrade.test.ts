import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEAR_BY_ID,
  RARITY_ORDER,
  defaultLoadout,
  resolveLoadout,
} from './gear.js';
import { rollCard, rollPack, packById } from './economy.js';
import { mulberry32 } from './rng.js';
import { Run } from './run.js';
import { verifyRun } from './replay.js';
import {
  GEAR_MAX_LEVEL,
  TIER_LEVELS,
  UPGRADE_COINS_BASE,
  UPGRADE_COPIES,
  gearLevelOf,
  gearTierOf,
  isPromotion,
  levelAfterPull,
  levelLabel,
  leveledPower,
  spareCopies,
  tierLevelOf,
  SALVAGE_COPIES_PER_SHARD,
  canSalvage,
  upgradeBlock,
  upgradeCost,
  upgradeSpend,
} from './upgrade.js';
import type { Rarity } from './types.js';

void test('every level-up costs more than the last within a tier', () => {
  for (const start of [1, TIER_LEVELS + 1, TIER_LEVELS * 2 + 1]) {
    let prev = { copies: 0, coins: 0 };
    const end =
      start > TIER_LEVELS * 2 ? GEAR_MAX_LEVEL - 1 : start + TIER_LEVELS - 2;
    for (let L = start; L <= end; L++) {
      const c = upgradeCost('Rare', L)!;
      assert.ok(c.copies >= prev.copies, 'copies at ' + L);
      assert.ok(c.coins > prev.coins, 'coins at ' + L);
      prev = c;
    }
  }
  assert.equal(upgradeCost('Rare', GEAR_MAX_LEVEL), null);
  assert.equal(upgradeCost('Common', 1)!.coins, UPGRADE_COINS_BASE.Common);
  assert.ok(
    upgradeCost('Legendary', 1)!.coins > upgradeCost('Common', 1)!.coins
  );
});

void test('the card itself is never a spare copy', () => {
  assert.equal(spareCopies(0), 0);
  assert.equal(spareCopies(1), 0);
  assert.equal(spareCopies(4), 3);
});

void test('upgradeBlock names what is missing', () => {
  const c = upgradeCost('Common', 1)!;
  assert.equal(upgradeBlock('Common', 0, 1, 9999), 'unowned');
  assert.equal(upgradeBlock('Common', 1, 1, 9999), 'copies');
  assert.equal(upgradeBlock('Common', 1 + c.copies, 1, c.coins - 1), 'coins');
  assert.equal(upgradeBlock('Common', 1 + c.copies, 1, c.coins), null);
  assert.equal(upgradeBlock('Common', 99, GEAR_MAX_LEVEL, 9999), 'maxed');
});

void test('levels raise power and junk levels read as 1', () => {
  assert.equal(leveledPower(10, 1), 10);
  assert.equal(leveledPower(10, 2), 11);
  assert.ok(leveledPower(10, GEAR_MAX_LEVEL) > leveledPower(10, 5));
  // Bronze is unchanged from before tiers, so stored levels keep their power.
  assert.equal(leveledPower(10, TIER_LEVELS), 19);
  assert.equal(gearLevelOf(undefined, 'x'), 1);
  assert.equal(gearLevelOf({ x: 9999 }, 'x'), GEAR_MAX_LEVEL);
  const picked = defaultLoadout('Hero');
  const base = resolveLoadout(picked);
  const up = resolveLoadout(picked, [3, 1, 1, 1, 1]);
  assert.equal(up[0]!.power, leveledPower(base[0]!.power, 3));
  assert.equal(up[1]!.power, base[1]!.power);
  assert.equal(GEAR_BY_ID[picked[0]!]!.power, base[0]!.power);
});

void test('a duplicate pull stacks instead of refunding', () => {
  const pack = packById('base')!;
  const [first] = rollPack(pack, {}, () => 0);
  const [again] = rollPack(pack, { [first!.id]: 2 }, () => 0);
  const base = { tier: 'Bronze' };
  assert.deepEqual(first, { id: first!.id, isNew: true, owned: 1, ...base });
  assert.deepEqual(again, { id: first!.id, isNew: false, owned: 3, ...base });
});

void test('the replay fights at the submitted levels and rejects bad ones', () => {
  const picked = defaultLoadout('Hero');
  const levels = [5, 5, 5, 5, 5];
  const run = new Run({ seed: 7, heroClass: 'Hero', picked, levels });
  assert.equal(
    run.loadout[0]!.power,
    leveledPower(GEAR_BY_ID[picked[0]!]!.power, 5)
  );
  const ok = verifyRun({
    seed: 7,
    heroClass: 'Hero',
    picked,
    moves: [],
    levels,
  });
  assert.ok(ok.ok);
  const bad = verifyRun({
    seed: 7,
    heroClass: 'Hero',
    picked,
    moves: [],
    levels: [GEAR_MAX_LEVEL + 1, 1, 1, 1, 1],
  });
  assert.deepEqual(bad, { ok: false, reason: 'bad gear levels' });
});

void test('rarer gear never needs more copies to max than commoner gear', () => {
  const total = (r: Rarity) => UPGRADE_COPIES[r].reduce((n, c) => n + c, 0);
  for (const r of RARITY_ORDER)
    assert.equal(UPGRADE_COPIES[r].length, TIER_LEVELS - 1, r);
  for (let i = 1; i < RARITY_ORDER.length; i++)
    assert.ok(
      total(RARITY_ORDER[i]!) <= total(RARITY_ORDER[i - 1]!),
      RARITY_ORDER[i] + ' needs more copies than ' + RARITY_ORDER[i - 1]
    );
});

void test('levels walk Bronze 1-10, Silver 1-10, then Gold', () => {
  assert.equal(levelLabel(1), 'BRONZE LV 1');
  assert.equal(levelLabel(TIER_LEVELS), 'BRONZE LV 10');
  assert.equal(levelLabel(TIER_LEVELS + 1), 'SILVER LV 1');
  assert.equal(levelLabel(TIER_LEVELS * 2 + 1), 'GOLD LV 1');
  assert.equal(gearTierOf(GEAR_MAX_LEVEL), 'Gold');
  assert.equal(tierLevelOf(GEAR_MAX_LEVEL), GEAR_MAX_LEVEL - TIER_LEVELS * 2);
  assert.ok(GEAR_MAX_LEVEL - TIER_LEVELS * 2 >= 50, 'gold runs long');
  assert.ok(isPromotion(TIER_LEVELS));
  assert.ok(isPromotion(TIER_LEVELS * 2));
  assert.ok(!isPromotion(TIER_LEVELS - 1));
  assert.ok(!isPromotion(TIER_LEVELS * 2 + 10));
});

void test('a promotion costs more than any level in the tier it leaves', () => {
  for (const r of RARITY_ORDER)
    for (const t of [0, 1]) {
      const from = t * TIER_LEVELS;
      const promo = upgradeCost(r, from + TIER_LEVELS)!;
      for (let L = from + 1; L < from + TIER_LEVELS; L++) {
        const c = upgradeCost(r, L)!;
        assert.ok(promo.copies > c.copies, r + ' copies at ' + L);
        assert.ok(promo.coins > c.coins, r + ' coins at ' + L);
      }
    }
});

void test('power always climbs, and a promotion is a real jump', () => {
  for (let L = 2; L <= GEAR_MAX_LEVEL; L++)
    assert.ok(leveledPower(100, L) > leveledPower(100, L - 1), 'at ' + L);
  const promo =
    leveledPower(100, TIER_LEVELS + 1) - leveledPower(100, TIER_LEVELS);
  const step = leveledPower(100, 3) - leveledPower(100, 2);
  assert.ok(promo > step);
});

void test('a pack lands its cards at its own tier', () => {
  assert.equal(packById('base')!.tier, 'Bronze');
  assert.equal(packById('bronze')!.tier, 'Bronze');
  assert.equal(packById('silver')!.tier, 'Silver');
  assert.equal(packById('gold')!.tier, 'Gold');
  // A new card arrives at the tier's level 1.
  assert.equal(levelAfterPull(1, 'Bronze', true), 1);
  assert.equal(levelAfterPull(1, 'Silver', true), TIER_LEVELS + 1);
  assert.equal(levelAfterPull(1, 'Gold', true), TIER_LEVELS * 2 + 1);
  // A duplicate is a spare copy only: the pack's tier never lifts it.
  assert.equal(levelAfterPull(7, 'Silver', false), 7);
  assert.equal(levelAfterPull(TIER_LEVELS + 4, 'Gold', false), TIER_LEVELS + 4);
});

void test('a gem pack tiers a new card and only stacks a duplicate', () => {
  const gold = packById('gold')!;
  const [fresh] = rollPack(gold, {}, () => 0);
  assert.equal(fresh!.tier, 'Gold');
  assert.equal(fresh!.isNew, true);
  const id = fresh!.id;
  const [dupe] = rollPack(gold, { [id]: 1 }, () => 0);
  assert.equal(dupe!.isNew, false);
  assert.equal(dupe!.owned, 2);
});

void test('a pack leans toward the hero in use without moving the odds', () => {
  const seq = mulberry32(11);
  const n = 3000;
  let mine = 0;
  for (let i = 0; i < n; i++)
    if (
      GEAR_BY_ID[rollCard(packById('base')!.odds, null, seq, 'Archer').id]!
        .cls === 'Archer'
    )
      mine++;
  // 60% from the hero's own cards plus a third of the open draw: ~73%.
  const share = mine / n;
  assert.ok(share > 0.68 && share < 0.78, 'archer share ' + share);
  // No hero: an even three-way split.
  let even = 0;
  for (let i = 0; i < n; i++)
    if (
      GEAR_BY_ID[rollCard(packById('base')!.odds, null, seq).id]!.cls ===
      'Archer'
    )
      even++;
  assert.ok(Math.abs(even / n - 1 / 3) < 0.04, 'even share ' + even / n);
});

void test('shards cover the copies a card is short of, spares first', () => {
  const cost = upgradeCost('Epic', 1)!;
  // One copy owned (no spares): short without shards, fine with enough.
  assert.equal(upgradeBlock('Epic', 1, 1, 1e9), 'copies');
  assert.equal(upgradeBlock('Epic', 1, 1, 1e9, cost.copies), null);
  assert.equal(upgradeBlock('Epic', 1, 1, 1e9, cost.copies - 1), 'copies');
  // Spares are spent before shards.
  const later = upgradeCost('Common', 5)!;
  assert.deepEqual(upgradeSpend(later, 1 + later.copies + 3), {
    copies: later.copies,
    shards: 0,
  });
  assert.deepEqual(upgradeSpend(later, 2), {
    copies: 1,
    shards: later.copies - 1,
  });
});

void test('salvage needs its copies spare, never the card itself', () => {
  assert.equal(canSalvage(SALVAGE_COPIES_PER_SHARD), false);
  assert.equal(canSalvage(SALVAGE_COPIES_PER_SHARD + 1), true);
  assert.equal(canSalvage(0), false);
});
