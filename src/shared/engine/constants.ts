/**
 * Tuning constants for the GearLink engine, lifted verbatim from the POC
 * (GearLink design POC V3.3) so a run here plays the run the design plays.
 *
 * Everything in this folder is PURE: no DOM, no timers, no `Math.random`. The
 * server replays a submitted run through the same code to verify a score, so a
 * non-deterministic engine would make verification impossible.
 */

export const GRID_COLS = 6;
export const GRID_ROWS = 5;
export const CELLS = 30;
export const MIN_LINK = 3;

export const SUPER_FLAG = 100;
export const SUPER_MIN_LINK = 6;
export const JUNK_FLAG = 200;

export const BOMB_MULT_X100 = 40;
export const BOMB_CENTER_MULT_X100 = 80;

/**
 * Re-based so a card's POWER is literally what a 3-link pays: index 3 is 100%.
 * Growth is gentle and near-linear (+20, +22, +24, ... per extra orb).
 */
export const CHAIN_MULT_X100 = [0, 0, 0, 100, 120, 142, 166, 192, 220, 250];
export const CHAIN_MULT_STEP_X100 = 32;

export const PLAYER_HP = 40;
export const GLASS_KNIGHT_HP = 24;

export const WAVE_BASE_HP_MIN = 21;
export const WAVE_BASE_HP_MAX = 25;
export const WAVE_BASE_STR_MIN = 3;
export const WAVE_BASE_STR_MAX = 4;

export const WAVE_HP_GROWTH_BANDS = [
  { u: 6, x: 1050 },
  { u: 11, x: 1135 },
  { u: Infinity, x: 1090 },
];
export const WAVE_STR_GROWTH_BANDS = [
  { u: 6, x: 1040 },
  { u: 11, x: 1065 },
  { u: Infinity, x: 1135 },
];
export const PERIOD_BANDS = [
  { u: 6, p: 3 },
  { u: Infinity, p: 2 },
];
/** A period-1 wave leaves no turn to attack in, so cadence never drops below 2. */
export const PERIOD_FLOOR = 2;

/** Armored cuts a PROPORTION of every hit, so it survives payout-curve retunes. */
export const ARMOR_CUT_X100 = 35;
export const ARMOR_MIN_DAMAGE = 1;

export const BRUTE_STR_X100 = 180;
export const SWARM_HP_X100 = 35;
export const WARDEN_BLOCK_CAP_X100 = 120;

export const BLOCK_CAP_OF_STRENGTH_X100 = 250;
export const BLOCK_OVERFLOW_X100 = 25;
export const BLOCK_HARD_CAP_OF_STRENGTH_X100 = 700;

export const LEECH_HEAL_X100 = 50;

export const ELITE_HP_X100 = 155;
export const ELITE_STR_X100 = 120;
export const ELITE_HEAVY_EVERY = 3;
export const ELITE_HEAVY_X100 = 150;

export const AFFIX_TABLE = [
  'none',
  'armored',
  'brute',
  'swarm',
  'warden',
  'leech',
] as const;
export const AFFIX_FREE_WAVES = 3;
export const ELITE_EVERY = 5;

export const WAVE_CLEAR_BONUS = 50;
export const COMBO_BONUS = 5;
export const COINS_PER_SCORE = 40;

export const REFILL_WEIGHT = { attack: 85, block: 105, effect: 110 };
export const MAX_DETONATION_STAGES = 8;

export const EFFECT_COLOR: Record<string, string> = {
  attack: '#E75757',
  block: '#4F92F0',
  effect: '#3FAF6E',
};
export const EFFECT_LABEL: Record<string, string> = {
  attack: 'ATK',
  block: 'BLOCK',
  effect: 'HEAL',
};
export const EFFECT_TINTS: Record<string, string[]> = {
  attack: ['#F08686', '#D14141', '#7C2F2F'],
  block: ['#89BCFF', '#3C63FF', '#2B4C86'],
  effect: ['#C5F47D', '#3E9068', '#6FB409'],
};

export const AFFIX_TINT: Record<string, string> = {
  elite: '#FFC24B',
  armored: '#9DB4D4',
  brute: '#FF9EA1',
  swarm: '#8FE3A2',
  warden: '#B79CFF',
  leech: '#FF9EE8',
};
export const AFFIX_BLURB: Record<string, string> = {
  armored: 'Cuts 35% off every attack that lands, however long the link.',
  brute: 'Hits far harder, but winds up a beat longer.',
  swarm:
    'Frail - a much smaller pool, and on early waves it swings a beat sooner too.',
  warden: 'Caps how much block you can hold.',
  leech: 'Halves everything your heal links restore.',
  elite: 'Tougher, stronger, and every third hit is a heavy.',
};

/** SecondaryButton's palette and inset-shadow recipe. */
export const BTN = {
  primary: {
    bg: '#FCE270',
    shadow:
      '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
  },
  secondary: {
    bg: '#B5C0FF',
    shadow:
      '0 -4px 0 0 #7E84E6 inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
  },
  tertiary: {
    bg: '#AEE45D',
    shadow:
      '0 -4px 0 0 rgba(0,0,0,.3) inset, 0 4px 0 0 #FFFFCB inset, 0 2px 0 0 rgba(0,0,0,.25)',
  },
  disabled: {
    bg: '#9BA3AB',
    shadow: '0 -4px 0 0 #6B737A inset, 0 4px 0 0 #FFF inset',
  },
};

/** Clearing a whole location pays a lump on top of the per-wave bonus, so a
 *  battle finished is always worth more than a battle abandoned one wave in. */
export const BATTLE_CLEAR_BONUS = 300;
/** Each step along the map is worth 25% more for the same play. */
export const LOCATION_SCORE_STEP_X100 = 25;
