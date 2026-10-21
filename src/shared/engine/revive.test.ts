import assert from 'node:assert/strict';
import test from 'node:test';
import { CELLS, MIN_LINK } from './constants.js';
import { areAdjacent, hasAnyMove, isSuper, orbTypeOf } from './board.js';
import { LOCATIONS } from './campaign.js';
import { defaultLoadout } from './gear.js';
import { verifyRun } from './replay.js';
import { REVIVE_COSTS, REVIVE_MOVE, reviveCost, revivesIn } from './revive.js';
import { Run } from './run.js';
import type { RunState } from './types.js';

/** The shortest legal link on the board - a weak player, so deaths happen. */
const weakMove = (board: number[]): number[] | null => {
  for (let i = 0; i < CELLS; i++) {
    const path = [i];
    for (let j = 0; j < CELLS && path.length < MIN_LINK; j++) {
      const last = path[path.length - 1]!;
      if (path.includes(j) || !areAdjacent(last, j)) continue;
      if (isSuper(board[j]!) || isSuper(board[i]!)) continue;
      if (orbTypeOf(board[j]!) === orbTypeOf(board[i]!)) path.push(j);
    }
    if (path.length >= MIN_LINK) return path;
  }
  for (let i = 0; i < CELLS; i++) if (isSuper(board[i]!)) return [i];
  return null;
};

const picked = defaultLoadout('Hero');
const locationId = LOCATIONS[LOCATIONS.length - 1]!.id;

/** Play weakly until the hero dies, reviving `revives` times along the way.
 *  Null when the seed never produced that many deaths. */
const dieAndRevive = (seed: number, revives: number) => {
  const run = new Run({ seed, heroClass: 'Hero', picked, locationId });
  let state: RunState = run.start();
  const moves: number[][] = [];
  let deaths = 0;
  for (let t = 0; t < 400; t++) {
    const move = weakMove(state.board);
    if (!move) return null;
    const out = run.step(state, move);
    assert.ok(out);
    moves.push(move);
    state = out.bs;
    if (out.battleWon || !hasAnyMove(state.board)) return null;
    if (out.over) {
      deaths++;
      if (deaths > revives) return { run, state, moves };
      moves.push(REVIVE_MOVE);
      state = run.revive(state);
    }
  }
  return null;
};

const findSeed = (revives: number) => {
  for (let seed = 1; seed < 400; seed++) {
    const r = dieAndRevive(seed, revives);
    if (r) return { seed, ...r };
  }
  throw new Error('no seed produced ' + (revives + 1) + ' deaths');
};

void test('revives get dearer and run out', () => {
  assert.equal(reviveCost(0), REVIVE_COSTS[0]);
  for (let i = 1; i < REVIVE_COSTS.length; i++)
    assert.ok(REVIVE_COSTS[i]! > REVIVE_COSTS[i - 1]!);
  assert.equal(reviveCost(REVIVE_COSTS.length), null);
  assert.equal(revivesIn([[1, 2, 3], REVIVE_MOVE, [4], REVIVE_MOVE]), 2);
});

void test('a revive restores full HP and keeps the board and wave', () => {
  const { run, state } = findSeed(0);
  assert.equal(state.playerHp, 0);
  const up = run.revive(state);
  assert.equal(up.playerHp, run.maxHp());
  assert.equal(up.meter, 0);
  assert.deepEqual(up.board, state.board);
  assert.equal(up.wave, state.wave);
  assert.equal(up.enemyHp, state.enemyHp);
});

void test('a revived run replays to the same state and counts its revives', () => {
  const { seed, state, moves } = findSeed(1);
  const replay = verifyRun({
    seed,
    heroClass: 'Hero',
    picked,
    moves,
    locationId,
  });
  assert.ok(replay.ok, replay.ok ? '' : replay.reason);
  assert.equal(replay.revives, 1);
  assert.equal(replay.ended, 'dead');
  assert.deepEqual(replay.state.board, state.board);
  assert.equal(replay.state.damageDealt, state.damageDealt);
});

void test('a revive while alive, or past the cap, is refused', () => {
  const { seed, moves } = findSeed(0);
  const alive = moves.slice();
  alive.splice(1, 0, REVIVE_MOVE);
  const early = verifyRun({
    seed,
    heroClass: 'Hero',
    picked,
    moves: alive,
    locationId,
  });
  assert.equal(early.ok, false);

  // Dead, then revived more times in a row than the cap allows: the extra ones
  // are revives while alive, and refused.
  const spam = verifyRun({
    seed,
    heroClass: 'Hero',
    picked,
    moves: [...moves, REVIVE_MOVE, REVIVE_MOVE],
    locationId,
  });
  assert.equal(spam.ok, false);
});
