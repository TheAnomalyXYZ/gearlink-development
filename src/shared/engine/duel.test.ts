import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DUEL_MATCH_SECONDS,
  DUEL_MIN_SECONDS,
  DUEL_RESULT_GRACE_SECONDS,
  duelDayOf,
  duelSecondsCredible,
} from './duel.js';
import { isRunSeed, randomRunSeed } from './run.js';

void test('a duel is credible only between the floor and the clock plus grace', () => {
  assert.equal(duelSecondsCredible(DUEL_MIN_SECONDS - 1), false);
  assert.equal(duelSecondsCredible(DUEL_MIN_SECONDS), true);
  assert.equal(duelSecondsCredible(DUEL_MATCH_SECONDS), true);
  assert.equal(
    duelSecondsCredible(DUEL_MATCH_SECONDS + DUEL_RESULT_GRACE_SECONDS + 1),
    false
  );
  assert.equal(duelSecondsCredible(Number.NaN), false);
});

void test('the ranked cap rolls over at UTC midnight', () => {
  const midnight = Date.UTC(2026, 10, 3);
  assert.equal(duelDayOf(midnight - 1) + 1, duelDayOf(midnight));
  assert.equal(duelDayOf(midnight), duelDayOf(midnight + 86_399_999));
});

void test('run seeds are unsigned 32-bit integers', () => {
  assert.equal(isRunSeed(0), true);
  assert.equal(isRunSeed(0xffffffff), true);
  assert.equal(isRunSeed(-1), false);
  assert.equal(isRunSeed(0x100000000), false);
  assert.equal(isRunSeed(1.5), false);
  assert.equal(isRunSeed('7'), false);
  assert.equal(
    randomRunSeed(() => 0),
    0
  );
  assert.equal(
    randomRunSeed(() => 0.999999999999),
    0xffffffff
  );
  for (let i = 0; i < 50; i++) assert.equal(isRunSeed(randomRunSeed()), true);
});
