import assert from 'node:assert/strict';
import test from 'node:test';
import { PLAYER_HP } from './constants.js';
import { defaultLoadout, HERO_CLASSES } from './gear.js';
import {
  HEART_PIECES_PER_CONTAINER,
  HP_PER_HEART_CONTAINER,
  MAX_HEART_CONTAINERS,
  NO_HEARTS,
  canApplyHeart,
  heartPiecesForBoss,
  heartsFor,
  maxHpFor,
  normaliseHearts,
} from './hearts.js';
import { LOCATIONS } from './campaign.js';
import { Run } from './run.js';
import { verifyRun } from './replay.js';

void test('containers raise the pool and stop at the cap', () => {
  assert.equal(maxHpFor(0), PLAYER_HP);
  assert.equal(maxHpFor(1), PLAYER_HP + HP_PER_HEART_CONTAINER);
  assert.equal(
    maxHpFor(MAX_HEART_CONTAINERS),
    PLAYER_HP + MAX_HEART_CONTAINERS * HP_PER_HEART_CONTAINER
  );
  // Past the cap, and below zero, the pool is clamped rather than trusted.
  assert.equal(
    maxHpFor(MAX_HEART_CONTAINERS + 50),
    maxHpFor(MAX_HEART_CONTAINERS)
  );
  assert.equal(maxHpFor(-3), PLAYER_HP);
});

void test('a hero fights with its OWN containers, not the account', () => {
  const hearts = { Hero: 4, Archer: 0, Mage: 1 };
  for (const cls of HERO_CLASSES) {
    const run = new Run({
      seed: 5,
      heroClass: cls,
      picked: defaultLoadout(cls),
      hearts: heartsFor(hearts, cls),
    });
    assert.equal(run.start().playerHp, maxHpFor(hearts[cls]));
    assert.equal(run.maxHp(), maxHpFor(hearts[cls]));
  }
});

void test('glass knight overrides the upgrade rather than scaling with it', () => {
  const run = new Run({
    seed: 5,
    heroClass: 'Hero',
    picked: defaultLoadout('Hero'),
    hearts: MAX_HEART_CONTAINERS,
    mutators: {
      swiftEnemy: false,
      noSupers: false,
      brittleBlock: false,
      chainFrenzy: false,
      glassKnight: true,
    },
  });
  assert.ok(run.maxHp() < PLAYER_HP, 'glass knight stopped being a handicap');
});

void test('a junk or partial hearts record still reads as a legal one', () => {
  assert.deepEqual(normaliseHearts(undefined), NO_HEARTS);
  assert.deepEqual(normaliseHearts({ Hero: 2 }), {
    Hero: 2,
    Archer: 0,
    Mage: 0,
  });
  assert.deepEqual(
    normaliseHearts({ Hero: 999, Archer: -4, Mage: 1.7 } as never),
    { Hero: MAX_HEART_CONTAINERS, Archer: 0, Mage: 1 }
  );
});

void test('three pieces buy a container, and a full hero cannot buy another', () => {
  assert.equal(canApplyHeart(HEART_PIECES_PER_CONTAINER - 1, 0), false);
  assert.equal(canApplyHeart(HEART_PIECES_PER_CONTAINER, 0), true);
  assert.equal(
    canApplyHeart(99, MAX_HEART_CONTAINERS),
    false,
    'a capped hero took another container'
  );
});

void test('deeper bosses drop more pieces, and every location drops at least one', () => {
  const drops = LOCATIONS.map((_, i) => heartPiecesForBoss(i));
  for (const d of drops) assert.ok(d >= 1);
  for (let i = 1; i < drops.length; i++) assert.ok(drops[i]! >= drops[i - 1]!);
  assert.ok(
    drops[drops.length - 1]! > drops[0]!,
    'the Castle drops no more than the first location'
  );
});

void test('a run submitted with more containers than it was played on is refused', () => {
  const picked = defaultLoadout('Hero');
  const sub = {
    seed: 909,
    heroClass: 'Hero' as const,
    picked,
    moves: [],
    locationId: 'forest',
    ascension: 0,
  };
  assert.equal(
    verifyRun({ ...sub, hearts: MAX_HEART_CONTAINERS + 1 }).ok,
    false
  );
  assert.equal(verifyRun({ ...sub, hearts: -1 }).ok, false);
  assert.equal(verifyRun({ ...sub, hearts: 1.5 }).ok, false);
  assert.equal(verifyRun({ ...sub, hearts: 2 }).ok, true);
});

void test('containers change the pool a replay verifies against', () => {
  const picked = defaultLoadout('Hero');
  const cfg = {
    seed: 77,
    heroClass: 'Hero' as const,
    picked,
    locationId: 'forest',
  };
  const plain = new Run(cfg).start();
  const built = new Run({ ...cfg, hearts: 3 }).start();
  assert.equal(built.playerHp - plain.playerHp, 3 * HP_PER_HEART_CONTAINER);
  // The board and the battle plan must NOT move with the upgrade: hearts are
  // read after the RNG stream is spent, so the same seed fights the same fight.
  assert.deepEqual(built.board, plain.board);
  assert.deepEqual(new Run({ ...cfg, hearts: 3 }).plan, new Run(cfg).plan);
});
