import assert from 'node:assert/strict';
import test from 'node:test';
import { DUEL_BOTS, botsInTier } from './duel.js';
import {
  DEMOTE_LEVEL,
  LEAGUES,
  TOP_LEAGUE,
  TROPHY_FLOOR,
  applyDuelDelta,
  duelSeasonEndsAt,
  duelWeekOf,
  leagueOf,
  leagueProgress,
  nextLeague,
  settleWeek,
  settleWeeks,
  toNextLeague,
  weeklyOutcome,
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

const byName = (n: string) => LEAGUES.find((l) => l.name === n)!;

void test('a week of results never crosses a tier line', () => {
  const b1 = byName('Bronze 1');
  const b3 = byName('Bronze 3');
  const s1 = byName('Silver 1');
  // Winning at Bronze 3 tops out below Silver 1; losing at Silver 1 holds it.
  assert.equal(applyDuelDelta(s1.floor - 5, 22), s1.floor - 1);
  assert.equal(leagueOf(applyDuelDelta(b3.floor, 500)).name, 'Bronze 3');
  assert.equal(applyDuelDelta(s1.floor, -12), s1.floor);
  assert.equal(applyDuelDelta(b1.floor, -12), b1.floor);
  // Inside the tier, levels move freely both ways.
  assert.equal(
    leagueOf(applyDuelDelta(byName('Bronze 2').floor, -1)).name,
    'Bronze 1'
  );
  const k = byName('Knight');
  assert.equal(applyDuelDelta(k.floor + 10, 22), k.floor + 32);
  assert.equal(applyDuelDelta(k.floor, -12), k.floor);
});

void test('the reset promotes level 3, holds level 2 and drops level 1', () => {
  assert.equal(
    settleWeek(byName('Bronze 3').floor + 30),
    byName('Silver 1').floor
  );
  assert.equal(settleWeek(byName('Diamond 3').floor), byName('Knight').floor);
  const s2 = byName('Silver 2').floor + 40;
  assert.equal(settleWeek(s2), s2);
  assert.equal(
    leagueOf(settleWeek(byName('Silver 1').floor)).name,
    'Bronze ' + DEMOTE_LEVEL
  );
  // Nothing below Bronze and nothing above Knight.
  assert.equal(settleWeek(byName('Bronze 1').floor), byName('Bronze 1').floor);
  assert.equal(
    settleWeek(byName('Knight').floor + 900),
    byName('Knight').floor + 900
  );
  assert.equal(weeklyOutcome(byName('Gold 3').floor), 'promote');
  assert.equal(weeklyOutcome(byName('Gold 2').floor), 'hold');
  assert.equal(weeklyOutcome(byName('Gold 1').floor), 'demote');
});

void test('missed resets settle to a fixed point instead of bouncing', () => {
  const start = byName('Silver 3').floor;
  const once = settleWeeks(start, 1);
  assert.equal(leagueOf(once).name, 'Gold 1');
  const many = settleWeeks(start, 50);
  assert.equal(settleWeek(many), many, 'a long absence should end at rest');
});

void test('the season week starts on Monday UTC', () => {
  const mon = Date.UTC(2026, 8, 28); // Monday 28 Sep 2026
  assert.equal(duelWeekOf(mon), duelWeekOf(mon + 6 * 86_400_000 + 1000));
  assert.equal(duelWeekOf(mon) - 1, duelWeekOf(mon - 1));
  assert.equal(duelSeasonEndsAt(mon), mon + 7 * 86_400_000);
});

void test('every tier has a house bot, and the low tiers have the most', () => {
  let prev = Infinity;
  for (const l of LEAGUES.filter((x) => x.level <= 1)) {
    const bots = botsInTier(l.floor);
    assert.ok(bots.length > 0, l.tier + ' has no bots');
    assert.ok(bots.length <= prev, l.tier + ' has more bots than below it');
    for (const b of bots)
      assert.equal(leagueOf(b.rating).tier, l.tier, b.name + ' is out of tier');
    prev = bots.length;
  }
  assert.ok(botsInTier(TROPHY_FLOOR).length >= 5, 'Bronze cannot fill a lobby');
  const ids = new Set(DUEL_BOTS.map((b) => b.id));
  assert.equal(ids.size, DUEL_BOTS.length, 'bot ids collide');
});
