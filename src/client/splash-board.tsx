/**
 * The board, as the feed cards draw it.
 *
 * GearLink is a puzzle first: a 6x5 board of gear tiles, and you drag a line
 * through three or more matching ones to fire them. So every post leads with
 * that board - the same tiles, palette and chain line the battle screen uses -
 * and plays one link on a loop: a touch traces the chain, the tiles lift and
 * number themselves, the line draws, they burst and the multiplier pops, then
 * fresh tiles drop into the gap. The heroes, foes and ranks are chrome round it.
 *
 * Pure CSS on a seeded board, so it costs the feed no engine and no timers,
 * renders the same in a test, and stands still - chain lit, line drawn - under
 * reduced motion.
 */
import type { CSSProperties, ReactNode } from 'react';
import {
  CELLS,
  GRID_COLS,
  GRID_ROWS,
  MIN_LINK,
} from '../shared/engine/constants.js';
import { areAdjacent, baseChainMultX100 } from '../shared/engine/board.js';
import { mulberry32 } from '../shared/engine/rng.js';
import { EMPTY_PAL, liftT, paletteFor } from './view/tilePalette.js';
import { PIXEL } from './splash-style.js';

/** One kind of tile on the board: its art, and the archetype that picks its
 *  colour family the way the battle board does. */
export type BoardTile = { icon: string; effect: string };

/** One loop of the demo link, in seconds, and the gap between links. */
export const BOARD_CYCLE_S = 5;
const STEP_S = 0.22;
const STEP_PCT = (STEP_S / BOARD_CYCLE_S) * 100;
/** Where in the loop the first link lifts, and where the chain bursts. */
const LIFT_PCT = 14;
const BURST_PCT = 56;

/* The per-tile beats. Each chain tile runs the same loop, offset by its place
   in the chain, so the links light one after another and the clear ripples
   down the chain the way the battle board's staggered clear does. The resting
   (inline) state is the lit chain, which is what reduced motion is left on. */
export const BOARD_MOTION = `
@keyframes glb-tile{0%,10%{transform:none;opacity:1}${LIFT_PCT}%,50%{transform:var(--lift);opacity:1}${BURST_PCT}%{transform:scale(1.22);opacity:1}64%{transform:scale(0);opacity:0}84%{transform:translateY(-140%);opacity:0}92%{transform:translateY(6%);opacity:1}96%,100%{transform:none;opacity:1}}
@keyframes glb-face{0%,10%{border-color:rgba(0,0,0,.3);box-shadow:none}${LIFT_PCT}%,${BURST_PCT}%{border-color:#FFF;box-shadow:0 0 10px 1px rgba(255,242,176,.7)}64%,100%{border-color:rgba(0,0,0,.3);box-shadow:none}}
@keyframes glb-num{0%,10%{opacity:0}${LIFT_PCT}%,50%{opacity:1}${BURST_PCT}%,100%{opacity:0}}
@keyframes glb-burst{0%,${BURST_PCT + 2}%{opacity:0;transform:translate(-50%,-50%) scale(.4)}${BURST_PCT + 8}%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}${BURST_PCT + 12}%,76%{opacity:1;transform:translate(-50%,-60%) scale(1)}84%,100%{opacity:0;transform:translate(-50%,-90%) scale(1)}}
@keyframes glb-hit{0%,${BURST_PCT + 2}%,${BURST_PCT + 14}%,100%{transform:none;filter:none}${BURST_PCT + 4}%{transform:translateX(-4px);filter:brightness(2.4)}${BURST_PCT + 7}%{transform:translateX(4px);filter:brightness(1.6)}${BURST_PCT + 10}%{transform:translateX(-2px)}}
@keyframes glb-hp{0%,${BURST_PCT + 2}%{width:var(--hp-from)}${BURST_PCT + 8}%,90%{width:var(--hp-to)}96%,100%{width:var(--hp-from)}}
@keyframes glb-dmg{0%,${BURST_PCT + 2}%{opacity:0;transform:translateY(0)}${BURST_PCT + 6}%{opacity:1;transform:translateY(-4px)}74%{opacity:1;transform:translateY(-10px)}82%,100%{opacity:0;transform:translateY(-14px)}}
.glb-tile{animation:glb-tile ${BOARD_CYCLE_S}s linear infinite both}
.glb-face{animation:glb-face ${BOARD_CYCLE_S}s linear infinite both}
.glb-num{animation:glb-num ${BOARD_CYCLE_S}s linear infinite both}
.glb-burst{animation:glb-burst ${BOARD_CYCLE_S}s ease-out infinite both}
.glb-hit{animation:glb-hit ${BOARD_CYCLE_S}s linear infinite both}
.glb-hp{animation:glb-hp ${BOARD_CYCLE_S}s ease-out infinite both}
.glb-dmg{animation:glb-dmg ${BOARD_CYCLE_S}s ease-out infinite both}
@media (prefers-reduced-motion:reduce){
.glb-tile[class],.glb-face[class],.glb-num[class],.glb-line[class],.glb-hand[class],.glb-hit[class],.glb-hp[class],.glb-dmg[class]{animation:none}
.glb-hand,.glb-burst,.glb-dmg{display:none}
}`;

