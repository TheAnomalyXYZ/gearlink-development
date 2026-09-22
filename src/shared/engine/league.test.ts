import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEAGUES,
  TOP_LEAGUE,
  TROPHY_FLOOR,
  leagueOf,
  leagueProgress,
  nextLeague,
  toNextLeague,
} from './league.js';

void test('the ladder is five three-level tiers and a single Knight rung', () => {
  assert.equal(LEAGUES.length, 16);
  assert.equal(LEAGUES[0]!.name, 'Bronze 1');
  assert.equal(TOP_LEAGUE.name, 'Knight');
  assert.equal(TOP_LEAGUE.level, 0);
  const levels = new Map<string, number[]>();
  for (const l of LEAGUES)
    levels.set(l.tier, (levels.get(l.tier) ?? []).concat([l.level]));
  for (const [tier, ls] of levels)
    assert.deepEqual(
      ls,
      tier === 'Knight' ? [0] : [1, 2, 3],
      tier + ' has the wrong levels'
    );
});

void test('floors only ever climb', () => {
  for (let i = 1; i < LEAGUES.length; i++)
    assert.ok(
      LEAGUES[i]!.floor > LEAGUES[i - 1]!.floor,
      LEAGUES[i]!.name + ' does not sit above ' + LEAGUES[i - 1]!.name
    );
});

void test('a fresh account opens on Bronze 1, which is also the floor', () => {
  assert.equal(TROPHY_FLOOR, LEAGUES[0]!.floor);
  assert.equal(leagueOf(TROPHY_FLOOR).name, 'Bronze 1');
  // Nothing should ever write a count below the floor, but a stale save must
  // still read as Bronze 1 rather than crashing the badge.
  assert.equal(leagueOf(0).name, 'Bronze 1');
  assert.equal(leagueOf(-50).name, 'Bronze 1');
  assert.equal(leagueOf(Number.NaN).name, 'Bronze 1');
});

void test('every floor lands exactly on its own league', () => {
  for (const l of LEAGUES) {
    assert.equal(leagueOf(l.floor).idx, l.idx, l.name + ' floor misreads');
    if (l.idx > 0)
      assert.equal(
        leagueOf(l.floor - 1).idx,
        l.idx - 1,
        'one below ' + l.name + ' should be the rung under it'
      );
  }
});

void test('losing trophies drops you back down a rung', () => {
  const silver1 = LEAGUES.find((l) => l.name === 'Silver 1')!;
  assert.equal(leagueOf(silver1.floor).name, 'Silver 1');
  assert.equal(leagueOf(silver1.floor - 1).name, 'Bronze 3');
});

void test('progress and distance agree about the next rung', () => {
  const b1 = LEAGUES[0]!;
  const b2 = LEAGUES[1]!;
  assert.equal(leagueProgress(b1.floor), 0);
  assert.equal(toNextLeague(b1.floor), b2.floor - b1.floor);
  assert.equal(leagueProgress(b2.floor - 1) < 1, true);
  // Knight is the last rung: nothing above it, and the bar reads full.
  assert.equal(nextLeague(TOP_LEAGUE.floor), null);
  assert.equal(toNextLeague(TOP_LEAGUE.floor), null);
  assert.equal(leagueProgress(TOP_LEAGUE.floor + 5000), 1);
});
