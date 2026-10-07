/**
 * The inline view of a Daily Battle post: the day's poster.
 *
 * It sells the race for the crown, not the foe. Whoever holds this post's
 * ladder stands centre stage on a podium - the champion lit by wheeling light
 * and a crown - while the day's foe looms behind them in its region's colour.
 * Before anyone has run it is three open seats and a crown nobody holds yet.
 *
 * A post outlives its day. Once the UTC midnight after it passes, the poster
 * turns to final standings: the stage goes grey, a stamp closes the banner, the
 * champion gets confetti and the countdown gives way to the closing line.
 *
 * Its own module, like the challenge card, so it renders in a test without the
 * stylesheet the feed entry point imports.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { DailyPoster } from '../shared/api.js';
import { MOTION, PIXEL, TITLE } from './splash-style.js';

/** Reddit's plain snoo, for a player with no snoovatar - the podium seats
 *  redditors, so it never falls back to the game's class art. */
const SNOO = '/avatars/snoo-default.png';

/** Gold, silver, bronze - as fill and the darker lip under it. */
const MEDAL: [string, string][] = [
  ['#FFD34E', '#B9771B'],
  ['#DCE6F2', '#7D8CA6'],
  ['#F0A066', '#8F4B22'],
];

/** Avatar and pedestal sizes per place. They follow the card's height, so a
 *  short feed card squeezes the podium rather than clipping it. */
const AVATAR = [
  'clamp(40px,14vh,68px)',
  'clamp(30px,10vh,48px)',
  'clamp(30px,10vh,48px)',
];
const PEDESTAL = [
  'clamp(30px,10vh,50px)',
  'clamp(20px,6.5vh,34px)',
  'clamp(14px,4.5vh,24px)',
];

const RED = '#FF5A4E';

const STROKE: CSSProperties = {
  WebkitTextStroke: '3px #000',
  paintOrder: 'stroke fill',
};

/* The poster's own motion, on top of the shared feed motion. Decoration only,
   so it all stops under reduced motion like the rest. */
