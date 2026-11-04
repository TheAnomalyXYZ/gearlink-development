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
  dailyRunSeed,
  nextDailyAt,
  posterFor,
  shareText,
  utcDayKey,
  type DailyRun,
} from './daily.js';
import { WAVE_ENEMIES } from './engine/monsters.js';
import { locationById } from './engine/campaign.js';
import { isRunSeed } from './engine/run.js';

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
    endsAt: Date.parse('2026-10-02T00:00:00Z'),
  });
});

void test('a day deals everyone the same seeds, a fresh one per attempt', () => {
  assert.equal(dailyRunSeed(40, 1), dailyRunSeed(40, 1));
  const seeds = new Set<number>();
  for (let day = 1; day <= 30; day++)
    for (let attempt = 1; attempt <= 5; attempt++) {
      const s = dailyRunSeed(day, attempt);
      assert.ok(isRunSeed(s));
      seeds.add(s);
    }
  assert.equal(seeds.size, 150);
});

void test('a shared battle reads as one line', () => {
  const run: DailyRun = {
    day: 34,
    score: 4210,
    waves: 7,
    waveCount: 8,
    chain: 6,
    hero: 'Archer',
    won: false,
    rank: 3,
  };
  assert.equal(
    shareText(run),
    "Daily Battle #34: 4,210 points as Archer - fell on wave 8 of 8, best chain 6. #3 on today's ladder."
  );
  assert.equal(
    shareText({ ...run, won: true, waves: 8, rank: null }),
    'Daily Battle #34: 4,210 points as Archer - cleared all 8 waves, best chain 6.'
  );
});
