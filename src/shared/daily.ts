/**
 * The Daily Battle: one fresh post a day, each with its own ladder.
 *
 * Everything here is a pure function of the clock, so the server that posts
 * the day and the server that draws its poster agree on which foe the day
 * belongs to.
 */
import type { DailyPoster } from './api.js';
import {
  WAVE_ENEMIES,
  backgroundUrlFor,
  monsterUrlFor,
} from './engine/monsters.js';

export const DAY_MS = 86_400_000;

/** Daily Battle #1 is the first UTC day the daily post ran. */
export const DAILY_EPOCH = Date.UTC(2026, 9, 1);

/** The UTC day a moment falls in, as YYYY-MM-DD. */
export const utcDayKey = (now: number): string =>
  new Date(now).toISOString().slice(0, 10);

export const dailyNumber = (now: number): number =>
  Math.floor((now - DAILY_EPOCH) / DAY_MS) + 1;

/** The next UTC midnight, when the next daily post goes up. */
export const nextDailyAt = (now: number): number =>
  (Math.floor(now / DAY_MS) + 1) * DAY_MS;

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export const dateLabelFor = (dayKey: string): string => {
  const [, m, d] = dayKey.split('-');
  return (MONTHS[Number(m) - 1] ?? '') + ' ' + Number(d);
};

/** The light each region is lit in, and the line its poster carries. */
const REGION_LOOK: Record<string, { accent: string; tagline: string }> = {
  Forest: { accent: '#8CE06A', tagline: 'Bandits in the treeline.' },
  Bridge: { accent: '#62D6E8', tagline: 'Pay the toll or break the troll.' },
  Caves: { accent: '#B98CFF', tagline: 'Something drips in the dark.' },
  'Ghost Town': { accent: '#7FF0C4', tagline: 'The dead keep score too.' },
  Mountain: { accent: '#A8E4FF', tagline: 'Bring a warm coat.' },
  Castle: { accent: '#FFC857', tagline: 'The crown is up for grabs.' },
};

/**
 * The foe a daily number puts on the poster. The roster is walked with a
 * stride coprime to its length, so consecutive days jump between regions
 * rather than climbing the roster in HP order, and every foe comes round once
 * per cycle.
 */
export const dailyFoe = (day: number) => {
  const n = WAVE_ENEMIES.length;
  const i = (((day * 7) % n) + n) % n;
  const [name, region] = WAVE_ENEMIES[i]!;
  const look = REGION_LOOK[region] ?? {
    accent: '#FFD34E',
    tagline: 'Link your gear, break the wave.',
  };
  return {
    foe: name,
    foeArt: monsterUrlFor(name),
    region,
    backdrop: backgroundUrlFor(region),
    ...look,
  };
};

/** The poster for one day's post. With no ladder given it is what a fresh
 *  daily post looks like. */
export const posterFor = (
  dayKey: string,
  top: DailyPoster['top'] = [],
  players = 0
): DailyPoster => {
  const day = dailyNumber(Date.parse(dayKey + 'T00:00:00Z'));
  return {
    day,
    dateLabel: dateLabelFor(dayKey),
    ...dailyFoe(day),
    top,
    players,
  };
};
