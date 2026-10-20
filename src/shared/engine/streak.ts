/**
 * Daily login rewards and the streak behind them.
 *
 * Opening the game once per UTC day and tapping CLAIM pays the next slot of a
 * seven-day cycle, and every claim on consecutive days grows the streak. The
 * cycle's last day is the big one, and long streaks pay one-off milestones on
 * top, so the reward for coming back keeps rising the longer someone stays.
 *
 * A missed day would normally reset the streak to 1. Finishing a seven-day
 * cycle earns a shield, and a shield covers one missed day - spent
 * automatically on the next claim - so one busy day does not wipe weeks of
 * coming back. Shields cap at STREAK_MAX_SHIELDS, so they cannot be banked to
 * skip a fortnight.
 *
 * Everything here is pure: the server keeps `StreakState` and asks these
 * functions what a claim is worth, so the client can never claim its own way.
 */
import type { QuestReward } from './quests.js';

const DAY_MS = 86_400_000;

/** Days since the epoch, UTC - the same day boundary the quests reset on. */
export const streakDayOf = (now: number): number => Math.floor(now / DAY_MS);

/** Shields a player can hold at once. */
export const STREAK_MAX_SHIELDS = 2;

/** The seven-day reward cycle. Day 7 is the big one and earns a shield. */
export const STREAK_CYCLE: readonly (readonly QuestReward[])[] = [
  [{ kind: 'coins', amount: 50 }],
  [{ kind: 'coins', amount: 80 }],
  [{ kind: 'gems', amount: 5 }],
  [{ kind: 'coins', amount: 120 }],
  [{ kind: 'pack', packId: 'base' }],
  [
    { kind: 'coins', amount: 150 },
    { kind: 'gems', amount: 5 },
  ],
  [
    { kind: 'pack', packId: 'bronze' },
    { kind: 'gems', amount: 10 },
  ],
];

export type StreakMilestone = { at: number; rewards: readonly QuestReward[] };

/** One-off bonuses paid on the claim that takes the streak to `at`. A streak
 *  that breaks and climbs back earns them again - coming back is the point. */
export const STREAK_MILESTONES: readonly StreakMilestone[] = [
  { at: 14, rewards: [{ kind: 'pack', packId: 'silver' }] },
  {
    at: 30,
    rewards: [
      { kind: 'pack', packId: 'gold' },
      { kind: 'gems', amount: 30 },
    ],
  },
  {
    at: 60,
    rewards: [
      { kind: 'pack', packId: 'gold' },
      { kind: 'gems', amount: 60 },
    ],
  },
  {
    at: 100,
    rewards: [
      { kind: 'pack', packId: 'gold' },
      { kind: 'pack', packId: 'gold' },
      { kind: 'gems', amount: 100 },
    ],
  },
];

/** What the server stores per player. */
export type StreakState = {
  /** The UTC day last claimed, or -1 for never. */
  last: number;
  /** Consecutive days claimed, as of `last`. */
  count: number;
  /** Longest streak ever reached. */
  best: number;
  /** Shields held, each covering one missed day. */
  shields: number;
};

export const EMPTY_STREAK: StreakState = {
  last: -1,
  count: 0,
  best: 0,
  shields: 0,
};

/** Where a player stands today, before they claim. */
export type StreakOutlook = {
  /** Today's reward is waiting. */
  claimable: boolean;
  /** The streak a claim today would make (or made, once claimed). */
  nextCount: number;
  /** Shields today's claim would spend to keep the streak alive. */
  shieldsUsed: number;
  /** Too many days were missed: today's claim starts again from 1. */
  broken: boolean;
  /** The streak to show right now - 0 once it has broken. */
  liveCount: number;
};

export const streakOutlook = (s: StreakState, today: number): StreakOutlook => {
  // Claimed today already - or a clock that ran backwards, treated the same.
  if (s.last >= today)
    return {
      claimable: false,
      nextCount: s.count,
      shieldsUsed: 0,
      broken: false,
      liveCount: s.count,
    };
  if (s.last < 0 || s.count <= 0)
    return {
      claimable: true,
      nextCount: 1,
      shieldsUsed: 0,
      broken: false,
      liveCount: 0,
    };
  const missed = today - s.last - 1;
  if (missed === 0)
    return {
      claimable: true,
      nextCount: s.count + 1,
      shieldsUsed: 0,
      broken: false,
      liveCount: s.count,
    };
  if (missed <= s.shields)
    return {
      claimable: true,
      nextCount: s.count + 1,
      shieldsUsed: missed,
      broken: false,
      liveCount: s.count,
    };
  return {
    claimable: true,
    nextCount: 1,
    shieldsUsed: 0,
    broken: true,
    liveCount: 0,
  };
};

