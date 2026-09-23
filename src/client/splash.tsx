import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GEARLINK_ICON } from './view/assets.js';
import { api } from './api.js';
import type { ChallengeCard, ChallengeViewer } from '../shared/api.js';
import { requestExpandedMode } from '@devvit/web/client';
import { Challenge } from './splash-card.js';
import { MOTION, PIXEL, SCRIM, SHELL, TITLE } from './splash-style.js';

/** The four-point star the Neura Knights claim button twinkles with. */
const Star = ({ size, cls }: { size: number; cls: string }) => (
  <svg
    className={`glk-star ${cls}`}
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M6.7853 0.558811L7.69829 3.18933C7.88019 3.71054 8.28946 4.11981 8.81067 4.3017L11.4412 5.21469C12.1863 5.47355 12.1863 6.52645 11.4412 6.78531L8.81067 7.6983C8.28946 7.88019 7.88019 8.28946 7.69829 8.81067L6.7853 11.4412C6.52645 12.1863 5.47355 12.1863 5.21469 11.4412L4.3017 8.81067C4.11981 8.28946 3.71053 7.88019 3.18933 7.6983L0.558811 6.78531C-0.18627 6.52645 -0.18627 5.47355 0.558811 5.21469L3.18933 4.3017C3.71053 4.11981 4.11981 3.71054 4.3017 3.18933L5.21469 0.558811C5.47355 -0.18627 6.52645 -0.18627 6.7853 0.558811Z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Opening the post is a host call, so it lives with the entry point rather
 * than with the card, which stays plain markup.
 *
 * It is the game's own claim button: the primary Neura Knights face - lemon
 * fill, hard black border, the orange lip and white gloss pressed in as inset
 * shadows, and the clipped corners on the other diagonal. A sheen sweeps
 * across it on a loop, because the button is the one thing on the card that
 * has to be pressed and nothing else on the card moves sideways.
 *
 * `sparkle` gives it the four twinkling stars a claimable quest wears, which
 * is the same signal: there is something here waiting to be taken. They sit on
 * a wrapper rather than the button, which clips its own sheen.
 */
const Enter = ({
  label,
  sparkle = false,
}: {
  label: string;
  sparkle?: boolean;
}) => (
  <div className="relative mt-1 overflow-visible">
    <button
      className="relative flex h-10 cursor-pointer items-center justify-center overflow-hidden px-5 transition-all duration-100 hover:brightness-110"
      style={{
        border: '3px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: '#FCE270',
        boxShadow:
          '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
        color: '#000',
        fontFamily: PIXEL,
        fontSize: 14,
        letterSpacing: '.04em',
      }}
      onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    >
      <span className="relative uppercase">{label}</span>
      <span
        className="glk-sheen pointer-events-none absolute inset-y-0 w-10 -skew-x-12"
        style={{
          background:
            'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.75),rgba(255,255,255,0))',
        }}
      />
    </button>
    {sparkle ? (
      <>
        <Star size={8} cls="glk-s1" />
        <Star size={10} cls="glk-s2" />
        <Star size={7} cls="glk-s3" />
        <Star size={9} cls="glk-s4" />
      </>
    ) : null}
  </div>
);

/**
 * The inline view, as it appears in the feed.
 *
 * Deliberately tiny: no engine, no profile fetch, no card table. It asks the
 * server one question - what should this post draw? - and the server answers
 * with finished image paths, so nothing here has to know what a rank or a
 * piece of gear looks like.
 *
 * Two answers. An ordinary GearLink post gets the game's own splash. A
 * CHALLENGE post gets the duellist who made it.
 */

const Plain = () => (
  <div
    className="relative flex h-full min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
    style={SHELL}
  >
    <style>{MOTION}</style>
    <div className="absolute inset-0" style={SCRIM} />
    <div
      className="glk-bob relative h-[72px] w-[68px] bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${GEARLINK_ICON})` }}
    />
    <div
      className="relative"
      style={{ ...TITLE, fontSize: 'clamp(20px,5vw,30px)' }}
    >
      GEARLINK BATTLE
    </div>
    <div
      className="relative max-w-[34ch] text-xs leading-relaxed"
      style={{ color: '#CBD9EC' }}
    >
      Link your gear, break the wave, and see how deep the ladder takes you.
    </div>
    <Enter label="ENTER THE GAUNTLET" />
  </div>
);

export const Splash = () => {
  const [card, setCard] = useState<ChallengeCard | null>(null);
  // Who is reading. The same answer carries it, so the open side of the plate
  // fills in with the reader's own face rather than a blank.
  const [viewer, setViewer] = useState<ChallengeViewer | null>(null);

  useEffect(() => {
    let live = true;
    // A failed lookup is not an error worth showing: the plain splash is the
    // right answer for every post that is not a challenge, including one whose
    // data could not be read.
    void api
      .challengeCard()
      .then((r) => {
        if (!live) return;
        setCard(r.card);
        setViewer(r.viewer);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  return card ? (
    <Challenge
      card={card}
      viewer={viewer}
      cta={<Enter label="ACCEPT THE CHALLENGE" sparkle />}
    />
  ) : (
    <Plain />
  );
};

/* Mounting is guarded so the module can also be imported for a render test,
   where there is no document to mount into. */
const root =
  typeof document === 'undefined' ? null : document.getElementById('root');
if (root)
  createRoot(root).render(
    <StrictMode>
      <Splash />
    </StrictMode>
  );
