/**
 * The inline view of the general GearLink Battle post - the one a sub pins as
 * the place to play from.
 *
 * It belongs to no day, no region and no foe, so it sells the game itself: the
 * three heroes standing full height in the game's own sky, the gear they link
 * floating round them, and light wheeling behind the title.
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
      className={`glk-rise glk-d${i + 1} relative flex flex-col items-center justify-end`}
      style={{ zIndex: mid ? 2 : 1, width: mid ? '30%' : '24%' }}
    >
      <div
        className="absolute bottom-0 left-1/2 h-[10px] w-[70%] -translate-x-1/2"
        style={{
          borderRadius: '50%',
          background: 'rgba(10,30,70,.45)',
          filter: 'blur(3px)',
        }}
      />
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

    {/* Title. */}
    <div className="glk-pop relative z-10 flex shrink-0 flex-col items-center leading-none">
      <div
        style={{
          fontFamily: PIXEL,
          fontSize: 'clamp(28px,8.5vw,44px)',
          color: '#FFE16A',
          ...STROKE,
          textShadow: '0 5px 0 #000, 0 0 22px rgba(255,180,60,.55)',
        }}
      >
        GEARLINK
      </div>
      <div
        className="-mt-0.5 px-2.5 py-0.5"
        style={{
          fontFamily: PIXEL,
          fontSize: 'clamp(13px,3.8vw,18px)',
          color: '#FFF',
          letterSpacing: '.3em',
          background: 'linear-gradient(180deg,#E8453C,#A81F22)',
          border: '2px solid #000',
          borderRadius: '6px 2px 6px 2px',
          boxShadow: '0 3px 0 0 rgba(0,0,0,.4)',
        }}
      >
        BATTLE
      </div>
    </div>

    {/* The stage: three heroes fanned out, gear in orbit. */}
    <div className="relative flex min-h-0 w-full max-w-[400px] flex-1 items-center justify-center py-2">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-[min(150%,100vw)] max-w-[600px] -translate-x-1/2">
        {GENERAL_GEAR.map((g, i) => (
          <img
            key={g}
            src={g}
            alt=""
            className="glk-float absolute h-[clamp(24px,7vw,36px)] w-[clamp(24px,7vw,36px)] object-contain"
            style={{
              ...GEAR_SPOT[i],
              imageRendering: 'pixelated',
              animationDelay: `${i * 0.35}s`,
              filter:
                'drop-shadow(0 0 6px rgba(255,220,120,.6)) drop-shadow(0 3px 0 rgba(0,0,0,.5))',
            }}
          />
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`glk-mote glk-m${i}`}
          style={{ background: '#FFD34E', boxShadow: '0 0 6px #FFD34E' }}
        />
      ))}
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
        Pick a hero, link your gear, and break every wave they throw at you.
      </div>
      {cta}
    </div>
  </div>
);
