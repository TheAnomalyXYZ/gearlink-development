import assert from 'node:assert/strict';
import test from 'node:test';
import { duelWeekOf } from './league.js';
import {
  FLAIRS,
  flairUnlocked,
  newlyUnlockedFlairs,
  weeklyFlairFor,
} from './flair.js';
import {
  SOLO_ALERT_FANOUT,
  SOLO_MIN_RUNS,
  SOLO_TIERS,
  nextSoloTier,
  passedRanks,
  soloGain,
  soloPoints,
  soloTierFor,
  soloWeekStart,
  titleExpiresAt,
  titleIsLive,
} from './solo.js';

void test('weekly points add up every location best', () => {
  assert.equal(soloPoints({}), 0);
  assert.equal(soloPoints({ forest: 1200, bridge: 800 }), 2000);
  // Junk in the hash never counts.
  assert.equal(soloPoints({ a: -5, b: Number.NaN, c: 10.9 }), 10);
});

void test('a replay only counts what it beats the best by', () => {
  assert.equal(soloGain(0, 500), 500);
  assert.equal(soloGain(500, 400), 0);
  assert.equal(soloGain(500, 650), 150);
});

void test('titles need a placing, enough runs and a big enough ladder', () => {
  const runs = SOLO_MIN_RUNS;
  assert.equal(soloTierFor(null, 100, runs), null);
  assert.equal(soloTierFor(1, 100, runs - 1), null);
  assert.equal(soloTierFor(1, 100, runs)?.id, 'champion');
  assert.equal(soloTierFor(3, 100, runs)?.id, 'podium');
  assert.equal(soloTierFor(10, 100, runs)?.id, 'top10');
  assert.equal(soloTierFor(11, 100, runs), null);
  // A small week pays only the crown.
  assert.equal(soloTierFor(1, 3, runs)?.id, 'champion');
  assert.equal(soloTierFor(2, 3, runs), null);
  assert.equal(soloTierFor(5, 14, runs), null);
});

void test('weekly prizes never pay gems', () => {
  for (const t of SOLO_TIERS)
    assert.ok(
      t.rewards.every((r) => r.kind !== 'gems'),
      t.id + ' pays gems'
    );
});

void test('the next title up is the closest one open', () => {
  const runs = SOLO_MIN_RUNS;
  assert.equal(nextSoloTier(1, 100, runs), null);
  assert.deepEqual(
    [nextSoloTier(2, 100, runs)?.tier.id, nextSoloTier(2, 100, runs)?.rank],
    ['champion', 1]
  );
  assert.equal(nextSoloTier(40, 100, runs)?.tier.id, 'top10');
  // Short of battles, the chase is qualifying for what the rank already fits.
  assert.equal(nextSoloTier(2, 100, runs - 1)?.tier.id, 'podium');
  // Closed titles are skipped: the podium needs six players.
  assert.equal(nextSoloTier(2, 5, runs)?.tier.id, 'champion');
  assert.equal(nextSoloTier(0, 100, runs), null);
});

void test('a run tells the players it passed, closest first', () => {
  assert.deepEqual(passedRanks(8, 5, 20), { from: 6, to: 8 });
  assert.equal(passedRanks(5, 5, 20), null);
  // A first score passes everyone below it, up to the fan-out.
  assert.deepEqual(passedRanks(null, 3, 5), { from: 4, to: 5 });
  assert.deepEqual(passedRanks(null, 1, 50), {
    from: 2,
    to: 1 + SOLO_ALERT_FANOUT,
  });
  assert.deepEqual(passedRanks(40, 2, 50), {
    from: 3,
    to: 2 + SOLO_ALERT_FANOUT,
  });
  assert.equal(passedRanks(null, 1, 1), null);
});

void test('weeks line up with the Monday duel reset', () => {
  const week = duelWeekOf(Date.UTC(2026, 9, 14, 12));
  assert.equal(duelWeekOf(soloWeekStart(week)), week);
  assert.equal(duelWeekOf(soloWeekStart(week) - 1), week - 1);
  assert.equal(new Date(soloWeekStart(week)).getUTCDay(), 1);
  assert.equal(titleExpiresAt(week), soloWeekStart(week + 2));
});

void test('a title is worn only the week after it was earned', () => {
  const t = { tier: 'champion' as const, week: 10, rank: 1 };
  assert.equal(titleIsLive(t, 10), false);
  assert.equal(titleIsLive(t, 11), true);
  assert.equal(titleIsLive(t, 12), false);
  assert.equal(titleIsLive(null, 11), false);
});

void test('every tier has a weekly flair that is never banked', () => {
  const all = {
    progress: 99,
    ascension: 99,
    bestScore: 1e9,
    bestChain: 99,
    trophies: 1e9,
    donated: 1e9,
  };
  for (const t of SOLO_TIERS) {
    const f = weeklyFlairFor(t.id);
    assert.ok(f, t.id + ' has no flair');
    assert.equal(f.id, t.flairId);
    assert.equal(flairUnlocked(f, all), false);
  }
  const banked = newlyUnlockedFlairs(all, []);
  for (const f of FLAIRS)
    if (f.unlock.kind === 'weekly') assert.ok(!banked.includes(f.id));
});
