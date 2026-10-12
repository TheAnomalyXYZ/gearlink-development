import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVEL_CONFIG, applyXp, bookFor, xpLines, xpToNext } from './level.js';

void test('the curve starts at 100 and climbs 25 a level', () => {
  assert.equal(xpToNext(1), 100);
  assert.equal(xpToNext(10), 325);
});

void test('book grants follow the precedence table', () => {
  assert.equal(bookFor(2), 'base');
  assert.equal(bookFor(3), 'bronze');
  assert.equal(bookFor(5), 'bronze');
  assert.equal(bookFor(10), 'silver');
  assert.equal(bookFor(20), 'silver');
  assert.equal(bookFor(25), 'gold');
  assert.equal(bookFor(50), 'gold');
});

void test('a first clear of three waves pays 150 XP before link bonuses', () => {
  const lines = xpLines({
    won: true,
    wavesCleared: 3,
    firstClear: true,
    bestLink: 5,
  });
  assert.equal(
    lines.reduce((a, l) => a + l.amount, 0),
    150
  );
  // a defeat still moves the bar, and pays no elite or first clear
  const lost = xpLines({
    won: false,
    wavesCleared: 2,
    firstClear: false,
    bestLink: 9,
  });
  assert.deepEqual(
    lost.map((l) => l.label),
    ['WAVES ×2', 'LINK 9']
  );
});

void test('XP rolls over through several levels, one book each', () => {
  const { save, result } = applyXp({ level: 1, xp: 90 }, [
    { label: 'X', amount: 250 },
  ]);
  // 90 + 250 = 340: -100 (L1) -125 (L2) = 115 into level 3 (needs 150)
  assert.deepEqual(save, { level: 3, xp: 115 });
  assert.deepEqual(result.levelUps, [
    { level: 2, book: 'base' },
    { level: 3, book: 'bronze' },
  ]);
  assert.deepEqual(result.before, { level: 1, xpInLevel: 90, xpToNext: 100 });
  assert.deepEqual(result.after, { level: 3, xpInLevel: 115, xpToNext: 150 });
});

void test('the cap holds the bar full', () => {
  const cap = LEVEL_CONFIG.cap;
  const { save, result } = applyXp({ level: cap, xp: 0 }, [
    { label: 'X', amount: 99_999 },
  ]);
  assert.equal(save.level, cap);
  assert.equal(save.xp, xpToNext(cap));
  assert.equal(result.levelUps.length, 0);
});
