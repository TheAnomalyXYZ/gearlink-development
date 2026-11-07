import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEAL_COUNT,
  GEAR_DEAL_PRICE,
  PACK_DEAL_PCT_OFF,
  dailyDeals,
  dealById,
} from './deals.js';
import { packById } from './economy.js';
import { GEAR_BY_ID } from './gear.js';

void test('the same player on the same day always gets the same deals', () => {
  assert.deepEqual(
    dailyDeals('t2_abc', '2026-11-06'),
    dailyDeals('t2_abc', '2026-11-06')
  );
});

void test('deals change between days and between players', () => {
  const days = new Set<string>();
  const users = new Set<string>();
  for (let d = 1; d <= 20; d++)
    days.add(
      JSON.stringify(
        dailyDeals('t2_abc', '2026-11-' + String(d).padStart(2, '0'))
      )
    );
  for (let u = 0; u < 20; u++)
    users.add(JSON.stringify(dailyDeals('t2_' + u, '2026-11-06')));
  assert.ok(days.size > 10, 'twenty days should not repeat this much');
  assert.ok(users.size > 10, 'twenty players should not share this much');
});

void test('a lineup is a Rare card, an Epic card and a discounted pack', () => {
  for (let u = 0; u < 50; u++) {
    const deals = dailyDeals('t2_' + u, '2026-11-06');
    assert.equal(deals.length, DEAL_COUNT);
    deals.forEach((d, i) => assert.equal(d.id, String(i)));
    const [rare, epic, pack] = deals;
    for (const [deal, rarity] of [
      [rare, 'Rare'],
      [epic, 'Epic'],
    ] as const) {
      assert.equal(deal?.kind, 'gear');
      const g = GEAR_BY_ID[deal.itemId];
      assert.ok(g, deal.itemId + ' is not a card');
      assert.equal(g.rarity, rarity);
      assert.ok(!g.variantOf, 'deals sell base pieces only');
      assert.equal(deal.price, GEAR_DEAL_PRICE[rarity]?.price);
      assert.equal(deal.cur, GEAR_DEAL_PRICE[rarity]?.cur);
    }
    assert.equal(pack?.kind, 'pack');
    const p = packById(pack.itemId);
    assert.ok(p);
    assert.equal(pack.cur, p.cur);
    assert.equal(pack.was, p.price);
    assert.ok(pack.price < p.price && pack.price > 0);
    assert.equal(pack.pctOff, PACK_DEAL_PCT_OFF);
  }
});

void test('every deal is cheaper than what it is compared against', () => {
  for (let u = 0; u < 50; u++)
    for (const d of dailyDeals('t2_' + u, '2026-11-06')) {
      assert.ok(d.price < d.was);
      assert.ok(d.pctOff > 0);
    }
});

void test('dealById finds a slot and refuses anything else', () => {
  const deals = dailyDeals('t2_abc', '2026-11-06');
  assert.equal(dealById(deals, '1'), deals[1]);
  assert.equal(dealById(deals, '9'), null);
  assert.equal(dealById(deals, ''), null);
});
