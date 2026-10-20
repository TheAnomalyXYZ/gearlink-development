import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_STREAK,
  STREAK_CYCLE,
  STREAK_MAX_SHIELDS,
  STREAK_MILESTONES,
  claimStreak,
  streakOutlook,
  streakView,
} from './streak.js';
import type { StreakState } from './streak.js';
import { packById } from './economy.js';

const DAY = 86_400_000;
const D = 20_000;

/** Claim on each of `days` in turn, starting from `s`. */
const claimDays = (s: StreakState, days: number[]): StreakState =>
  days.reduce((acc, d) => claimStreak(acc, d)!.state, s);

void test('every streak reward resolves to something real', () => {
  const all = [
    ...STREAK_CYCLE.flat(),
    ...STREAK_MILESTONES.flatMap((m) => m.rewards),
  ];
  for (const r of all) {
    if (r.kind === 'pack') assert.ok(packById(r.packId), r.packId);
    else assert.ok(r.amount > 0);
  }
  assert.equal(STREAK_CYCLE.length, 7);
});

void test('a first claim starts the streak at day 1', () => {
  const c = claimStreak(EMPTY_STREAK, D)!;
  assert.equal(c.state.count, 1);
  assert.equal(c.state.last, D);
  assert.deepEqual(c.rewards, STREAK_CYCLE[0]);
  assert.equal(c.restarted, false);
});

void test('a second claim on the same day pays nothing', () => {
  const s = claimDays(EMPTY_STREAK, [D]);
  assert.equal(claimStreak(s, D), null);
  assert.equal(streakOutlook(s, D).claimable, false);
});

void test('consecutive days grow the streak and walk the cycle', () => {
  const s = claimDays(EMPTY_STREAK, [D, D + 1, D + 2]);
  assert.equal(s.count, 3);
  const c = claimStreak(s, D + 3)!;
  assert.equal(c.state.count, 4);
  assert.deepEqual(c.rewards, STREAK_CYCLE[3]);
});

void test('day 7 earns a shield and day 8 starts the cycle again', () => {
  const days = Array.from({ length: 7 }, (_, i) => D + i);
  const s = claimDays(EMPTY_STREAK, days);
  assert.equal(s.count, 7);
  assert.equal(s.shields, 1);
  const c = claimStreak(s, D + 7)!;
  assert.deepEqual(c.rewards, STREAK_CYCLE[0]);
});

void test('shields cap out', () => {
  const days = Array.from({ length: 35 }, (_, i) => D + i);
  const s = claimDays(EMPTY_STREAK, days);
  assert.equal(s.shields, STREAK_MAX_SHIELDS);
});

void test('a missed day breaks the streak with no shield', () => {
  const s = claimDays(EMPTY_STREAK, [D, D + 1]);
  const o = streakOutlook(s, D + 3);
  assert.equal(o.broken, true);
  assert.equal(o.liveCount, 0);
  const c = claimStreak(s, D + 3)!;
  assert.equal(c.state.count, 1);
  assert.equal(c.restarted, true);
  assert.equal(c.state.best, 2);
});

void test('a shield covers a missed day and is spent', () => {
  const s: StreakState = { last: D, count: 9, best: 9, shields: 1 };
  const c = claimStreak(s, D + 2)!;
  assert.equal(c.state.count, 10);
  assert.equal(c.shieldsUsed, 1);
  assert.equal(c.state.shields, 0);
  assert.equal(c.restarted, false);
});

void test('more missed days than shields still breaks it', () => {
  const s: StreakState = { last: D, count: 9, best: 9, shields: 1 };
  const c = claimStreak(s, D + 3)!;
  assert.equal(c.state.count, 1);
  assert.equal(c.state.shields, 1);
});

void test('a milestone pays on top of the cycle slot', () => {
  const s: StreakState = { last: D, count: 13, best: 13, shields: 0 };
  const c = claimStreak(s, D + 1)!;
  assert.equal(c.milestone, 14);
  assert.deepEqual(c.rewards, [
    ...STREAK_CYCLE[6]!,
    ...STREAK_MILESTONES[0]!.rewards,
  ]);
});

void test('the view marks claimed, today and upcoming slots', () => {
  const s = claimDays(EMPTY_STREAK, [D, D + 1]);
  const before = streakView(s, (D + 2) * DAY + 5);
  assert.equal(before.claimable, true);
  assert.deepEqual(
    before.slots.map((x) => x.state),
    [
      'claimed',
      'claimed',
      'today',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]
  );
  assert.equal(before.resetAt, (D + 3) * DAY);

  const after = streakView(claimDays(s, [D + 2]), (D + 2) * DAY + 5);
  assert.equal(after.claimable, false);
  assert.equal(after.count, 3);
  assert.equal(after.slots.filter((x) => x.state === 'claimed').length, 3);
});

void test('the view rolls to a fresh week after day 7', () => {
  const s: StreakState = { last: D, count: 7, best: 7, shields: 1 };
  const v = streakView(s, (D + 1) * DAY);
  assert.equal(v.slots[0]!.day, 8);
  assert.equal(v.slots[0]!.state, 'today');
  // Day 7 claimed today shows the whole finished week.
  const done = streakView(s, D * DAY);
  assert.ok(done.slots.every((x) => x.state === 'claimed'));
});

void test('the view names the milestone today would hit', () => {
  const s: StreakState = { last: D, count: 13, best: 13, shields: 0 };
  assert.equal(streakView(s, (D + 1) * DAY).nextMilestone?.at, 14);
  assert.equal(streakView(s, D * DAY).nextMilestone?.at, 14);
  const at14: StreakState = { ...s, count: 14 };
  assert.equal(streakView(at14, D * DAY).nextMilestone?.at, 30);
});
