/**
 * The inline view of the general GearLink post - the one a sub pins as
 * the place to play from.
 *
 * It belongs to no day, no region and no foe, so it sells the game itself -
 * and the game is the puzzle: a live board fills the card, a link tracing
 * through it on a loop, under the title dropping in letter by letter. The
 * three heroes stand in a row beneath it as the ones the links fight for.
 *
 * Its own module, like the other feed cards, so it renders in a test without
 * the stylesheet the feed entry point imports.
 */
import type { CSSProperties, ReactNode } from 'react';
import { BoardSlot, MiniBoard } from './splash-board.js';
import {
  GENERAL_HEROES,
  GENERAL_TILES,
  MOTION,
  PIXEL,
} from './splash-style.js';

/** The two layers of light behind the card - white, and a warm gold that
 *  turns the other way so the two cross and overlap: broad beams that ramp up, hold,
 *  and ramp back down, so there is never a hard line - and dim, so they read
 *  as light in the sky rather than a pattern on top of it. */
const RAYS = [
  {
    cls: 'glk-drift',
    beams:
      'repeating-conic-gradient(rgba(255,255,255,0) 0deg,rgba(255,255,255,.1) 7deg,rgba(255,255,255,.1) 17deg,rgba(255,255,255,0) 24deg,rgba(255,255,255,0) 36deg)',
  },
  {
    cls: 'glk-drift-rev',
    beams:
      'repeating-conic-gradient(from 18deg,rgba(255,206,96,0) 0deg,rgba(255,206,96,.14) 8deg,rgba(255,206,96,.14) 20deg,rgba(255,206,96,0) 28deg,rgba(255,206,96,0) 45deg)',
  },
];

/** Crops the wheel: clear at the very centre, full through the middle of
 *  the card, gone again before it reaches the corners. */
const RAY_MASK =
  'radial-gradient(circle,transparent 3%,#000 12%,#000 26%,transparent 46%)';

/** Where the four-point sparks twinkle in the sky, and when. */
const SPARKS: { at: CSSProperties; size: number; delay: number }[] = [
  { at: { left: '8%', top: '14%' }, size: 10, delay: 0 },
  { at: { right: '10%', top: '10%' }, size: 8, delay: 0.9 },
  { at: { left: '20%', top: '34%' }, size: 6, delay: 1.7 },
  { at: { right: '22%', top: '30%' }, size: 9, delay: 0.4 },
  { at: { left: '6%', top: '58%' }, size: 7, delay: 2.1 },
  { at: { right: '6%', top: '54%' }, size: 10, delay: 1.3 },
  { at: { left: '30%', top: '6%' }, size: 6, delay: 2.6 },
  { at: { right: '32%', top: '4%' }, size: 7, delay: 1.1 },
];

/** Motes rising off the stage, in gold and the heroes' own colours. */
const MOTE_TINT = ['#FFD34E', '#5CC45A', '#FFD34E', '#E8453C', '#8C7CFF'];

const TITLE = 'GEARLINK';

const STROKE: CSSProperties = {
  WebkitTextStroke: '4px #000',
  paintOrder: 'stroke fill',
};

/**
 * One hero, standing. The sprite is a full-body figure on a transparent
 * background, so it is drawn as one - stood on its own shadow, never boxed.
 * The middle one stands in front and a head taller.
 */
export const HeroStander = ({
  hero,
  i,
}: {
  hero: (typeof GENERAL_HEROES)[number];
  i: number;
}) => {
  const mid = i === 1;
  return (
    <div
      className="glk-land relative flex flex-col items-center justify-end"
      style={{
        zIndex: mid ? 2 : 1,
        width: mid ? 'clamp(40px,14vw,72px)' : 'clamp(34px,11vw,58px)',
        // The middle one lands last, as the headline act.
        animationDelay: `${0.25 + (mid ? 0.3 : i * 0.08)}s`,
      }}
    >
      {/* The shadow shrinks as the hero bobs up, on the same beat. */}
      <div className="absolute bottom-0 left-1/2 h-[10px] w-[70%] -translate-x-1/2">
        <div
          className="glk-shadow h-full w-full"
          style={{
            borderRadius: '50%',
            background: 'rgba(10,30,70,.45)',
            filter: 'blur(3px)',
            animationDelay: `${i * 0.45}s`,
          }}
        />
      </div>
      <img
        src={hero.art}
        alt={hero.name}
        className="glk-bob relative w-full object-contain object-bottom"
        style={{
          // Kept small: the board is the headline act, the heroes its cast.
          // The sides stand a head shorter than the middle.
          maxHeight: mid ? 'clamp(34px,13vh,72px)' : 'clamp(28px,11vh,60px)',
          animationDelay: `${i * 0.45}s`,
          imageRendering: 'pixelated',
          filter: `drop-shadow(0 0 10px ${hero.color}99) drop-shadow(0 4px 0 rgba(0,0,0,.35))`,
        }}
      />
    </div>
  );
};

/* The call to action is passed in, as on the other feed cards: pressing it
   is a Devvit host call this module stays clear of. */