/** The 8 cells round one, the same adjacency the engine links on. */
const around = (i: number): number[] => {
  const out: number[] = [];
  for (let j = 0; j < CELLS; j++) if (areAdjacent(i, j)) out.push(j);
  return out;
};

/**
 * A board with one chain of `len` matching tiles laid through it, from a seed.
 * The chain is a random walk over the engine's 8-way adjacency, so it bends
 * the way a real link does; the cells round it never take the chain's type,
 * so the link the loop plays is the one that reads at a glance.
 */
const demoBoard = (
  seed: number,
  kinds: number,
  len: number
): { board: number[]; chain: number[] } => {
  const rng = mulberry32(seed);
  const want = Math.max(MIN_LINK, Math.min(len, CELLS));
  let chain: number[] = [];
  for (let tries = 0; tries < 24 && chain.length < want; tries++) {
    chain = [Math.floor(rng() * CELLS)];
    while (chain.length < want) {
      const last = chain[chain.length - 1]!;
      const open = around(last).filter((n) => !chain.includes(n));
      if (!open.length) break;
      chain.push(open[Math.floor(rng() * open.length)]!);
    }
  }
  const n = Math.max(1, kinds);
  const type = Math.floor(rng() * n);
  const others = Array.from({ length: n }, (_, k) => k).filter(
    (k) => k !== type || n === 1
  );
  const board = Array.from({ length: CELLS }, (_, i) =>
    chain.includes(i) ? type : others[Math.floor(rng() * others.length)]!
  );
  return { board, chain };
};

/** A cell's centre, as % of the board. */
const centre = (i: number) => ({
  x: (((i % GRID_COLS) + 0.5) / GRID_COLS) * 100,
  y: ((Math.floor(i / GRID_COLS) + 0.5) / GRID_ROWS) * 100,
});

/** The keyframes that follow this one chain: the line drawing itself and the
 *  touch moving cell to cell. Named by `id` so two boards never share them. */
const chainMotion = (id: string, chain: number[]): string => {
  const at = (k: number) => +(LIFT_PCT + k * STEP_PCT).toFixed(2);
  const last = at(chain.length - 1);
  const hand = chain
    .map((c, k) => {
      const p = centre(c);
      return `${at(k)}%{left:${p.x}%;top:${p.y}%;opacity:1}`;
    })
    .join('');
  const first = centre(chain[0]!);
  const end = centre(chain[chain.length - 1]!);
  return `
@keyframes glb-line-${id}{0%,${LIFT_PCT - 2}%{stroke-dashoffset:100;opacity:1}${last}%,50%{stroke-dashoffset:0;opacity:1}${BURST_PCT}%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes glb-hand-${id}{0%,${LIFT_PCT - 4}%{left:${first.x}%;top:${first.y}%;opacity:0}${hand}${+(last + 6).toFixed(2)}%{left:${end.x}%;top:${end.y}%;opacity:0}100%{left:${end.x}%;top:${end.y}%;opacity:0}}
.glb-line-${id}{animation:glb-line-${id} ${BOARD_CYCLE_S}s linear infinite both}
.glb-hand-${id}{animation:glb-hand-${id} ${BOARD_CYCLE_S}s linear infinite both}`;
};