const DAILY_MOTION = `
@keyframes dly-grow{0%{transform:scaleY(0)}100%{transform:scaleY(1)}}
@keyframes dly-seat{0%{opacity:0;transform:translateY(-18px) scale(.8)}70%{opacity:1;transform:translateY(2px) scale(1.05)}100%{opacity:1;transform:none}}
@keyframes dly-tick{0%{opacity:0;transform:translateY(-55%)}100%{opacity:1;transform:none}}
@keyframes dly-urgent{0%,100%{box-shadow:0 0 0 0 rgba(255,90,78,0),0 3px 0 0 rgba(0,0,0,.4)}50%{box-shadow:0 0 14px 2px rgba(255,90,78,.6),0 3px 0 0 rgba(0,0,0,.4)}}
@keyframes dly-stamp{0%{opacity:0;transform:rotate(-12deg) scale(2.6)}60%{opacity:1;transform:rotate(-12deg) scale(.9)}100%{opacity:1;transform:rotate(-12deg) scale(1)}}
@keyframes dly-fall{0%{opacity:0;transform:translateY(-12px) rotate(0)}8%{opacity:1}100%{opacity:.8;transform:translateY(105vh) rotate(620deg)}}
@keyframes dly-unfurl{0%{opacity:0;transform:scaleX(.15)}100%{opacity:1;transform:scaleX(1)}}
@keyframes dly-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.dly-grow{transform-origin:bottom;animation:dly-grow .5s cubic-bezier(.2,1.3,.4,1) both}
.dly-seat{animation:dly-seat .6s cubic-bezier(.2,1.4,.4,1) both}
.dly-tick{display:inline-block;animation:dly-tick .28s ease-out both}
.dly-urgent{animation:dly-urgent 1s ease-in-out infinite}
.dly-stamp{animation:dly-stamp .5s cubic-bezier(.3,1.4,.5,1) .6s both}
.dly-unfurl{animation:dly-unfurl .55s cubic-bezier(.2,1.3,.4,1) both}
.dly-pulse{animation:dly-pulse 2.4s ease-in-out infinite}
.dly-confetti{position:absolute;top:0;width:5px;height:9px;pointer-events:none;opacity:0;animation:dly-fall linear infinite}
@media (prefers-reduced-motion:reduce){
.dly-grow,.dly-seat,.dly-tick,.dly-urgent,.dly-stamp,.dly-unfurl,.dly-pulse{animation:none}
.dly-confetti{display:none}
}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** The clock, ticking each second until `until` and then standing still. */
const useNow = (until: number, start?: number) => {
  const [now, setNow] = useState(() => start ?? Date.now());
  const done = now >= until;
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [done]);
  return now;
};

/** One block of the countdown. The digits are keyed by value so each change
 *  drops in fresh. */
const Unit = ({
  value,
  unit,
  urgent,
}: {
  value: string;
  unit: string;
  urgent: boolean;
}) => (
  <div className="flex flex-col items-center">
    <div
      className="flex items-center justify-center overflow-hidden px-1"
      style={{
        minWidth: 'clamp(26px,8vw,34px)',
        height: 'clamp(22px,7vh,30px)',
        background: 'linear-gradient(180deg,#1C2540,#0A0F1E)',
        border: `2px solid ${urgent ? RED : '#000'}`,
        borderRadius: 5,
        boxShadow: '0 2px 0 0 rgba(255,255,255,.12) inset',
      }}
    >
      <span
        key={value}
        className="dly-tick"
        style={{
          fontFamily: PIXEL,
          fontSize: 'clamp(15px,4.6vw,20px)',
          color: urgent ? '#FFD2CC' : '#FFF',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
    <span
      style={{
        fontSize: 7,
        color: '#8FA3C4',
        letterSpacing: '.14em',
        marginTop: 1,
      }}
    >
      {unit}
    </span>
  </div>
);

const Colon = () => (
  <span
    className="glk-blink self-start"
    style={{
      fontFamily: PIXEL,
      fontSize: 16,
      color: '#FFF',
      lineHeight: '26px',
    }}
  >
    :
  </span>
);

/** Time left on this post's battle, as a scoreboard clock. The last hour
 *  turns it red and sets it pulsing. */
const Countdown = ({ left }: { left: number }) => {
  const urgent = left < 3600;
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 ${urgent ? 'dly-urgent' : ''}`}
      style={{
        background: 'rgba(6,10,22,.82)',
        border: `2px solid ${urgent ? RED : '#000'}`,
        borderRadius: '8px 2px 8px 2px',
        boxShadow: '0 3px 0 0 rgba(0,0,0,.4)',
      }}
    >
      <div className="flex flex-col items-start leading-tight">
        <span
          style={{
            fontSize: 8,
            color: urgent ? RED : '#9DB4D4',
            letterSpacing: '.14em',
          }}
        >
          {urgent ? 'FINAL HOUR' : 'BATTLE'}
        </span>
        <span
          style={{
            fontSize: 8,
            color: urgent ? '#FFD2CC' : '#FFF',
            letterSpacing: '.14em',
          }}
        >
          ENDS IN
        </span>
      </div>
      <div className="flex items-start gap-0.5">
        <Unit value={pad(Math.floor(left / 3600))} unit="HRS" urgent={urgent} />
        <Colon />
        <Unit
          value={pad(Math.floor((left % 3600) / 60))}
          unit="MIN"
          urgent={urgent}
        />
        <Colon />
        <Unit value={pad(left % 60)} unit="SEC" urgent={urgent} />
      </div>
    </div>
  );
};

