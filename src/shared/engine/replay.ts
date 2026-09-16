/**
 * Server-side run verification.
 *
 * The client plays locally for responsiveness, then submits the seed, the
 * loadout and the exact move list. This re-runs those moves through the same
 * engine and reports the score it actually produces. Nothing the client says
 * about its own score is trusted - only the seed and the moves are inputs.
 */
import { hasAnyMove } from './board.js';
import { CELLS, MIN_LINK } from './constants.js';
import { loadoutIsLegal } from './gear.js';
import { Run, scoreOf } from './run.js';
import type { HeroClass, RunState } from './types.js';

/** A run cannot legitimately outlast this, and an unbounded move list is a
 *  cheap way to burn server time. */
export const MAX_RUN_MOVES = 4000;

export type RunSubmission = {
  seed: number;
  heroClass: HeroClass;
  picked: string[];
  moves: number[][];
};

export type ReplayResult =
  | {
      ok: true;
      score: number;
      state: RunState;
      /** Why the run stopped, as the replay saw it. */
      ended: 'dead' | 'stuck' | 'ended';
    }
  | { ok: false; reason: string };

const isCellList = (m: unknown): m is number[] =>
  Array.isArray(m) &&
  m.length > 0 &&
  m.every((c) => Number.isInteger(c) && c >= 0 && c < CELLS);

export const verifyRun = (sub: RunSubmission): ReplayResult => {
  if (!Number.isInteger(sub.seed) || sub.seed < 0 || sub.seed > 0xffffffff)
    return { ok: false, reason: 'bad seed' };
  if (!loadoutIsLegal(sub.picked, sub.heroClass))
    return { ok: false, reason: 'illegal loadout' };
  if (!Array.isArray(sub.moves)) return { ok: false, reason: 'no moves' };
  if (sub.moves.length > MAX_RUN_MOVES)
    return { ok: false, reason: 'too many moves' };
  for (const m of sub.moves) {
    if (!isCellList(m)) return { ok: false, reason: 'malformed move' };
    if (m.length !== 1 && m.length < MIN_LINK)
      return { ok: false, reason: 'short link' };
  }

  const run = new Run({
    seed: sub.seed,
    heroClass: sub.heroClass,
    picked: sub.picked,
  });
  let state = run.start();
  let ended: 'dead' | 'stuck' | 'ended' = 'ended';

  for (let i = 0; i < sub.moves.length; i++) {
    if (ended !== 'ended') return { ok: false, reason: 'move after run ended' };
    const out = run.step(state, sub.moves[i]!);
    // An illegal move means the client is not replaying the board this engine
    // produced - that is the whole signal, so the run is rejected outright.
    if (!out) return { ok: false, reason: 'illegal move at ' + i };
    state = out.bs;
    if (out.over) ended = 'dead';
    else if (!hasAnyMove(state.board)) ended = 'stuck';
  }

  return { ok: true, score: scoreOf(state), state, ended };
};