/** Custom properties for an inline style, which React passes straight
 *  through but `CSSProperties` has no names for. */
const cssVars = (v: Record<`--${string}`, string>): CSSProperties => v;

const STROKE: CSSProperties = {
  WebkitTextStroke: '3px #000',
  paintOrder: 'stroke fill',
};

/**
 * The board. It fills the width it is given at the board's own 6:5, so put it
 * in a `BoardSlot` to have it fit whatever height the card leaves.
 *
 * `still` stops the loop with the chain lit, for a day that has closed.
 */
export const MiniBoard = ({
  tiles,
  seed,
  len = 5,
  still = false,
  accent = '#FFD34E',
}: {
  tiles: BoardTile[];
  seed: number;
  len?: number;
  still?: boolean;
  accent?: string;
}) => {
  const { board, chain } = demoBoard(seed, tiles.length, len);
  const pal = paletteFor(tiles);
  const id = (seed >>> 0).toString(36) + chain.length;
  const mult = (baseChainMultX100(chain.length) / 100).toFixed(2);
  const pts = chain
    .map((c) => {
      const p = centre(c);
      return p.x + ',' + p.y;
    })
    .join(' ');
  const end = centre(chain[chain.length - 1]!);
  const anim = (cls: string) => (still ? '' : cls);
  return (
    <div
      className="relative w-full"
      style={{
        aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
        padding: 'clamp(4px,1.4cqw,8px)',
        borderRadius: 12,
        border: '2px solid #000',
        background: 'linear-gradient(180deg,#141D2E,#0B0F1E)',
        boxShadow: `0 4px 0 0 rgba(0,0,0,.45), 0 0 0 2px ${accent}55, 0 0 22px ${accent}33`,
        filter: still ? 'grayscale(.8) brightness(.75)' : 'none',
      }}
    >
      <style>{BOARD_MOTION + chainMotion(id, chain)}</style>
      <div
        className="relative grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS},1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS},1fr)`,
          gap: 'clamp(2px,.9cqw,5px)',
        }}
      >
        {board.map((type, i) => {
          const k = chain.indexOf(i);
          const linked = k >= 0;
          const p = pal[type] ?? EMPTY_PAL;
          const tile = tiles[type];
          const delay = linked ? { animationDelay: `${k * STEP_S}s` } : {};
          return (
            <div
              key={i}
              className={`relative min-h-0 ${linked ? anim('glb-tile') : ''}`}
              style={{
                zIndex: linked ? 2 : 1,
                ...(linked
                  ? { transform: liftT(i), ...cssVars({ '--lift': liftT(i) }) }
                  : {}),
                ...delay,
              }}
            >
              <div
                className={`absolute inset-0 ${linked ? anim('glb-face') : ''}`}
                style={{
                  borderRadius: 'clamp(4px,1.4cqw,8px)',
                  border: `2px solid ${linked ? '#FFF' : 'rgba(0,0,0,.3)'}`,
                  background: `linear-gradient(180deg,${p.top} 0 22%,${p.face} 22%)`,
                  boxShadow: `inset 0 -3px 0 0 ${p.lip}`,
                  ...delay,
                }}
              />
              {tile ? (
                <img
                  src={tile.icon}
                  alt=""
                  className="absolute object-contain"
                  style={{
                    inset: '14%',
                    width: '72%',
                    height: '72%',
                    imageRendering: 'pixelated',
                    filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.45))',
                  }}
                />
              ) : null}
              {linked ? (
                <span
                  className={`absolute top-px left-[3px] leading-none ${anim('glb-num')}`}
                  style={{
                    fontFamily: PIXEL,
                    fontSize: 'clamp(7px,2cqw,10px)',
                    color: '#FFF',
                    textShadow: '0 1px 0 #000',
                    ...delay,
                  }}
                >
                  {k + 1}
                </span>
              ) : null}
            </div>
          );
        })}
        {/* The chain line, over the tiles, like the battle board's. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
        >
          <polyline
            points={pts}
            pathLength={100}
            className={'glb-line ' + anim('glb-line-' + id)}
            fill="none"
            stroke="#FFF2B0"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="100"
            vectorEffect="non-scaling-stroke"
            style={{
              filter: 'drop-shadow(0 0 3px #FFB84D)',
              strokeWidth: 'clamp(3px,1.2cqw,6px)',
            }}
          />
        </svg>
        {/* The touch tracing the chain. */}
        {still ? null : (
          <span
            className={`glb-hand glb-hand-${id} pointer-events-none absolute z-[4] -translate-x-1/2 -translate-y-1/2`}
            style={{
              width: 'clamp(14px,5cqw,26px)',
              height: 'clamp(14px,5cqw,26px)',
              borderRadius: '50%',
              background:
                'radial-gradient(circle,rgba(255,255,255,.95) 0 30%,rgba(255,242,176,.5) 45%,rgba(255,242,176,0) 70%)',
              boxShadow: '0 0 0 2px rgba(255,255,255,.7)',
              opacity: 0,
            }}
          />
        )}
        {/* The multiplier the link pays, popping off its last tile. */}
        {still ? null : (
          <div
            className="glb-burst pointer-events-none absolute z-[5] flex flex-col items-center leading-none whitespace-nowrap"
            style={{ left: `${end.x}%`, top: `${end.y}%` }}
          >
            <span
              style={{
                fontFamily: PIXEL,
                fontSize: 'clamp(16px,6cqw,28px)',
                color: '#FFE16A',
                ...STROKE,
                textShadow: '0 0 12px rgba(255,180,60,.9)',
              }}
            >
              ×{mult}
            </span>
            <span
              style={{
                fontFamily: PIXEL,
                fontSize: 'clamp(8px,2.6cqw,12px)',
                color: '#FFF',
                ...STROKE,
                WebkitTextStroke: '2px #000',
              }}
            >
              {chain.length}-LINK
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Room for the board: takes whatever height the card leaves it and draws the
 * board as large as fits there at 6:5, centred.
 */
export const BoardSlot = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`relative min-h-0 w-full flex-1 ${className}`}
    style={{ containerType: 'size' }}
  >
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: `min(100cqw, ${(GRID_COLS / GRID_ROWS) * 100}cqh)` }}
    >
      {children}
    </div>
  </div>
);

/**
 * A foe's health, ticking down each time the loop's link lands and refilling
 * as the next wave walks in - the RPG half answering the puzzle half.
 */
export const HitBar = ({
  from = 100,
  to = 62,
  color = '#E8453C',
  hit,
}: {
  from?: number;
  to?: number;
  color?: string;
  hit?: string;
}) => (
  <div className="relative w-full">
    <div
      className="h-[7px] w-full overflow-hidden"
      style={{
        border: '2px solid #000',
        borderRadius: 4,
        background: '#2A1218',
        boxSizing: 'content-box',
      }}
    >
      <div
        className="glb-hp h-full"
        style={{
          width: `${to}%`,
          ...cssVars({ '--hp-from': `${from}%`, '--hp-to': `${to}%` }),
          background: `linear-gradient(180deg,${color},${color}AA)`,
        }}
      />
    </div>
    {hit ? (
      <span
        className="glb-dmg absolute -top-3 right-0 leading-none"
        style={{
          fontFamily: PIXEL,
          fontSize: 11,
          color: '#FFF',
          ...STROKE,
          WebkitTextStroke: '2px #000',
          opacity: 0,
        }}
      >
        {hit}
      </span>
    ) : null}
  </div>
);
