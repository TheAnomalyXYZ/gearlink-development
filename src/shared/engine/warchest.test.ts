import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_DONATION,
  MIN_DONATION,
  WAR_CHEST_TIERS,
  boostedCoins,
  donationIsLegal,
  nextWarChestTier,
  warChestBonusPct,
  warChestTier,
} from './warchest.js';

void test('tiers climb in both threshold and bonus', () => {
  for (let i = 1; i < WAR_CHEST_TIERS.length; i++) {
    assert.ok(WAR_CHEST_TIERS[i]!.at > WAR_CHEST_TIERS[i - 1]!.at);
    assert.ok(WAR_CHEST_TIERS[i]!.bonusPct > WAR_CHEST_TIERS[i - 1]!.bonusPct);
  }
});

void test('a tier is live from exactly its threshold', () => {
  const first = WAR_CHEST_TIERS[0]!;
  assert.equal(warChestTier(0), null);
  assert.equal(warChestBonusPct(first.at - 1), 0);
  assert.equal(warChestTier(first.at), first);
  assert.equal(warChestBonusPct(first.at), first.bonusPct);
  const last = WAR_CHEST_TIERS[WAR_CHEST_TIERS.length - 1]!;
  assert.equal(warChestTier(last.at * 10), last);
});

void test('the next tier is the first one not yet reached', () => {
  assert.equal(nextWarChestTier(0), WAR_CHEST_TIERS[0]);
  assert.equal(nextWarChestTier(WAR_CHEST_TIERS[0]!.at), WAR_CHEST_TIERS[1]);
  const last = WAR_CHEST_TIERS[WAR_CHEST_TIERS.length - 1]!;
  assert.equal(nextWarChestTier(last.at), null);
});

void test('the bonus scales battle coins and rounds down', () => {
  assert.equal(boostedCoins(100, 0), 100);
  assert.equal(boostedCoins(100, 25), 125);
  assert.equal(boostedCoins(7, 10), 7);
  assert.equal(boostedCoins(-5, 50), 0);
});

void test('donations are whole coins inside the bounds', () => {
  assert.ok(donationIsLegal(MIN_DONATION));
  assert.ok(donationIsLegal(MAX_DONATION));
  assert.ok(!donationIsLegal(MIN_DONATION - 1));
  assert.ok(!donationIsLegal(MAX_DONATION + 1));
  assert.ok(!donationIsLegal(50.5));
  assert.ok(!donationIsLegal(Number.NaN));
});
