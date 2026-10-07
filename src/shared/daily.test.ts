import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import {
  DAY_MS,
  DAILY_EPOCH,
  dailyBattleFor,
  dailyFoe,
  dailyLocationId,
  dateLabelFor,
  dailyNumber,
  nextDailyAt,
  posterFor,
  utcDayKey,
} from './daily.js';
import { WAVE_ENEMIES } from './engine/monsters.js';
import { locationById } from './engine/campaign.js';

void test('the first Daily Battle is #1 and each UTC day adds one', () => {
  assert.equal(dailyNumber(DAILY_EPOCH), 1);
  assert.equal(dailyNumber(DAILY_EPOCH + DAY_MS - 1), 1);
  assert.equal(dailyNumber(DAILY_EPOCH + DAY_MS), 2);
});

void test('the next daily post goes up at the next UTC midnight', () => {
  const noon = DAILY_EPOCH + DAY_MS / 2;
  assert.equal(nextDailyAt(noon), DAILY_EPOCH + DAY_MS);
  assert.equal(nextDailyAt(DAILY_EPOCH), DAILY_EPOCH + DAY_MS);
});

void test('every foe comes round once per cycle, never twice in a row', () => {
  const n = WAVE_ENEMIES.length;
  const seen = new Set<string>();
  for (let d = 1; d <= n; d++) {
    seen.add(dailyFoe(d).foe);
    assert.notEqual(dailyFoe(d).foe, dailyFoe(d + 1).foe);
  }
  assert.equal(seen.size, n);
});

void test('every foe on a poster has art and a backdrop behind it', () => {
  for (let d = 1; d <= WAVE_ENEMIES.length; d++) {
    const f = dailyFoe(d);
    assert.ok(existsSync('public' + f.foeArt), 'missing ' + f.foeArt);
    assert.ok(existsSync('public' + f.backdrop), 'missing ' + f.backdrop);
  }
});

void test('a poster is labelled with its own day', () => {
  assert.equal(dateLabelFor('2026-10-01'), 'OCT 1');
  const p = posterFor('2026-10-03');
  assert.equal(p.day, 3);
  assert.equal(p.dateLabel, 'OCT 3');
  assert.equal(p.weekday, 'SAT');
  assert.equal(p.endsAt, DAILY_EPOCH + 3 * DAY_MS);
  assert.equal(utcDayKey(DAILY_EPOCH), '2026-10-01');
});

void test("a day is fought at the map location in its foe's region", () => {
  for (let day = 1; day <= WAVE_ENEMIES.length; day++) {
    const loc = locationById(dailyLocationId(day));
    assert.equal(loc.region, dailyFoe(day).region);
  }
  assert.deepEqual(dailyBattleFor('2026-10-01'), {
    day: 1,
    locationId: dailyLocationId(1),
  });
});
