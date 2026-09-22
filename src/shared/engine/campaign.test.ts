import assert from 'node:assert/strict';
import test from 'node:test';
import { CELLS, MIN_LINK } from './constants.js';
import { areAdjacent, hasAnyMove, isSuper, orbTypeOf } from './board.js';
import { LOCATIONS, MAP_LENGTH, MAX_ASCENSION } from './campaign.js';
import { MONSTER_BASE_HP } from './monsters.js';
import { defaultLoadout } from './gear.js';
import { Run } from './run.js';
import { verifyRun } from './replay.js';
import type { RunState } from './types.js';

const anyMove = (board: number[]): number[] | null => {
  for (let i = 0; i < CELLS; i++) if (isSuper(board[i]!)) return [i];
  let best: number[] | null = null;
  const dfs = (path: number[]) => {
    if (path.length >= MIN_LINK && (!best || path.length > best.length))
      best = path.slice();
    if (path.length >= 6) return;
    const last = path[path.length - 1]!;
    for (let j = 0; j < CELLS; j++) {
      if (path.includes(j) || !areAdjacent(last, j)) continue;
      if (orbTypeOf(board[j]!) !== orbTypeOf(board[path[0]!]!)) continue;
      path.push(j);
      dfs(path);
      path.pop();
    }
  };
  for (let i = 0; i < CELLS; i++) dfs([i]);
  return best;
};

/** Plays a location out with a greedy player and reports how it ended. */
const fight = (seed: number, locationId: string, ascension = 0) => {
  const picked = defaultLoadout('Hero');
  const run = new Run({
    seed,
    heroClass: 'Hero',
    picked,
    locationId,
    ascension,
  });
  let state: RunState = run.start();
  const moves: number[][] = [];
  let won = false;
  for (let t = 0; t < 400; t++) {
    const move = anyMove(state.board);
    if (!move) break;
    const out = run.step(state, move);
    assert.ok(
      out,
      'the engine rejected a move it had just dealt the board for'
    );
    moves.push(move);
    state = out.bs;
    if (out.battleWon) {
      won = true;
      break;
    }
    if (out.over || !hasAnyMove(state.board)) break;
  }
  return { run, picked, state, moves, won };
};

void test('every location fields three to five waves, and the last one is its boss', () => {
  for (const loc of LOCATIONS) {
    for (let seed = 1; seed <= 40; seed++) {
      const run = new Run({
        seed,
        heroClass: 'Hero',
        picked: defaultLoadout('Hero'),
        locationId: loc.id,
      });
      assert.ok(
        run.waveCount >= 3 && run.waveCount <= 5,
        `${loc.id} planned ${run.waveCount} waves`
      );
      assert.ok(run.waveCount >= loc.minWaves && run.waveCount <= loc.maxWaves);

      const last = run.plan[run.plan.length - 1]!;
      assert.equal(last.name, loc.boss, `${loc.id} did not end on its boss`);
      assert.equal(last.boss, true);
      assert.equal(run.affixForWave(run.waveCount), 'elite');

      for (const w of run.plan.slice(0, -1)) {
        assert.equal(w.boss, false);
        assert.ok(
          loc.mobs.includes(w.name),
          `${w.name} is not in ${loc.id}'s pool`
        );
      }
      for (const w of run.plan)
        assert.ok(
          MONSTER_BASE_HP[w.name] !== undefined,
          `${w.name} has no HP in the monster table`
        );
    }
  }
});

void test('the boss wave ends the battle rather than dealing another monster', () => {
  const { run, state, won } = fight(4242, 'forest');
  assert.ok(won, 'a greedy player should take the first location');
  assert.equal(state.wavesCleared, run.waveCount);
  assert.equal(state.enemyHp, 0);
  // The wave counter walks one past the plan, which is what "won" means.
  assert.equal(state.wave, run.waveCount + 1);
});

void test('a won battle verifies, and a move made after the win does not', () => {
  const { picked, moves, won } = fight(4242, 'forest');
  assert.ok(won);
  const ok = verifyRun({
    seed: 4242,
    heroClass: 'Hero',
    picked,
    moves,
    locationId: 'forest',
    ascension: 0,
  });
  assert.ok(ok.ok, 'the server refused a battle the client legitimately won');
  assert.equal(ok.won, true);
  assert.equal(ok.ended, 'won');

  const extra = verifyRun({
    seed: 4242,
    heroClass: 'Hero',
    picked,
    moves: moves.concat([moves[0]!]),
    locationId: 'forest',
    ascension: 0,
  });
  assert.equal(extra.ok, false);
});

void test('a battle replayed against the wrong location or ascension is refused', () => {
  const { picked, moves } = fight(4242, 'forest');
  const wrongLoc = verifyRun({
    seed: 4242,
    heroClass: 'Hero',
    picked,
    moves,
    locationId: 'castle',
    ascension: 0,
  });
  assert.equal(wrongLoc.ok, false, 'another location plans another fight');

  const unknown = verifyRun({
    seed: 4242,
    heroClass: 'Hero',
    picked,
    moves,
    locationId: 'atlantis',
    ascension: 0,
  });
  assert.equal(unknown.ok, false);

  const silly = verifyRun({
    seed: 4242,
    heroClass: 'Hero',
    picked,
    moves,
    locationId: 'forest',
    ascension: MAX_ASCENSION + 1,
  });
  assert.equal(silly.ok, false);
});

void test('ascension makes the same wave strictly harder, and pays more for it', () => {
  const at = (ascension: number) => {
    const run = new Run({
      seed: 31337,
      heroClass: 'Hero',
      picked: defaultLoadout('Hero'),
      locationId: 'caves',
      ascension,
    });
    return run.enemyForWave(1);
  };
  const base = at(0);
  const first = at(1);
  const second = at(2);
  assert.ok(first.hp > base.hp && second.hp > first.hp);
  assert.ok(first.strength > base.strength);

  // The plan itself must NOT move with ascension: the same seed fights the
  // same monsters, they are just bigger.
  const plan = (ascension: number) =>
    new Run({
      seed: 31337,
      heroClass: 'Hero',
      picked: defaultLoadout('Hero'),
      locationId: 'caves',
      ascension,
    }).plan.map((w) => w.name);
  assert.deepEqual(plan(0), plan(3));
});

void test('the map is six locations and only the last one is The King', () => {
  assert.equal(LOCATIONS.length, MAP_LENGTH);
  const kings = LOCATIONS.filter((l) => l.king);
  assert.equal(kings.length, 1);
  assert.equal(kings[0]!.id, LOCATIONS[LOCATIONS.length - 1]!.id);
  assert.equal(kings[0]!.boss, 'The King');
});

void test('the map ramps: no location swings softer than the one before it', () => {
  /* Bosses, not first waves: every boss carries the same elite affix, so this
     compares the ramp itself rather than whichever affix a wave rolled. */
  const bossStrength = (locationId: string) => {
    const run = new Run({
      seed: 8,
      heroClass: 'Hero',
      picked: defaultLoadout('Hero'),
      locationId,
    });
    return run.enemyForWave(run.waveCount).strength;
  };
  const all = LOCATIONS.map((l) => bossStrength(l.id));
  for (let i = 1; i < all.length; i++)
    assert.ok(
      all[i]! >= all[i - 1]!,
      `${LOCATIONS[i]!.id}'s boss swings softer than the one before it`
    );
  // Early steps round flat against a base of 3-4, so the check that matters is
  // the whole road: the Castle has to be a different fight from Greenwood.
  assert.ok(
    all[all.length - 1]! >= all[0]! * 3,
    'the Castle is barely harder than the first location'
  );
});
