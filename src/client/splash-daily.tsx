/**
 * The inline view of an ordinary GearLink post: the day's poster.
 *
 * It sells the day, not the game. The day's foe stands in its own region,
 * lit in that region's colour with light wheeling behind it, over a podium of
 * whoever holds this post's ladder - or three empty seats and a crown nobody
 * has taken yet. A Daily Gauntlet post counts down to the next one.
 *
 * Its own module, like the challenge card, so it renders in a test without the
 * stylesheet the feed entry point imports.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { DailyPoster } from '../shared/api.js';
import { nextGauntletAt } from '../shared/daily.js';
import { MOTION, PIXEL, TITLE } from './splash-style.js';

const HERO_FACE: Record<string, string> = {
  Hero: '/art/NeuraKnights/Characters/Hero_Avatar.png',
  Archer: '/art/NeuraKnights/Characters/Archer_Avatar.png',
  Mage: '/art/NeuraKnights/Characters/Mage_Avatar.png',
};

/** Gold, silver, bronze - as fill and the darker lip under it. */
const MEDAL: [string, string][] = [
  ['#FFD34E', '#B9771B'],
  ['#DCE6F2', '#7D8CA6'],
  ['#F0A066', '#8F4B22'],
];

const STROKE: CSSProperties = {
  WebkitTextStroke: '3px #000',
  paintOrder: 'stroke fill',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Time to the next UTC midnight, ticking. */
const Countdown = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.floor((nextGauntletAt(now) - now) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  return (
    <div
      className="flex items-center gap-1.5"
      style={{ fontSize: 9, color: '#CBD9EC', letterSpacing: '.12em' }}
    >
      <span>NEXT GAUNTLET IN</span>
      <span
        className="px-1.5 py-0.5"
        style={{
          fontFamily: PIXEL,
          fontSize: 12,
          color: '#FFF',
          background: 'rgba(0,0,0,.55)',
          border: '1px solid rgba(255,255,255,.18)',
          borderRadius: 4,
          letterSpacing: '.06em',
        }}
      >
        {pad(h)}:{pad(m)}:{pad(left % 60)}
      </span>
    </div>
  );
};

/** One seat on the podium. First sits tallest, in the middle. */
const Seat = ({
  place,
  row,
}: {
  place: number;
  row: DailyPoster['top'][number] | undefined;
}) => {
  const [fill, lip] = MEDAL[place]!;
  const tall = place === 0;
  return (
    <div
      className={`glk-rise glk-d${place + 2} relative flex min-w-0 flex-1 flex-col items-center`}
    >
      {tall ? (
        <div
          className="glk-float absolute -top-3 z-10 leading-none"
          style={{ fontSize: 14 }}
          aria-hidden="true"
        >
          👑
        </div>
      ) : null}
      <div
        className="relative flex w-full flex-col items-center gap-0.5 px-1 pt-1.5"
        style={{
          height: tall ? 64 : 52,
          borderRadius: '8px 2px 0 0',
          border: '2px solid #000',
          borderBottom: 'none',
          background: row
            ? `linear-gradient(180deg,${fill},${lip})`
            : 'linear-gradient(180deg,rgba(40,52,80,.85),rgba(20,28,46,.85))',
          boxShadow: '0 2px 0 0 rgba(255,255,255,.45) inset',
        }}
      >
        <div
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden"
          style={{
            borderRadius: 4,
            border: '2px solid #000',
            background: row ? '#1B2440' : 'rgba(0,0,0,.35)',
          }}
        >
          {row ? (
            <img
              src={HERO_FACE[row.hero] ?? HERO_FACE.Hero}
              alt={row.hero}
              className="h-full w-full object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <span style={{ fontFamily: PIXEL, fontSize: 11, color: '#7A8BB0' }}>
              ?
            </span>
          )}
        </div>
        <div
          className="max-w-full truncate"
          style={{
            fontSize: 9,
            color: row ? '#1A1206' : '#8A9BBF',
            fontWeight: 700,
          }}
        >
          {row ? 'u/' + row.username : 'open seat'}
        </div>
        {row ? (
          <div
            style={{
              fontFamily: PIXEL,
              fontSize: 11,
              color: '#FFF',
              ...STROKE,
              WebkitTextStroke: '2px #000',
            }}
          >
            {row.score.toLocaleString('en-US')}
          </div>
        ) : null}
        <div
          className="absolute right-1 bottom-0.5"
          style={{
            fontFamily: PIXEL,
            fontSize: 10,
            color: row ? '#000' : '#4A5A80',
            opacity: 0.55,
          }}
        >
          {place + 1}
        </div>
      </div>
    </div>
  );
};

/* The call to action is passed in for the same reason the challenge card's
   is: pressing it is a Devvit host call this module stays clear of. */
export const Daily = ({
  poster,
  cta,
}: {
  poster: DailyPoster;
  cta?: ReactNode;
}) => {
  const [broken, setBroken] = useState(false);
  const { accent } = poster;
  return (
    <div
      className="relative flex h-screen max-h-screen w-full flex-col items-center justify-between overflow-hidden px-4 pt-3 pb-3 text-center"
      style={{
        backgroundColor: '#0B1020',
        backgroundImage: `url(${poster.backdrop})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 60%',
        imageRendering: 'pixelated',
        fontFamily: 'Volter,ui-monospace,monospace',
      }}
    >
      <style>{MOTION}</style>
      {/* Dim the art top and bottom, and pool the region's light in the middle. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 55% at 50% 48%,${accent}33,rgba(8,12,26,0) 60%),linear-gradient(180deg,rgba(8,12,26,.88),rgba(8,12,26,.25) 32%,rgba(8,12,26,.35) 55%,rgba(8,12,26,.97) 82%)`,
        }}
      />

      {/* Banner. */}
      <div className="glk-rise relative z-10 flex shrink-0 items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-1"
          style={{
            border: '2px solid #000',
            borderRadius: '8px 2px 8px 2px',
            background: 'linear-gradient(180deg,#FCE270,#FF961D)',
            boxShadow:
              '0 3px 0 0 rgba(0,0,0,.35), 0 2px 0 0 rgba(255,255,255,.6) inset',
          }}
        >
          <span
            style={{
              ...TITLE,
              color: '#2A1600',
              textShadow: '0 1px 0 rgba(255,255,255,.5)',
              fontSize: 'clamp(12px,3.4vw,16px)',
              letterSpacing: '.08em',
            }}
          >
            {poster.daily ? 'DAILY GAUNTLET' : 'GEARLINK BATTLE'}
          </span>
          {poster.daily ? (
            <span
              className="px-1.5"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#FFF',
                background: '#000',
                borderRadius: 4,
              }}
            >
              No.{poster.day}
            </span>
          ) : null}
        </div>
        <div
          className="px-2 py-1"
          style={{
            fontFamily: PIXEL,
            fontSize: 11,
            color: accent,
            background: 'rgba(0,0,0,.6)',
            border: `2px solid ${accent}`,
            borderRadius: 6,
            letterSpacing: '.06em',
          }}
        >
          {poster.dateLabel}
        </div>
      </div>

      {/* The stage: the day's foe, light wheeling behind it. */}
      <div className="relative flex min-h-0 w-full max-w-[420px] flex-1 flex-col items-center justify-end">
        <div
          className="glk-spin pointer-events-none absolute top-1/2 left-1/2 aspect-square h-[150%] max-h-[420px]"
          style={{
            background: `repeating-conic-gradient(${accent}2e 0deg 10deg,transparent 10deg 30deg)`,
            maskImage: 'radial-gradient(circle,#000 18%,transparent 62%)',
            WebkitMaskImage: 'radial-gradient(circle,#000 18%,transparent 62%)',
          }}
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`glk-mote glk-m${i}`}
            style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
          />
        ))}
        <div className="relative flex min-h-0 w-full flex-1 items-end justify-center">
          <div
            className="absolute bottom-1 left-1/2 h-[12px] w-[46%] -translate-x-1/2"
            style={{
              borderRadius: '50%',
              background: 'rgba(0,0,0,.55)',
              filter: 'blur(3px)',
            }}
          />
          {broken ? null : (
            <img
              src={poster.foeArt}
              alt={poster.foe}
              onError={() => setBroken(true)}
              className="glk-bob relative h-[96%] max-w-[80%] object-contain object-bottom"
              style={{
                imageRendering: 'pixelated',
                filter: `drop-shadow(0 0 14px ${accent}88) drop-shadow(0 6px 8px rgba(0,0,0,.7))`,
              }}
            />
          )}
        </div>
        <div className="glk-pop relative z-10 -mt-1 flex flex-col items-center">
          <div
            style={{
              fontFamily: PIXEL,
              fontSize: 'clamp(18px,5.4vw,28px)',
              color: '#FFF',
              ...STROKE,
              textShadow: `0 0 16px ${accent}`,
              lineHeight: 1.05,
            }}
          >
            {poster.foe.toUpperCase()}
          </div>
          <div style={{ fontSize: 9, color: accent, letterSpacing: '.12em' }}>
            GUARDS THE {poster.region.toUpperCase()} · {poster.tagline}
          </div>
        </div>
      </div>

      {/* The podium: second, first, third. */}
      <div className="relative z-10 mt-2 flex w-full max-w-[360px] shrink-0 flex-col gap-1">
        <div className="flex items-end gap-1">
          <Seat place={1} row={poster.top[1]} />
          <Seat place={0} row={poster.top[0]} />
          <Seat place={2} row={poster.top[2]} />
        </div>
        <div style={{ fontSize: 9, color: '#9DB4D4', letterSpacing: '.08em' }}>
          {poster.players === 0
            ? 'Nobody on the board yet - the first run takes the crown.'
            : poster.players +
              (poster.players === 1 ? ' raider' : ' raiders') +
              ' on this ladder. Knock them off.'}
        </div>
      </div>

      <div className="glk-rise glk-d4 relative z-10 flex shrink-0 flex-col items-center gap-1">
        {cta}
        {poster.daily ? <Countdown /> : null}
      </div>
    </div>
  );
};