export const General = ({ cta }: { cta?: ReactNode }) => (
  <div
    className="relative flex h-screen max-h-screen w-full flex-col items-center gap-1.5 overflow-hidden px-4 pt-[clamp(10px,4vh,28px)] pb-[clamp(10px,4vh,28px)] text-center"
    style={{
      backgroundColor: '#2A7FD0',
      backgroundImage: 'url(/art/PocketKnights/sky_v3.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center bottom',
      fontFamily: 'Volter,ui-monospace,monospace',
    }}
  >
    <style>{MOTION}</style>
    {/* A white flash as the card opens, so it arrives rather than appears. */}
    <div className="glk-flash pointer-events-none absolute inset-0 z-50 bg-white" />
    {/* A soft lift at the bottom so the line and the button read over the
        clouds, without darkening the sky. */}
    <div
      className="absolute inset-x-0 bottom-0 h-[34%]"
      style={{
        background:
          'linear-gradient(180deg,rgba(20,60,130,0),rgba(20,60,130,.55))',
      }}
    />
    {/* Light wheeling slowly behind everything, in two layers of broad soft
        beams turning opposite ways, centred on the board. */}
    {RAYS.map((r) => (
      <div
        key={r.cls}
        className={`${r.cls} pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[max(220vw,220vh)]`}
        style={{
          background: r.beams,
          maskImage: RAY_MASK,
          WebkitMaskImage: RAY_MASK,
          filter: 'blur(6px)',
        }}
      />
    ))}

    {SPARKS.map((p, i) => (
      <span
        key={i}
        className="glk-spark z-[5]"
        style={{
          ...p.at,
          width: p.size,
          height: p.size,
          animationDelay: `${p.delay}s`,
        }}
      />
    ))}

    {/* Title: each letter drops in on its own, then the word waves gently
        and a glint runs along it. */}
    <div className="relative z-10 flex shrink-0 flex-col items-center leading-none">
      <div
        aria-label={TITLE}
        style={{
          fontFamily: PIXEL,
          fontSize: 'clamp(26px,8vw,42px)',
          color: '#FFE16A',
          ...STROKE,
          textShadow: '0 5px 0 #000, 0 0 22px rgba(255,180,60,.55)',
        }}
      >
        {TITLE.split('').map((c, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="glk-letter"
            style={{
              animationDelay: `${i * 0.06}s,${0.8 + i * 0.12}s,${1.2 + i * 0.08}s`,
            }}
          >
            {c}
          </span>
        ))}
      </div>
      <div
        className="glk-sway relative -mt-0.5 overflow-hidden px-2.5 py-0.5"
        style={{
          fontFamily: PIXEL,
          fontSize: 'clamp(10px,3vw,14px)',
          color: '#FFF',
          letterSpacing: '.18em',
          background: 'linear-gradient(180deg,#E8453C,#A81F22)',
          border: '2px solid #000',
          borderRadius: '6px 2px 6px 2px',
          boxShadow: '0 3px 0 0 rgba(0,0,0,.4)',
        }}
      >
        LINK · CHAIN · BREAK
        <span
          className="glk-sheen pointer-events-none absolute inset-y-0 left-0 w-8 -skew-x-12"
          style={{
            background:
              'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.6),rgba(255,255,255,0))',
          }}
        />
      </div>
    </div>

    {/* The puzzle, live. */}
    <BoardSlot className="z-10 my-1 max-w-[440px]">
      <MiniBoard tiles={GENERAL_TILES} seed={0x6e4b} len={6} />
    </BoardSlot>

    {/* The cast the links fight for, feet on one line. */}
    <div className="relative z-10 flex w-full shrink-0 items-end justify-center gap-1 [@media(max-height:360px)]:hidden">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const tint = MOTE_TINT[i % MOTE_TINT.length] ?? '#FFD34E';
        return (
          <span
            key={i}
            className={`glk-mote glk-m${i}`}
            style={{ background: tint, boxShadow: `0 0 6px ${tint}` }}
          />
        );
      })}
      {GENERAL_HEROES.map((h, i) => (
        <HeroStander key={h.name} hero={h} i={i} />
      ))}
    </div>

    <div className="glk-rise glk-d4 relative z-10 flex shrink-0 flex-col items-center gap-1.5">
      <div
        className="max-w-[36ch] text-[11px] leading-snug"
        style={{
          color: '#FFF',
          textShadow: '0 1px 0 #0B2A5C, 0 0 6px #0B2A5C',
        }}
      >
        Drag through 3+ matching gear. Longer chains hit harder.
      </div>
      {/* The button gets a halo pulsing out from behind it and a little
          nudge every few seconds - it is the one thing here to press. */}
      <div className="glk-nudge relative">
        <div
          className="glk-halo pointer-events-none absolute inset-[-6px_-10px]"
          style={{
            borderRadius: 12,
            background:
              'radial-gradient(ellipse at center,rgba(255,226,112,.85),rgba(255,150,29,0) 70%)',
          }}
        />
        {cta}
      </div>
    </div>
  </div>
);
