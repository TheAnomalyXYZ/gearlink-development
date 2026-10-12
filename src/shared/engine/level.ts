/**
 * PLAYER LEVEL.
 *
 * XP comes from every location attempt, won or lost, as named lines so the
 * victory screen can show each one arriving. Every level-up grants exactly one
 * book (pack). All numbers are starting values to tune in playtests.
 */

export type BookTier = 'base' | 'bronze' | 'silver' | 'gold';

export const LEVEL_CONFIG = {
  xpRules: { wave: 20, elite: 40, firstClear: 50, link8: 10, link12: 25 },
  levelCurve: { base: 100, step: 25 },
  cap: 50,
  /** Checked in order: a multiple of N grants that tier. */
  levelRewards: [
    [25, 'gold'],
    [10, 'silver'],
    [5, 'bronze'],
  ] as ReadonlyArray<readonly [number, BookTier]>,
  /** The early hook: a first taste of a better book. */
  earlyRewards: { 3: 'bronze' } as Readonly<Record<number, BookTier>>,
};

export type XpLine = { label: string; amount: number };

/** Where the bar stands: the level, XP into it, and XP the level needs. */
export type LevelInfo = { level: number; xpInLevel: number; xpToNext: number };

export type LevelUp = { level: number; book: BookTier };

export type XpResult = {
  lines: XpLine[];
  total: number;
  before: LevelInfo;
  after: LevelInfo;
  /** In order; each one already granted its book to the profile. */
  levelUps: LevelUp[];
};

export type LevelSave = { level: number; xp: number };

export const xpToNext = (level: number): number =>
  LEVEL_CONFIG.levelCurve.base + LEVEL_CONFIG.levelCurve.step * (level - 1);

export const bookFor = (level: number): BookTier => {
  for (const [m, tier] of LEVEL_CONFIG.levelRewards)
    if (level % m === 0) return tier;
  return LEVEL_CONFIG.earlyRewards[level] ?? 'base';
};

export const levelInfoOf = (save: LevelSave): LevelInfo => ({
  level: save.level,
  xpInLevel: save.xp,
  xpToNext: xpToNext(save.level),
});

/** Named XP lines for one location attempt. */
export const xpLines = ({
  won,
  wavesCleared,
  firstClear,
  bestLink,
}: {
  won: boolean;
  wavesCleared: number;
  firstClear: boolean;
  bestLink: number;
}): XpLine[] => {
  const R = LEVEL_CONFIG.xpRules;
  const lines: XpLine[] = [];
  if (wavesCleared > 0)
    lines.push({
      label: 'WAVES ×' + wavesCleared,
      amount: R.wave * wavesCleared,
    });
  if (won) lines.push({ label: 'ELITE DOWN', amount: R.elite });
  if (firstClear) lines.push({ label: 'FIRST CLEAR', amount: R.firstClear });
  if (bestLink >= 12)
    lines.push({ label: 'LINK ' + bestLink, amount: R.link12 });
  else if (bestLink >= 8)
    lines.push({ label: 'LINK ' + bestLink, amount: R.link8 });
  return lines;
};

/** Apply XP to a save; returns the new save and the before/after the UI
 *  animates. Past the cap the bar holds full. */
export const applyXp = (
  save: LevelSave,
  lines: XpLine[]
): { save: LevelSave; result: XpResult } => {
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const before = levelInfoOf(save);
  let level = save.level;
  let xp = save.xp + total;
  const levelUps: LevelUp[] = [];
  while (level < LEVEL_CONFIG.cap && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level++;
    levelUps.push({ level, book: bookFor(level) });
  }
  if (level >= LEVEL_CONFIG.cap) xp = Math.min(xp, xpToNext(level));
  const next = { level, xp };
  return {
    save: next,
    result: { lines, total, before, after: levelInfoOf(next), levelUps },
  };
};
