/**
 * The inline view of the general GearLink post - the one a sub pins as
 * the place to play from.
 *
 * It belongs to no day, no region and no foe, so it sells the game itself: the
 * three heroes landing full height in the game's own sky, the gear they link
 * spinning in round them, the title dropping in letter by letter with a glint
 * running along it, and light wheeling behind it all.
 *
 * Its own module, like the other feed cards, so it renders in a test without
 * the stylesheet the feed entry point imports.
 */
import type { CSSProperties, ReactNode } from 'react';
import { GENERAL_GEAR, GENERAL_HEROES, MOTION, PIXEL } from './splash-style.js';

/** Where each piece of gear hangs, as % of the gear ring - which is wider
 *  than the heroes' row, so the pieces fill the sky to either side of them
 *  rather than sitting on top of them. Two zig-zag columns of five, one
 *  each side, staggered so neither reads as a grid. */
const GEAR_SPOT: CSSProperties[] = [
  { left: '13%', top: '2%' },
  { right: '13%', top: '0%' },
  { left: '2%', top: '22%' },
  { right: '2%', top: '20%' },
  { left: '13%', top: '42%' },
  { right: '13%', top: '44%' },
  { left: '2%', bottom: '20%' },
  { right: '2%', bottom: '14%' },
  { left: '13%', bottom: '0%' },
  { right: '13%', bottom: '2%' },
];

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
const Stander = ({
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
        width: mid ? '30%' : '24%',
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
          // Capped by the card's height too - and by what the title, the
          // button and their padding leave of it - so a short feed slot
          // still fits all three without a foot on the tagline. The sides
          // stand a head shorter than the middle.
          maxHeight: mid
            ? 'min(46vh,calc(100vh - 240px))'
            : 'min(38vh,calc((100vh - 240px) * .82))',
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
    className="relative flex h-screen max-h-screen w-full flex-col items-center justify-between overflow-hidden px-4 pt-[clamp(20px,7vh,40px)] pb-[clamp(20px,7vh,40px)] text-center"
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
        beams turning opposite ways. The blur takes off whatever edge the
        gradient leaves, and the wheel is big enough to sweep the whole card - the card's own
        edges crop it. The mask cuts out the hot centre behind the heroes and
        lets the beams die off before the corners. */}
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
          fontSize: 'clamp(28px,8.5vw,44px)',
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
        MATCH · LINK · FIGHT
        <span
          className="glk-sheen pointer-events-none absolute inset-y-0 left-0 w-8 -skew-x-12"
          style={{
            background:
              'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.6),rgba(255,255,255,0))',
          }}
        />
      </div>
    </div>

    {/* The stage: three heroes fanned out, gear in orbit. */}
    <div className="relative flex min-h-0 w-full max-w-[400px] flex-1 items-center justify-center py-2">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-[min(150%,100vw)] max-w-[600px] -translate-x-1/2">
        {GENERAL_GEAR.map((g, i) => (
          <span
            key={g}
            className="glk-gear-in absolute h-[clamp(24px,7vw,36px)] w-[clamp(24px,7vw,36px)]"
            style={{ ...GEAR_SPOT[i], animationDelay: `${0.6 + i * 0.07}s` }}
          >
            <img
              src={g}
              alt=""
              className="glk-float h-full w-full object-contain"
              style={{
                imageRendering: 'pixelated',
                animationDelay: `${i * 0.35}s`,
                filter:
                  'drop-shadow(0 0 6px rgba(255,220,120,.6)) drop-shadow(0 3px 0 rgba(0,0,0,.5))',
              }}
            />
          </span>
        ))}
      </div>
      {/* A warm pool of light behind the heroes, breathing. */}
      <div
        className="glk-breathe pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[80%] -translate-x-1/2 -translate-y-1/2"
        style={{
          borderRadius: '50%',
          background:
            'radial-gradient(circle,rgba(255,226,140,.45),rgba(255,190,80,.15) 45%,rgba(255,190,80,0) 70%)',
        }}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
        const tint = MOTE_TINT[i % MOTE_TINT.length] ?? '#FFD34E';
        return (
          <span
            key={i}
            className={`glk-mote glk-m${i}`}
            style={{ background: tint, boxShadow: `0 0 6px ${tint}` }}
          />
        );
      })}
      {/* The row is only as tall as its tallest hero, and that row is what
          gets centred - so the group sits in the middle, feet still level. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex w-full items-end justify-center">
          {GENERAL_HEROES.map((h, i) => (
            <Stander key={h.name} hero={h} i={i} />
          ))}
        </div>
      </div>
    </div>

    <div className="glk-rise glk-d4 relative z-10 flex shrink-0 flex-col items-center gap-1.5">
      <div
        className="max-w-[36ch] text-[11px] leading-snug"
        style={{
          color: '#FFF',
          textShadow: '0 1px 0 #0B2A5C, 0 0 6px #0B2A5C',
        }}
      >
        Pick a hero, link your gear and take down every wave they throw at you.
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