/** One swallowtail end of the banner ribbon. */
const Tail = ({ side, fill }: { side: 'l' | 'r'; fill: string }) => (
  <div
    className="relative top-1.5 shrink-0"
    style={{
      width: 20,
      height: 'clamp(22px,6.5vh,28px)',
      background: fill,
      border: '2px solid #000',
      [side === 'l' ? 'marginRight' : 'marginLeft']: -8,
      clipPath:
        side === 'l'
          ? 'polygon(0 0,100% 0,100% 100%,0 100%,40% 50%)'
          : 'polygon(0 0,100% 0,60% 50%,100% 100%,0 100%)',
    }}
  />
);

/** The ribbon across the top: title, then the day it belongs to. A closed day
 *  goes steel grey and takes an ENDED stamp. */
const Banner = ({ poster, ended }: { poster: DailyPoster; ended: boolean }) => {
  const [fill, lip] = ended ? ['#D4DCE8', '#6F7C94'] : ['#FCE270', '#FF961D'];
  return (
    <div className="relative z-10 flex shrink-0 flex-col items-center">
      <div className="dly-unfurl relative flex items-start">
        <Tail side="l" fill={lip} />
        <div
          className="relative z-10 flex items-center gap-2 overflow-hidden px-4 py-1"
          style={{
            border: '2px solid #000',
            borderRadius: 3,
            background: `linear-gradient(180deg,${fill},${lip})`,
            boxShadow:
              '0 3px 0 0 rgba(0,0,0,.35), 0 2px 0 0 rgba(255,255,255,.65) inset',
          }}
        >
          <span style={{ fontSize: 9, color: '#2A1600', opacity: 0.6 }}>✦</span>
          <span
            style={{
              ...TITLE,
              color: '#2A1600',
              textShadow: '0 1px 0 rgba(255,255,255,.55)',
              fontSize: 'clamp(14px,4.2vw,20px)',
              letterSpacing: '.1em',
            }}
          >
            DAILY BATTLE
          </span>
          <span style={{ fontSize: 9, color: '#2A1600', opacity: 0.6 }}>✦</span>
          {ended ? null : (
            <span
              className="glk-sheen pointer-events-none absolute inset-y-0 left-0 w-8 -skew-x-12"
              style={{
                background:
                  'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.8),rgba(255,255,255,0))',
              }}
            />
          )}
        </div>
        <Tail side="r" fill={lip} />
        {ended ? (
          <div
            className="dly-stamp absolute -top-1.5 -right-7 z-20 px-1.5"
            style={{
              fontFamily: PIXEL,
              fontSize: 12,
              color: RED,
              border: `2px solid ${RED}`,
              borderRadius: 4,
              background: 'rgba(20,6,6,.85)',
              letterSpacing: '.1em',
              boxShadow: `0 0 10px ${RED}66`,
              transform: 'rotate(-12deg)',
            }}
          >
            ENDED
          </div>
        ) : null}
      </div>
      <div
        className="glk-rise glk-d2 relative z-20 mt-2 flex items-center gap-1.5 px-2.5"
        style={{
          fontFamily: PIXEL,
          fontSize: 11,
          lineHeight: '18px',
          color: ended ? '#C9D3E3' : poster.accent,
          background: 'rgba(6,10,22,.85)',
          border: `2px solid ${ended ? '#6F7C94' : poster.accent}`,
          borderRadius: 999,
          letterSpacing: '.1em',
        }}
      >
        <span style={{ color: '#FFF' }}>{poster.weekday}</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{poster.dateLabel}</span>
      </div>
    </div>
  );
};

/** One seat on the podium: the redditor standing on top of their pedestal.
 *  First sits tallest, in the middle, under the crown and the light. */