/** Which slot of the cycle (0..6) streak day `count` pays. */
export const cycleSlot = (count: number): number =>
  (Math.max(1, count) - 1) % STREAK_CYCLE.length;

export const milestoneAt = (count: number): StreakMilestone | null =>
  STREAK_MILESTONES.find((m) => m.at === count) ?? null;

export const nextMilestone = (count: number): StreakMilestone | null =>
  STREAK_MILESTONES.find((m) => m.at > count) ?? null;

export type StreakClaim = {
  state: StreakState;
  /** Everything this claim pays: the cycle slot, then any milestone. */
  rewards: QuestReward[];
  milestone: number | null;
  shieldsUsed: number;
  shieldEarned: boolean;
  /** The old streak broke and this claim restarted it. */
  restarted: boolean;
};

/** Today's claim, or null when there is nothing to claim. */
export const claimStreak = (
  s: StreakState,
  today: number
): StreakClaim | null => {
  const o = streakOutlook(s, today);
  if (!o.claimable) return null;
  const count = o.nextCount;
  const finishesCycle = cycleSlot(count) === STREAK_CYCLE.length - 1;
  const shieldsLeft = s.shields - o.shieldsUsed;
  const shieldEarned = finishesCycle && shieldsLeft < STREAK_MAX_SHIELDS;
  const milestone = milestoneAt(count);
  return {
    state: {
      last: today,
      count,
      best: Math.max(s.best, count),
      shields: shieldsLeft + (shieldEarned ? 1 : 0),
    },
    rewards: [
      ...STREAK_CYCLE[cycleSlot(count)]!,
      ...(milestone ? milestone.rewards : []),
    ],
    milestone: milestone ? milestone.at : null,
    shieldsUsed: o.shieldsUsed,
    shieldEarned,
    restarted: o.broken,
  };
};

export type StreakSlotState = 'claimed' | 'today' | 'upcoming';

export type StreakSlotView = {
  /** The streak day this slot pays, 1-based. */
  day: number;
  rewards: QuestReward[];
  state: StreakSlotState;
  /** The cycle's last day: drawn bigger, and earns a shield. */
  big: boolean;
};

/** The streak as the client draws it: this cycle's seven slots, the count,
 *  and what the next claim does. */
export type StreakView = {
  /** The streak right now - 0 once a gap has broken it. */
  count: number;
  best: number;
  shields: number;
  maxShields: number;
  claimable: boolean;
  /** Today's claim restarts the streak at 1. */
  broken: boolean;
  /** Shields today's claim will spend to save the streak. */
  shieldsUsing: number;
  slots: StreakSlotView[];
  nextMilestone: { at: number; rewards: QuestReward[] } | null;
  /** When the next day's reward opens, in epoch ms (UTC midnight). */
  resetAt: number;
};

export const streakView = (s: StreakState, now: number): StreakView => {
  const today = streakDayOf(now);
  const o = streakOutlook(s, today);
  // The slot the cycle is anchored on: today's, or the one just claimed.
  const ref = Math.max(1, o.nextCount);
  const base =
    Math.floor((ref - 1) / STREAK_CYCLE.length) * STREAK_CYCLE.length;
  const slots = STREAK_CYCLE.map((rewards, i): StreakSlotView => {
    const day = base + i + 1;
    const state: StreakSlotState = o.claimable
      ? day < ref
        ? 'claimed'
        : day === ref
          ? 'today'
          : 'upcoming'
      : day <= ref
        ? 'claimed'
        : 'upcoming';
    return {
      day,
      rewards: [...rewards],
      state,
      big: i === STREAK_CYCLE.length - 1,
    };
  });
  // Once claimed the next milestone is past today's count; before, today's
  // claim may itself hit one, so it is looked up from the day before.
  const nm = nextMilestone(o.claimable ? ref - 1 : ref);
  return {
    count: o.liveCount,
    best: s.best,
    shields: s.shields,
    maxShields: STREAK_MAX_SHIELDS,
    claimable: o.claimable,
    broken: o.broken,
    shieldsUsing: o.shieldsUsed,
    slots,
    nextMilestone: nm ? { at: nm.at, rewards: [...nm.rewards] } : null,
    resetAt: (today + 1) * DAY_MS,
  };
};
