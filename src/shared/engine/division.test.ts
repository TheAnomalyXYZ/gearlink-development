import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DIVISIONS,
  GROUP_BANDS,
  GROUP_SIZE,
  IDLE_GRACE,
  START_DIV,
  TOP_DIVISION,
  bandRewards,
  demoteCount,
  divisionIndex,
  groupBandFor,
  groupOutcome,
  groupZones,
  nextGroupBand,
  promoteCount,
  stepDivision,
} from './division.js';
import { SOLO_MIN_RUNS } from './solo.js';

const runs = SOLO_MIN_RUNS;

void test('every qualified group finish pays a band', () => {
  for (let rank = 1; rank <= GROUP_SIZE; rank++)
    assert.ok(groupBandFor(rank, GROUP_SIZE, runs), '#' + rank + ' pays');
  assert.equal(groupBandFor(1, GROUP_SIZE, runs - 1), null);
  assert.equal(groupBandFor(null, GROUP_SIZE, runs), null);
  assert.equal(groupBandFor(1, 20, runs)?.id, 'first');
  assert.equal(groupBandFor(5, 20, runs)?.id, 'top25');
  assert.equal(groupBandFor(6, 20, runs)?.id, 'top50');
  assert.equal(groupBandFor(11, 20, runs)?.id, 'finisher');
  // A two-player group has no winner's band, only the halves.
  assert.equal(groupBandFor(1, 2, runs)?.id, 'finisher');
});

void test('a better band pays more, and a higher division more again', () => {
  for (let i = 1; i < GROUP_BANDS.length; i++)
    assert.ok(GROUP_BANDS[i - 1]!.coins > GROUP_BANDS[i]!.coins);
  const coins = (div: number) => {
    const r = bandRewards(GROUP_BANDS[0]!, div)[0]!;
    return r.kind === 'coins' ? r.amount : 0;
  };
  for (let d = 1; d < DIVISIONS.length; d++) assert.ok(coins(d) > coins(d - 1));
  assert.equal(coins(0), 200);
});

void test('group prizes and first-reach bonuses never pay gems', () => {
  for (let d = 0; d < DIVISIONS.length; d++) {
    for (const b of GROUP_BANDS)
      assert.ok(bandRewards(b, d).every((r) => r.kind !== 'gems'));
    assert.ok(DIVISIONS[d]!.firstReach.every((r) => r.kind !== 'gems'));
  }
});

void test('a quarter of a group moves each way, capped', () => {
  assert.equal(promoteCount(0), 0);
  assert.equal(promoteCount(1), 1);
  assert.equal(promoteCount(7), 1);
  assert.equal(promoteCount(20), 5);
  assert.equal(promoteCount(40), 5);
  assert.equal(demoteCount(7), 0);
  assert.equal(demoteCount(8), 2);
  assert.equal(demoteCount(20), 5);
});

void test('the top of a group goes up and the bottom goes down', () => {
  assert.equal(groupOutcome(1, 20, runs, 1), 'promote');
  assert.equal(groupOutcome(5, 20, runs, 1), 'promote');
  assert.equal(groupOutcome(6, 20, runs, 1), 'hold');
  assert.equal(groupOutcome(15, 20, runs, 1), 'hold');
  assert.equal(groupOutcome(16, 20, runs, 1), 'demote');
  // Seated but never scored counts as last.
  assert.equal(groupOutcome(null, 20, 1, 1), 'demote');
  // Promotion needs the battles; a short week holds instead.
  assert.equal(groupOutcome(1, 20, runs - 1, 1), 'hold');
  // Nowhere to go at either end.
  assert.equal(groupOutcome(1, 20, runs, TOP_DIVISION), 'hold');
  assert.equal(groupOutcome(20, 20, runs, 0), 'hold');
  // A small group only promotes.
  assert.equal(groupOutcome(5, 5, runs, 2), 'hold');
});

void test('zones match the outcomes', () => {
  assert.deepEqual(groupZones(20, 2), { promote: 5, demote: 16 });
  assert.deepEqual(groupZones(20, 0), { promote: 5, demote: 0 });
  assert.deepEqual(groupZones(20, TOP_DIVISION), { promote: 0, demote: 16 });
  assert.deepEqual(groupZones(5, 2), { promote: 1, demote: 0 });
});

void test('promotion pays a division bonus only the first time', () => {
  const up = stepDivision(START_DIV, 'promote');
  assert.equal(up.next.div, 1);
  assert.deepEqual(up.bonus, DIVISIONS[1]!.firstReach);
  const down = stepDivision(up.next, 'demote');
  assert.equal(down.next.div, 0);
  assert.equal(down.next.best, 1);
  const again = stepDivision(down.next, 'promote');
  assert.equal(again.next.div, 1);
  assert.deepEqual(again.bonus, []);
});

void test('a missed week is forgiven, the next ones drop a division', () => {
  let s = { div: 3, idle: 0, best: 3 };
  for (let i = 0; i < IDLE_GRACE; i++) s = stepDivision(s, null).next;
  assert.equal(s.div, 3);
  s = stepDivision(s, null).next;
  assert.equal(s.div, 2);
  s = stepDivision(s, null).next;
  assert.equal(s.div, 1);
  // Playing resets the count.
  s = stepDivision(s, 'hold').next;
  assert.equal(s.idle, 0);
  assert.equal(stepDivision(s, null).next.div, 1);
  // Bronze floors.
  assert.equal(stepDivision({ div: 0, idle: 5, best: 0 }, null).next.div, 0);
});

void test('the next band up is the closest one open', () => {
  assert.equal(nextGroupBand(1, 20, runs), null);
  assert.equal(nextGroupBand(3, 20, runs)?.tier.id, 'first');
  assert.equal(nextGroupBand(8, 20, runs)?.rank, 5);
  assert.equal(nextGroupBand(15, 20, runs)?.rank, 10);
});

void test('division ids round-trip, unknown reads as Bronze', () => {
  for (const [i, d] of DIVISIONS.entries())
    assert.equal(divisionIndex(d.id), i);
  assert.equal(divisionIndex('nope'), 0);
  assert.equal(divisionIndex(undefined), 0);
});