const Seat = ({
  place,
  row,
  ended,
}: {
  place: number;
  row: DailyPoster['top'][number] | undefined;
  ended: boolean;
}) => {
  const [broken, setBroken] = useState(false);
  const [fill, lip] = MEDAL[place]!;
  const first = place === 0;
  /* Pedestals rise third, second, first; each redditor drops on after. */
  const grow = [0.45, 0.3, 0.15][place]!;
  return (
    <div
      className={`relative flex min-w-0 flex-col items-center ${first ? 'z-10' : ''}`}
      style={{ flex: first ? 1.3 : 1 }}
    >
      <div
        className="dly-seat relative flex w-full min-w-0 flex-col items-center pb-1"
        style={{ animationDelay: grow + 0.35 + 's' }}
      >
        <div
          className="relative"
          style={{ width: AVATAR[place], height: AVATAR[place] }}
        >
          {first && row ? (
            <>
              <div
                className="glk-spin pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[220%]"
                style={{
                  background:
                    'repeating-conic-gradient(#FFD34E55 0deg 9deg,transparent 9deg 24deg)',
                  maskImage: 'radial-gradient(circle,#000 22%,transparent 66%)',
                  WebkitMaskImage:
                    'radial-gradient(circle,#000 22%,transparent 66%)',
                }}
              />
              <div
                className="glk-halo pointer-events-none absolute -inset-1"
                style={{ border: `2px solid ${fill}`, borderRadius: 12 }}
              />
              <span
                className="glk-spark"
                style={{ width: 9, height: 9, top: -4, left: -10 }}
              />
              <span
                className="glk-spark"
                style={{
                  width: 7,
                  height: 7,
                  top: '40%',
                  right: -12,
                  animationDelay: '.8s',
                }}
              />
              <span
                className="glk-spark"
                style={{
                  width: 6,
                  height: 6,
                  bottom: 2,
                  left: -12,
                  animationDelay: '1.6s',
                }}
              />
            </>
          ) : null}
          {first ? (
            <div
              className="glk-float absolute top-[-0.85em] left-1/2 z-20 ml-[-0.5em] leading-none"
              style={{
                fontSize: 'clamp(14px,4.5vh,22px)',
                filter: row
                  ? 'drop-shadow(0 0 6px #FFD34E)'
                  : 'grayscale(1) opacity(.55)',
              }}
              aria-hidden="true"
            >
              👑
            </div>
          ) : null}
          {first && ended && row ? (
            <div
              className="absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 px-1.5 whitespace-nowrap"
              style={{
                fontFamily: PIXEL,
                fontSize: 9,
                color: '#2A1600',
                background: 'linear-gradient(180deg,#FFE88A,#FFB627)',
                border: '2px solid #000',
                borderRadius: 3,
                letterSpacing: '.12em',
              }}
            >
              CHAMPION
            </div>
          ) : null}
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            style={{
              borderRadius: 10,
              border: row
                ? '3px solid #000'
                : '2px dashed rgba(160,180,215,.55)',
              outline: row ? `2px solid ${fill}` : 'none',
              background: row
                ? `radial-gradient(circle at 50% 35%,${fill}aa,#1B2440 75%)`
                : 'rgba(6,10,22,.6)',
              boxShadow: row ? `0 0 ${first ? 18 : 8}px ${fill}88` : 'none',
            }}
          >
            {row ? (
              <img
                src={broken || !row.avatar ? SNOO : row.avatar}
                alt={row.username}
                onError={() => setBroken(true)}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <span
                className="glk-blink"
                style={{
                  fontFamily: PIXEL,
                  fontSize: first ? 22 : 16,
                  color: '#7A8BB0',
                }}
              >
                ?
              </span>
            )}
          </div>
        </div>
        <div
          className={`${first && ended && row ? 'mt-3' : 'mt-1'} max-w-full truncate px-1.5`}
          style={{
            fontSize: first ? 10 : 9,
            fontWeight: 700,
            color: row ? '#FFF' : '#8A9BBF',
            background: row ? 'rgba(0,0,0,.6)' : 'transparent',
            borderRadius: 4,
            textTransform: row ? 'none' : 'uppercase',
            letterSpacing: row ? 0 : '.1em',
          }}
        >
          {row ? 'u/' + row.username : 'open seat'}
        </div>
        {row ? (
          <div
            style={{
              fontFamily: PIXEL,
              fontSize: first ? 'clamp(13px,4vw,18px)' : 12,
              color: fill,
              ...STROKE,
              lineHeight: 1.15,
            }}
          >
            {row.score.toLocaleString('en-US')}
          </div>
        ) : null}
      </div>
      <div
        className="dly-grow relative flex w-full items-center justify-center"
        style={{
          height: PEDESTAL[place],
          animationDelay: grow + 's',
          border: '2px solid #000',
          borderBottom: 'none',
          borderRadius: '4px 4px 0 0',
          background: `linear-gradient(180deg,${fill} 0 5px,${lip} 5px 8px,#2B3556 8px,#141A2E)`,
          boxShadow:
            '1px 0 0 0 rgba(255,255,255,.12) inset, -3px 0 0 0 rgba(0,0,0,.3) inset',
          opacity: row ? 1 : 0.6,
        }}
      >
        <span
          style={{
            fontFamily: PIXEL,
            fontSize: first ? 'clamp(14px,5vh,24px)' : 'clamp(11px,3.5vh,16px)',
            color: fill,
            ...STROKE,
            WebkitTextStroke: '2px #000',
            marginTop: 6,
          }}
        >
          {place + 1}
        </span>
      </div>
    </div>
  );
};

