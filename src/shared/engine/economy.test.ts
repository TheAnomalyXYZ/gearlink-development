import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GEM_BUNDLES, gemsForSku } from './economy.js';

/**
 * The gem catalogue lives in two places by necessity: devvit.json registers the
 * products Reddit charges for, and economy.ts says what each SKU is worth. If
 * those drift, players are charged for gems the fulfilment route will not grant.
 */
type Product = { sku: string; price: number; accountingType: string; displayName: string };
const config = JSON.parse(readFileSync('devvit.json', 'utf8')) as {
  payments: { products: Product[]; endpoints: Record<string, string> };
};

void test('every gem bundle is a registered product at the same price', () => {
  const registered = new Map(config.payments.products.map((p) => [p.sku, p]));
  for (const bundle of GEM_BUNDLES) {
    assert.ok(bundle.sku, 'a gem bundle with no SKU cannot be bought');
    const product = registered.get(bundle.sku);
    assert.ok(product, `${bundle.sku} is sold in the shop but not registered in devvit.json`);
    assert.equal(product.price, bundle.gold, `${bundle.sku} is priced differently in the two files`);
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
