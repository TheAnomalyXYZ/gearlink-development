import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { RARITY_ORDER } from './gear.js';
import {
  bundleBonusPct,
  COIN_BUNDLES,
  GEM_BUNDLES,
  gemsForSku,
  PACKS,
} from './economy.js';

/**
 * The gem catalogue lives in two places by necessity: devvit.json registers the
 * products Reddit charges for, and economy.ts says what each SKU is worth. If
 * those drift, players are charged for gems the fulfilment route will not grant.
 */
type Product = {
  sku: string;
  price: number;
  accountingType: string;
  displayName: string;
  description: string;
};
const config = JSON.parse(readFileSync('devvit.json', 'utf8')) as {
  payments: { products: Product[]; endpoints: Record<string, string> };
};

void test('every gem bundle is a registered product at the same price', () => {
  const registered = new Map(config.payments.products.map((p) => [p.sku, p]));
  for (const bundle of GEM_BUNDLES) {
    assert.ok(bundle.sku, 'a gem bundle with no SKU cannot be bought');
    const product = registered.get(bundle.sku);
    assert.ok(
      product,
      `${bundle.sku} is sold in the shop but not registered in devvit.json`
    );
    assert.equal(
      product.price,
      bundle.gold,
      `${bundle.sku} is priced differently in the two files`
    );
    // INSTANT is what lets the fulfilment route credit and be done; a
    // CONSUMABLE would sit in an inventory nothing ever reads.
    assert.equal(product.accountingType, 'INSTANT');
  }
});

void test('no product is registered that the app would not know how to grant', () => {
  for (const product of config.payments.products)
    assert.notEqual(
      gemsForSku(product.sku),
      null,
      `${product.sku} can be bought but grants nothing`
    );
});

void test('a fulfilment endpoint is configured', () => {
  assert.ok(config.payments.endpoints['fulfillOrder']);
});

void test('an unknown SKU grants nothing rather than guessing', () => {
  assert.equal(gemsForSku('gems_999999'), null);
  assert.equal(gemsForSku(''), null);
});

void test('a product description quotes the bonus the bundle really gives', () => {
  const registered = new Map(config.payments.products.map((p) => [p.sku, p]));
  for (const bundle of GEM_BUNDLES) {
    const quoted = /(\d+)% bonus/.exec(
      registered.get(bundle.sku ?? '')?.description ?? ''
    );
    if (quoted)
      assert.equal(
        Number(quoted[1]),
        bundleBonusPct(GEM_BUNDLES, bundle),
        `${bundle.sku}'s checkout text is stale`
      );
  }
});

void test('a bigger bundle is never worse value than a smaller one', () => {
  for (const list of [COIN_BUNDLES, GEM_BUNDLES])
    for (let i = 1; i < list.length; i++)
      assert.ok(
        bundleBonusPct(list, list[i]!) > bundleBonusPct(list, list[i - 1]!),
        `${list[i]!.id} gives no more per unit than ${list[i - 1]!.id}`
      );
});

void test('bundle bonuses are worked out exactly', () => {
  assert.deepEqual(
    COIN_BUNDLES.map((b) => bundleBonusPct(COIN_BUNDLES, b)),
    [0, 18, 35, 60]
  );
  assert.deepEqual(
    GEM_BUNDLES.map((b) => bundleBonusPct(GEM_BUNDLES, b)),
    [0, 37, 50, 62]
  );
});

void test('pack odds are the odds a pull really has', () => {
  for (const pack of PACKS) {
    const total = pack.odds.reduce((n, [, w]) => n + w, 0);
    assert.equal(total, 100, `${pack.id}'s odds do not add up to 100%`);
    if (!pack.floor) continue;
    const floor = RARITY_ORDER.indexOf(pack.floor);
    for (const [r] of pack.odds)
      assert.ok(
        RARITY_ORDER.indexOf(r) >= floor,
        `${pack.id} lists ${r} odds but its floor turns every ${r} into ${pack.floor}`
      );
  }
});