/** Confetti over a closed day's champion. Fixed positions so the poster
 *  renders the same on the server as in the feed. */
const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
  left: ((i * 37) % 96) + 2 + '%',
  delay: ((i * 0.61) % 4).toFixed(2) + 's',
  duration: (3.6 + ((i * 0.43) % 2)).toFixed(2) + 's',
  color: ['#FFD34E', '#DCE6F2', '#F0A066', '#FF6E9C', '#62D6E8'][i % 5]!,
}));

/* The call to action is passed in for the same reason the challenge card's
   is: pressing it is a Devvit host call this module stays clear of. A closed
   day takes its own, quieter one. `now` pins the clock for a render test. */
export const Daily = ({
  poster,
  cta,
  endedCta,
  now: start,
}: {
  poster: DailyPoster;
  cta?: ReactNode;
  endedCta?: ReactNode;
  now?: number;
}) => {
  const [broken, setBroken] = useState(false);
  const now = useNow(poster.endsAt, start);
  const ended = now >= poster.endsAt;
  const left = Math.max(0, Math.floor((poster.endsAt - now) / 1000));
  const accent = ended ? '#9AA6BD' : poster.accent;
  const champ = poster.top[0];
  const raiders =
    poster.players + (poster.players === 1 ? ' raider' : ' raiders');
  return (
    <div
      className="relative flex h-screen max-h-screen w-full flex-col items-center justify-between gap-1 overflow-hidden px-4 pt-3 pb-3 text-center"
      style={{
        backgroundColor: '#0B1020',
        fontFamily: 'Volter,ui-monospace,monospace',
      }}
    >
      <style>{MOTION + DAILY_MOTION}</style>
      {/* The region's stage; drained of colour once the day is done. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${poster.backdrop})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
          imageRendering: 'pixelated',
          filter: ended ? 'grayscale(.85) brightness(.6)' : 'none',
          transition: 'filter 1.2s ease',
        }}
      />
      {/* Dim the art top and bottom, and pool light where the podium stands. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60% 45% at 50% 62%,${accent}30,rgba(8,12,26,0) 70%),linear-gradient(180deg,rgba(8,12,26,.9),rgba(8,12,26,.3) 26%,rgba(8,12,26,.4) 50%,rgba(8,12,26,.97) 84%)`,
        }}
      />
      {ended && champ
        ? CONFETTI.map((c, i) => (
            <span
              key={i}
              className="dly-confetti"
              style={{
                left: c.left,
                background: c.color,
                animationDelay: c.delay,
                animationDuration: c.duration,
              }}
            />
          ))
        : null}

      <Banner poster={poster} ended={ended} />

      {/* The stage: the foe in its own space up top, the podium below it.
          A short card drops the foe so the podium keeps its room. */}
      <div className="relative flex min-h-0 w-full max-w-110 flex-1 flex-col">
        <div className="pointer-events-none relative flex min-h-0 flex-1 flex-col items-center [@media(max-height:420px)]:hidden">
          <div className="relative flex min-h-0 w-full flex-1 items-end justify-center pb-1">
            <div
              className="glk-spin absolute top-1/2 left-1/2 aspect-square h-[170%]"
              style={{
                background: `repeating-conic-gradient(${accent}22 0deg 10deg,transparent 10deg 30deg)`,
                maskImage: 'radial-gradient(circle,#000 15%,transparent 60%)',
                WebkitMaskImage:
                  'radial-gradient(circle,#000 15%,transparent 60%)',
                animationPlayState: ended ? 'paused' : 'running',
              }}
            />
            <div
              className="absolute bottom-0 left-1/2 h-2.5 w-[26%] -translate-x-1/2"
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
                className={`${ended ? '' : 'glk-bob'} relative h-full max-h-40 max-w-[60%] object-contain object-bottom`}
                style={{
                  imageRendering: 'pixelated',
                  opacity: ended ? 0.5 : 1,
                  filter: ended
                    ? 'grayscale(1) brightness(.55)'
                    : `drop-shadow(0 0 12px ${accent}88) drop-shadow(0 4px 6px rgba(0,0,0,.7))`,
                }}
              />
            )}
            {ended
              ? null
              : [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span
                    key={i}
                    className={`glk-mote glk-m${i}`}
                    style={{
                      background: accent,
                      boxShadow: `0 0 6px ${accent}`,
                    }}
                  />
                ))}
          </div>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-95 shrink-0 flex-col pt-5">
          <div className="flex items-end gap-1.5 px-1">
            <Seat place={1} row={poster.top[1]} ended={ended} />
            <Seat place={0} row={champ} ended={ended} />
            <Seat place={2} row={poster.top[2]} ended={ended} />
          </div>
          {/* The floor the pedestals stand on. */}
          <div
            className="h-1.25 w-full"
            style={{
              background: `linear-gradient(90deg,transparent,${accent},transparent)`,
              boxShadow: `0 0 10px ${accent}`,
            }}
          />
        </div>
      </div>

      <div
        className="relative z-10 shrink-0 [@media(max-height:420px)]:hidden"
        style={{ fontSize: 9, color: '#9DB4D4', letterSpacing: '.08em' }}
      >
        {ended
          ? champ
            ? `${raiders} fought. u/${champ.username} took the crown.`
            : 'Nobody claimed the crown this day.'
          : poster.players === 0
            ? 'Nobody on the board yet - the first run takes the crown.'
            : raiders + ' on this ladder. Knock them off.'}
      </div>

      <div className="glk-rise glk-d4 relative z-10 flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {ended ? (
          <>
            <div
              className="flex flex-col items-center px-3 py-1"
              style={{
                background: 'rgba(6,10,22,.82)',
                border: '2px solid #6F7C94',
                borderRadius: '8px 2px 8px 2px',
              }}
            >
              <span
                style={{
                  fontFamily: PIXEL,
                  fontSize: 13,
                  color: '#FFF',
                  letterSpacing: '.08em',
                }}
              >
                FINAL STANDINGS
              </span>
              <span
                style={{ fontSize: 8, color: '#9DB4D4', letterSpacing: '.1em' }}
              >
                A NEW DAILY BATTLE GOES UP AT 00:00 UTC
              </span>
            </div>
            {endedCta}
          </>
        ) : (
          <>
            <Countdown left={left} />
            {cta ? <div className="dly-pulse">{cta}</div> : null}
          </>
        )}
      </div>
    </div>
  );
};
