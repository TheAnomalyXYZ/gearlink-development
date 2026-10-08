/**
 * The inline view of a War Chest post: the subreddit's shared pot, right in
 * the feed.
 *
 * The chest itself sits centre, glowing brighter as it fills. Under it, the
 * bar to the top tier with each tier marked where it lands, the week's biggest
 * givers, and the give buttons - giving happens here, without opening the
 * game, because the point of the post is that anyone scrolling past can chip
 * in.
 *
 * A post outlives its week. Once Monday comes round the chest is SEALED: the
 * card shows the final tally and the bonus it reached, and the buttons give
 * way to opening the game, where this week's chest is.
 *
 * Pure markup, like the other feed cards: the host calls (giving, opening the
 * post) are handed in from `splash.tsx`, so this renders in a test.
 */
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { WarChestPost } from '../shared/api.js';
import {
  DONATION_AMOUNTS,
  WAR_CHEST_ART,
  WAR_CHEST_TIERS,
  warChestWeekLabel,
} from '../shared/engine/warchest.js';
import { MOTION, PIXEL, SCRIM, SHELL, TITLE } from './splash-style.js';

/** The game's coin, by path - the feed view does not load the shop tables. */
const COIN = '/art/NeuraKnights/Item/Gold_V2.png';

const GREEN = '#AEE45D';

const STROKE: CSSProperties = {
  WebkitTextStroke: '3px #000',
  paintOrder: 'stroke fill',
};

/* The chest's own motion. Decoration only, so it stops under reduced motion. */
const CHEST_MOTION = `
@keyframes wc-glow{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(.92)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}
@keyframes wc-fill{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
@keyframes wc-stamp{0%{opacity:0;transform:rotate(-12deg) scale(2.6)}60%{opacity:1;transform:rotate(-12deg) scale(.9)}100%{opacity:1;transform:rotate(-12deg) scale(1)}}
.wc-glow{animation:wc-glow 2.8s ease-in-out infinite}
.wc-fill{transform-origin:left;animation:wc-fill .9s cubic-bezier(.2,1.1,.4,1) .2s both}
.wc-stamp{animation:wc-stamp .5s cubic-bezier(.3,1.4,.5,1) .5s both}
@media (max-height:380px){.wc-tall{display:none}}
@media (prefers-reduced-motion:reduce){.wc-glow,.wc-fill,.wc-stamp{animation:none}}`;

const fmt = (n: number) => n.toLocaleString('en-US');

/** "3D 4H" or "5H 12M" - minutes are enough on a week-long clock. */
const timeLeft = (ms: number): string => {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d > 0 ? d + 'D ' + h + 'H' : h + 'H ' + (m % 60) + 'M';
};

/** One give button. Gold when it can be pressed, grey when it cannot. */
const Give = ({
  amount,
  live,
  busy,
  onGive,
}: {
  amount: number;
  live: boolean;
  busy: boolean;
  onGive?: (amount: number) => void;
}) => (
  <button
    type="button"
    disabled={!live}
    onClick={live && onGive ? () => onGive(amount) : undefined}
    className="flex h-9 flex-1 items-center justify-center gap-1 px-1 transition-all duration-100 enabled:cursor-pointer enabled:hover:brightness-110"
    style={{
      border: '3px solid #000',
      borderRadius: '8px 2px 8px 2px',
      background: live ? '#FCE270' : '#8A93AE',
      boxShadow: live
        ? '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)'
        : '0 -4px 0 0 #5D6680 inset, 0 2px 0 0 rgba(0,0,0,.25)',
      color: '#000',
      fontFamily: PIXEL,
      fontSize: 'clamp(11px,3.4vw,14px)',
      opacity: live ? 1 : 0.7,
    }}
  >
    <img src={COIN} alt="" className="h-3.5 w-3.5" />
    <span>{busy ? '...' : 'GIVE ' + fmt(amount)}</span>
  </button>
);

