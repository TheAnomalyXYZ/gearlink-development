import {
  CELLS,
  CHAIN_MULT_STEP_X100,
  CHAIN_MULT_X100,
  GRID_COLS,
  GRID_ROWS,
  JUNK_FLAG,
  MIN_LINK,
  SUPER_FLAG,
} from './constants.js';
import type { Mutators } from './types.js';

export const rowOf = (i: number) => Math.floor(i / GRID_COLS);
export const colOf = (i: number) => i % GRID_COLS;

/** An orb's value encodes its type plus two flag bands: +100 is a bomb, >=200
 *  is junk. Junk sits above the super band, so a super test must exclude it. */
export const orbTypeOf = (v: number) => v % SUPER_FLAG;
export const isSuper = (v: number) => v >= SUPER_FLAG && v < JUNK_FLAG;
export const isJunk = (v: number) => v >= JUNK_FLAG;

export const areAdjacent = (a: number, b: number): boolean => {
  const dr = Math.abs(rowOf(a) - rowOf(b));
  const dc = Math.abs(colOf(a) - colOf(b));
  return dr <= 1 && dc <= 1 && dr + dc > 0;
};

export const chainMultX100 = (len: number, m: Mutators): number => {
  if (len < MIN_LINK) return 0;
  const last = CHAIN_MULT_X100.length - 1;
  const base =
    len <= last
      ? CHAIN_MULT_X100[len]!
      : CHAIN_MULT_X100[last]! + CHAIN_MULT_STEP_X100 * (len - last);
  return m.chainFrenzy ? base + 15 : base;
};

export const magnitudeFor = (power: number, len: number, m: Mutators): number =>
  Math.floor((power * chainMultX100(len, m)) / 100);

/** Weighted pick of an orb type. Refill weights bias the board slightly toward
 *  the archetypes that pay less per link. */
export const randOrb = (rng: () => number, weights: number[]): number => {
  let total = 0;
  for (const w of weights) total += w;
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return i;
  }
  return weights.length - 1;
};

export const bombCells = (from: number): number[] => {
  const out: number[] = [];
  const r = rowOf(from);
  const c = colOf(from);
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= GRID_ROWS || cc < 0 || cc >= GRID_COLS) continue;
      out.push(rr * GRID_COLS + cc);
    }
  return out;
};

/** Where a surviving cell ends up after the holes beneath it collapse. */
export const collapseShift = (
  cell: number,
  clearedSet: Set<number>
): number => {
  let below = 0;
  for (let r = rowOf(cell) + 1; r < GRID_ROWS; r++)
    if (clearedSet.has(r * GRID_COLS + colOf(cell))) below++;
  return cell + below * GRID_COLS;
};

export const clearAndCollapse = (
  board: number[],
  cleared: number[],
  rng: () => number,
  weights: number[]
): number[] => {
  const next = board.slice();
  const gone = new Set(cleared);
  for (let c = 0; c < GRID_COLS; c++) {
    const survivors: number[] = [];
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      const i = r * GRID_COLS + c;
      if (!gone.has(i)) survivors.push(next[i]!);
    }
    for (let k = 0; k < GRID_ROWS; k++) {
      const i = (GRID_ROWS - 1 - k) * GRID_COLS + c;
      next[i] = k < survivors.length ? survivors[k]! : randOrb(rng, weights);
    }
  }
  return next;
};

/** Validate a drawn link and return the orb type it is made of, or null. This
 *  is the gate the server leans on: a submitted move that does not describe a
 *  legal contiguous same-colour chain never resolves. */
export const chainType = (board: number[], chain: number[]): number | null => {
  if (!Array.isArray(chain) || chain.length < MIN_LINK) return null;
  const seen = new Set<number>();
  const head = board[chain[0]!];
  if (head == null || isJunk(head)) return null;
  const type = orbTypeOf(head);
  for (let i = 0; i < chain.length; i++) {
    const cell = chain[i]!;
    if (cell < 0 || cell >= CELLS || seen.has(cell)) return null;
    seen.add(cell);
    const v = board[cell];
    if (v == null || isJunk(v) || orbTypeOf(v) !== type) return null;
    if (i > 0 && !areAdjacent(chain[i - 1]!, cell)) return null;
  }
  return type;
};

/** A board with no legal link and no bomb is a dead board - that ends a run. */
export const hasAnyMove = (board: number[]): boolean => {
  for (let i = 0; i < CELLS; i++) {
    const v = board[i];
    if (v != null && isSuper(v)) return true;
  }
  const walk = (path: number[]): boolean => {
    if (path.length >= MIN_LINK) return true;
    const last = path[path.length - 1]!;
    for (let j = 0; j < CELLS; j++) {
      if (path.includes(j) || !areAdjacent(last, j)) continue;
      if (
        isJunk(board[j]!) ||
        orbTypeOf(board[j]!) !== orbTypeOf(board[path[0]!]!)
      )
        continue;
      if (walk(path.concat([j]))) return true;
    }
    return false;
  };
  for (let i = 0; i < CELLS; i++)
    if (!isJunk(board[i]!) && walk([i])) return true;
  return false;
};

/** Per-cell fall distance in ROWS for the post-collapse board, mirroring
 *  clearAndCollapse: a survivor drops by the holes beneath it, and the refill
 *  enters as one rigid stack above the column. Presentation only. */
export const fallDistances = (cleared: number[]): number[] => {
  const dist = new Array<number>(CELLS).fill(0);
  const gone = new Set(cleared);
  for (let c = 0; c < GRID_COLS; c++) {
    let removedBelow = 0;
    const survivors: number[] = [];
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      if (gone.has(r * GRID_COLS + c)) {
        removedBelow++;
        continue;
      }
      survivors.push(removedBelow);
    }
    for (let k = 0; k < survivors.length; k++)
      dist[(GRID_ROWS - 1 - k) * GRID_COLS + c] = survivors[k]!;
    for (let r = 0; r < GRID_ROWS - survivors.length; r++)
      dist[r * GRID_COLS + c] = removedBelow;
  }
  return dist;
};
