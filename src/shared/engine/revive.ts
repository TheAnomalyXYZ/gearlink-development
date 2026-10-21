/**
 * CONTINUE: a defeated hero can buy their way back into the same battle with
 * coins, a few times per battle, each one dearer than the last.
 *
 * A revive is a move like any other as far as the transcript goes - an empty
 * cell list - so the server replays it in place and the board the player saw
 * is the board it scores. It draws nothing off the RNG stream, so a revived
 * run replays exactly like one that was never revived up to that point.
 */

/** What each revive in one battle costs, in order. Its length is the cap. */
export const REVIVE_COSTS = [50, 100, 200];

/** The transcript entry that stands for a revive. */
export const REVIVE_MOVE: number[] = [];

export const isReviveMove = (m: number[]): boolean => m.length === 0;

/** The price of the next revive after `used` of them, or null once the battle
 *  has had all it gets. */
export const reviveCost = (used: number): number | null =>
  REVIVE_COSTS[used] ?? null;

/** How many revives a transcript spends. */
export const revivesIn = (moves: number[][]): number =>
  moves.filter(isReviveMove).length;