export const Chest = ({
  post,
  signedIn,
  now: at,
  busy = null,
  onGive,
  cta,
}: {
  post: WarChestPost;
  signedIn: boolean;
  /** The clock, for tests; the card reads it once when it mounts. */
  now?: number;
  /** The amount whose donation is in flight, if any. */
  busy?: number | null;
  onGive?: (amount: number) => void;
  /** Opens the game. */
  cta?: ReactNode;
}) => {
  const [now] = useState(() => at ?? Date.now());
  const { chest, ended, coins } = post;
  const top = WAR_CHEST_TIERS[WAR_CHEST_TIERS.length - 1]!;
  const fill = Math.min(1, chest.total / top.at);
  const live = chest.bonusPct > 0;

  return (
    <div
      className="relative flex h-screen w-full flex-col items-center overflow-hidden px-4 py-3 text-white"
      style={SHELL}
    >
      <style>{MOTION + CHEST_MOTION}</style>
      <div className="pointer-events-none absolute inset-0" style={SCRIM} />

      {/* Banner: what this is, which week, and how long it has left. */}
      <div className="glk-rise relative flex flex-col items-center leading-none">
        <span
          style={{
            ...TITLE,
            ...STROKE,
            fontSize: 'clamp(24px,8vw,38px)',
          }}
        >
          WAR CHEST
        </span>
        <span
          className="mt-1.5"
          style={{ fontSize: 9, color: '#9DB4D4', letterSpacing: '.16em' }}
        >
          {'WEEK OF ' + warChestWeekLabel(chest.week) + ' · '}
          {ended ? (
            <span style={{ color: '#FF8A7A' }}>SEALED</span>
          ) : (
            'EMPTIES IN ' + timeLeft(chest.resetAt - now)
          )}
        </span>
      </div>

      {/* The chest, and what it holds. */}
      <div className="relative mt-1 flex min-h-0 flex-1 items-center justify-center gap-4">
        <div className="relative flex h-full max-h-36 min-h-16 items-center">
          <div
            className="wc-glow pointer-events-none absolute top-1/2 left-1/2 rounded-full"
            style={{
              width: '150%',
              aspectRatio: '1',
              background: `radial-gradient(circle,rgba(255,211,78,${0.25 + fill * 0.55}),rgba(255,211,78,0) 65%)`,
            }}
          />
          <img
            src={WAR_CHEST_ART}
            alt="War chest"
            className="glk-bob relative h-full max-h-36 w-auto object-contain"
            style={{
              imageRendering: 'pixelated',
              filter: ended ? 'grayscale(.7) brightness(.8)' : 'none',
            }}
          />
          {ended ? (
            <span
              className="wc-stamp absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5"
              style={{
                fontFamily: PIXEL,
                fontSize: 18,
                color: '#FF5A4E',
                border: '3px solid #FF5A4E',
                borderRadius: 4,
                background: 'rgba(11,16,32,.75)',
              }}
            >
              SEALED
            </span>
          ) : null}
        </div>
        <div className="flex flex-col items-start leading-none">
          <span
            style={{ fontSize: 8, color: '#9DB4D4', letterSpacing: '.16em' }}
          >
            {ended ? 'FINAL TALLY' : 'IN THE CHEST'}
          </span>
          <span
            className="mt-1 flex items-center gap-1.5"
            style={{
              fontFamily: PIXEL,
              fontSize: 'clamp(20px,7vw,30px)',
              color: '#FFE16A',
              ...STROKE,
            }}
          >
            <img src={COIN} alt="" className="h-5 w-5" />
            {fmt(chest.total)}
          </span>
          <span
            className="mt-1.5"
            style={{
              fontSize: 9,
              color: live ? GREEN : '#9DB4D4',
              letterSpacing: '.1em',
            }}
          >
            {live
              ? '+' +
                chest.bonusPct +
                (ended ? '% BATTLE COINS REACHED' : '% BATTLE COINS LIVE')
              : ended
                ? 'NO BONUS REACHED'
                : 'NO BONUS YET'}
          </span>
          <span
            className="mt-1"
            style={{ fontSize: 9, color: '#C7D2EA', letterSpacing: '.1em' }}
          >
            {chest.donors + (chest.donors === 1 ? ' GIVER' : ' GIVERS')}
          </span>
        </div>
      </div>

      {/* The bar to the top tier, each tier marked where it lands. */}
      <div className="relative w-full max-w-md">
        <div
          className="relative h-3.5 w-full overflow-hidden"
          style={{
            background: '#1D2956',
            border: '2px solid #000',
            borderRadius: 4,
          }}
        >
          <div
            className="wc-fill h-full"
            style={{
              width: fill * 100 + '%',
              background: '#FCE270',
              boxShadow: '0 -3px 0 0 #FF961D inset',
            }}
          />
          {WAR_CHEST_TIERS.map((t) => (
            <div
              key={t.at}
              className="absolute top-0 bottom-0 w-0.5"
              style={{
                left: (t.at / top.at) * 100 + '%',
                marginLeft: -2,
                background: chest.total >= t.at ? GREEN : '#F0F0F0',
              }}
            />
          ))}
        </div>
        <div className="relative mt-1 h-5 w-full">
          {WAR_CHEST_TIERS.map((t, i) => {
            const reached = chest.total >= t.at;
            const last = i === WAR_CHEST_TIERS.length - 1;
            return (
              <div
                key={t.at}
                className="absolute flex flex-col leading-none"
                style={{
                  left: last ? 'auto' : (t.at / top.at) * 100 + '%',
                  right: last ? 0 : 'auto',
                  transform: last ? 'none' : 'translateX(-50%)',
                  alignItems: last ? 'flex-end' : 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: reached ? GREEN : '#FFF2B0',
                  }}
                >
                  {'+' + t.bonusPct + '%'}
                </span>
                <span style={{ fontSize: 7, color: '#8FA3C4' }}>
                  {fmt(t.at)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* The week's biggest givers. */}
      <div
        className="wc-tall mt-1 flex w-full max-w-md items-center justify-center gap-3"
        style={{ fontSize: 9, letterSpacing: '.06em' }}
      >
        {chest.top.length ? (
          chest.top.slice(0, 3).map((d, i) => (
            <span
              key={d.username}
              className="truncate"
              style={{ color: d.isYou ? '#8FC3FF' : '#C7D2EA' }}
            >
              <span style={{ color: '#FFD34E' }}>{'#' + (i + 1) + ' '}</span>
              {'u/' + d.username + ' ' + fmt(d.amount)}
            </span>
          ))
        ) : (
          <span style={{ color: '#C7D2EA' }}>
            {ended
              ? 'Nobody gave to this chest.'
              : 'No givers yet - be the first.'}
          </span>
        )}
      </div>

      {/* Giving, or the way into the game once the week is sealed. */}
      {ended ? (
        <div className="relative mt-2 flex flex-col items-center gap-1">
          <span style={{ fontSize: 9, color: '#C7D2EA' }}>
            {"This week's chest is open in the game."}
          </span>
          {cta}
        </div>
      ) : signedIn ? (
        <div className="relative mt-2 flex w-full max-w-md flex-col items-center gap-1.5">
          <div className="flex w-full gap-2">
            {DONATION_AMOUNTS.map((a) => (
              <Give
                key={a}
                amount={a}
                live={busy === null && (coins ?? 0) >= a}
                busy={busy === a}
                {...(onGive ? { onGive } : {})}
              />
            ))}
          </div>
          <span
            style={{ fontSize: 9, color: '#9DB4D4', letterSpacing: '.08em' }}
          >
            {'YOU HAVE ' +
              fmt(coins ?? 0) +
              (chest.yours ? ' · YOU GAVE ' + fmt(chest.yours) : '')}
          </span>
          {cta ? <div className="wc-tall">{cta}</div> : null}
        </div>
      ) : (
        <div className="relative mt-2 flex flex-col items-center gap-1">
          <span style={{ fontSize: 9, color: '#C7D2EA' }}>
            Log in to Reddit to give to the chest.
          </span>
          {cta}
        </div>
      )}
    </div>
  );
};
