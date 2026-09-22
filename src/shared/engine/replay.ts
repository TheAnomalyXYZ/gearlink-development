/**
 * Server-side run verification.
 *
 * The client plays locally for responsiveness, then submits the seed, the
 * loadout and the exact move list. This re-runs those moves through the same
 * engine and reports the score it actually produces. Nothing the client says
 * about its own score is trusted - only the seed and the moves are inputs.
 */
import { hasAnyMove } from './board.js';
import {
  FIRST_LOCATION,
  LOCATIONS,
  MAX_ASCENSION,
  locationIndex,
} from './campaign.js';
import { CELLS, MIN_LINK } from './constants.js';
import { MAX_HEART_CONTAINERS } from './hearts.js';
import { loadoutIsLegal } from './gear.js';
import { Run, battleScore, scoreOf } from './run.js';
import type { HeroClass, RunState } from './types.js';

/** A run cannot legitimately outlast this, and an unbounded move list is a
 *  cheap way to burn server time. */
export const MAX_RUN_MOVES = 4000;

export type RunSubmission = {
  seed: number;
  heroClass: HeroClass;
  picked: string[];
  moves: number[][];
  /** The map node fought. Defaults to the first location. */
  locationId?: string;
  /** The ascension the run was played at. The caller checks this against the
   *  profile BEFORE trusting it - here it is only a scaling input. */
  ascension?: number;
  /** Heart containers the hero fought with. Checked against the profile by the
   *  caller for the same reason. */
  hearts?: number;
};

export type ReplayResult =
  | {
      ok: true;
      /** The score the ladder records: raw play, scaled by map depth and
       *  ascension. */
      score: number;
      /** The unscaled figure, for the end screen's own readout. */
      rawScore: number;
      state: RunState;
      /** Why the run stopped, as the replay saw it. */
      ended: 'dead' | 'stuck' | 'ended' | 'won';
      /** True when the location's boss fell, which is what advances the map. */
      won: boolean;
      /** How many waves the battle was planned for. */
      waveCount: number;
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
  const locationId = sub.locationId ?? FIRST_LOCATION;
  if (!LOCATIONS.some((l) => l.id === locationId))
    return { ok: false, reason: 'unknown location' };
  const ascension = sub.ascension ?? 0;
  if (
    !Number.isInteger(ascension) ||
    ascension < 0 ||
    ascension > MAX_ASCENSION
  )
    return { ok: false, reason: 'bad ascension' };
  const hearts = sub.hearts ?? 0;
  if (!Number.isInteger(hearts) || hearts < 0 || hearts > MAX_HEART_CONTAINERS)
    return { ok: false, reason: 'bad hearts' };
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
    locationId,
    ascension,
    hearts,
  });
  let state = run.start();
  let ended: 'dead' | 'stuck' | 'ended' | 'won' = 'ended';

  for (let i = 0; i < sub.moves.length; i++) {
    if (ended !== 'ended') return { ok: false, reason: 'move after run ended' };
    const out = run.step(state, sub.moves[i]!);
    // An illegal move means the client is not replaying the board this engine
    // produced - that is the whole signal, so the run is rejected outright.
    if (!out) return { ok: false, reason: 'illegal move at ' + i };
    state = out.bs;
    if (out.battleWon) ended = 'won';
    else if (out.over) ended = 'dead';
    else if (!hasAnyMove(state.board)) ended = 'stuck';
  }

  const rawScore = scoreOf(state);
  return {
    ok: true,
    score: battleScore(state, locationIndex(locationId), ascension),
    rawScore,
    state,
    ended,
    won: ended === 'won',
    waveCount: run.waveCount,
  };
};
