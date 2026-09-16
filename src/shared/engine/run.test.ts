import assert from 'node:assert/strict';
import test from 'node:test';
import { CELLS, MIN_LINK } from './constants.js';
import { areAdjacent, hasAnyMove, isSuper, orbTypeOf } from './board.js';
import { defaultLoadout, loadoutIsLegal } from './gear.js';
import { Run, scoreOf } from './run.js';
import { verifyRun } from './replay.js';
import type { HeroClass, RunState } from './types.js';

/** Greedy legal move: the longest same-colour chain a short DFS can find, or a
 *  bomb if one is sitting on the board. Enough to drive a real run. */
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

const playOut = (seed: number, cls: HeroClass, maxTurns = 250) => {
  const picked = defaultLoadout(cls);
  const run = new Run({ seed, heroClass: cls, picked });
  let state: RunState = run.start();
  const moves: number[][] = [];
  for (let t = 0; t < maxTurns; t++) {
    const move = anyMove(state.board);
    if (!move) break;
    const out = run.step(state, move);
    assert.ok(
      out,
      'the engine rejected a move it had just dealt the board for'
    );
    moves.push(move);
    state = out.bs;
    if (out.over || !hasAnyMove(state.board)) break;
  }
  return { picked, state, moves };
};

void test('a run plays to a real ending', () => {
  const { state, moves } = playOut(12345, 'Hero');
  assert.ok(moves.length > 5, 'run ended implausibly early');
  assert.ok(state.turnsUsed === moves.length);
  assert.ok(state.wavesCleared >= 1, 'a greedy player should clear wave 1');
  assert.ok(scoreOf(state) > 0);
});

void test('replaying the same seed and moves reproduces the run exactly', () => {
  for (const cls of ['Hero', 'Archer', 'Mage'] as const) {
    const seed = 0xabc0000 + cls.length;
    const { picked, state, moves } = playOut(seed, cls);
    const replay = verifyRun({ seed, heroClass: cls, picked, moves });
    assert.ok(replay.ok, 'server refused a run the client legitimately played');
    assert.equal(replay.score, scoreOf(state));
    assert.deepEqual(replay.state.board, state.board);
    assert.equal(replay.state.wavesCleared, state.wavesCleared);
    assert.equal(replay.state.playerHp, state.playerHp);
  }
});

void test('a tampered transcript is refused', () => {
  const seed = 777;
  const { picked, moves } = playOut(seed, 'Archer');
  assert.ok(moves.length > 3);

  // Same moves, different seed: the board never matches, so a move stops being
  // legal almost immediately.
  const wrongSeed = verifyRun({
    seed: seed + 1,
    heroClass: 'Archer',
    picked,
    moves,
  });
  assert.equal(wrongSeed.ok, false);

  // An invented cell that is not adjacent to its neighbour is not a chain.
  const forged = moves.map((m) => m.slice());
  forged[1] = [0, 1, 2, 29];
  const bad = verifyRun({ seed, heroClass: 'Archer', picked, moves: forged });
  assert.equal(bad.ok, false);

  // Padding the run past the cap is refused before any work is done.
  const huge = verifyRun({
    seed,
    heroClass: 'Archer',
    picked,
    moves: Array.from({ length: 5000 }, () => [0, 1, 2]),
  });
  assert.equal(huge.ok, false);
});

void test('a loadout is five legal pieces of one class, two per archetype at most', () => {
  assert.ok(loadoutIsLegal(defaultLoadout('Mage'), 'Mage'));
  // Right cards, wrong hero.
  assert.equal(loadoutIsLegal(defaultLoadout('Mage'), 'Hero'), false);
  // Three attack weapons is not a legal five.
  const attacks = [
    'Mage-Weapon-Common-Base',
    'Mage-Weapon-Rare-Base',
    'Mage-Weapon-Epic-Base',
    'Mage-Off-Hand-Common-Base',
    'Mage-Chest-Common-Base',
  ];
  assert.equal(loadoutIsLegal(attacks, 'Mage'), false);
  // Duplicates do not fill five slots.
  assert.equal(
    loadoutIsLegal(
      Array.from({ length: 5 }, () => 'Mage-Weapon-Rare-Base'),
      'Mage'
    ),
    false
  );
});

void test('the server will not credit a run whose moves were never legal', () => {
  const picked = defaultLoadout('Hero');
  const bogus = verifyRun({
    seed: 42,
    heroClass: 'Hero',
    picked,
    moves: [[0, 5, 10]],
  });
  assert.equal(bogus.ok, false);
});
