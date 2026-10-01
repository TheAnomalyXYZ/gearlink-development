import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAILY_FIELDS,
  coinBundleSku,
  dateRange,
  dayLabel,
  emptyCounters,
  goldSku,
  locationRows,
  packSku,
  pct,
  skuCurrency,
  skuRows,
  sumCounters,
  sumHashes,
  toCounters,
} from './admin.js';

void test('the field list covers every counter exactly once', () => {
  const keys = Object.keys(emptyCounters()).sort();
  assert.deepEqual([...DAILY_FIELDS].sort(), keys);
  assert.equal(new Set(DAILY_FIELDS).size, DAILY_FIELDS.length);
});

void test('a raw hash reads missing and junk fields as zero', () => {
  const c = toCounters({ runs: '4', run_wins: 'nope', unknown: '9' });
  assert.equal(c.runs, 4);
  assert.equal(c.run_wins, 0);
  assert.equal(c.kings, 0);
  assert.equal('unknown' in c, false);
});

void test('counters and hashes sum across days', () => {
  const a = { ...emptyCounters(), runs: 2, gems_spent: 10 };
  const b = { ...emptyCounters(), runs: 3 };
  const sum = sumCounters([a, b]);
  assert.equal(sum.runs, 5);
  assert.equal(sum.gems_spent, 10);
  assert.deepEqual(sumHashes([{ x: 1 }, { x: 2, y: 1 }, {}]), { x: 3, y: 1 });
});

void test('a date range is oldest first and ends today, in UTC', () => {
  const now = Date.UTC(2026, 9, 1, 23, 30);
  assert.deepEqual(dateRange(3, now), [
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
  ]);
  assert.equal(dayLabel('2026-10-01'), 'Oct 1');
});

void test('percentages never divide by zero', () => {
  assert.equal(pct(1, 0), 0);
  assert.equal(pct(1, 3), 33);
});

void test('a sku says which currency it was paid in', () => {
  assert.equal(skuCurrency(goldSku('gems_40')), 'gold');
  assert.equal(skuCurrency(coinBundleSku('c1')), 'gems');
  assert.equal(skuCurrency(packSku('base')), 'coins');
  assert.equal(skuCurrency(packSku('gold')), 'gems');
});

void test('sku rows are most-bought first, with their spend', () => {
  const rows = skuRows(
    { 'pack:base': 2, 'coins:c1': 5 },
    { 'pack:base': 300, 'coins:c1': 60 }
  );
  assert.deepEqual(
    rows.map((r) => [r.sku, r.count, r.spend]),
    [
      ['coins:c1', 5, 60],
      ['pack:base', 2, 300],
    ]
  );
});

void test('location rows keep map order and work out win rate', () => {
  const rows = locationRows(['forest', 'bridge'], {
    'forest:runs': 4,
    'forest:wins': 3,
  });
  assert.deepEqual(rows, [
    { id: 'forest', runs: 4, wins: 3, winRate: 75 },
    { id: 'bridge', runs: 0, wins: 0, winRate: 0 },
  ]);
});
