import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GEARLINK_ICON } from './view/assets.js';
import { api } from './api.js';
import type { ChallengeCard } from '../shared/api.js';
import { requestExpandedMode } from '@devvit/web/client';
import { Challenge } from './splash-card.js';
import { MOTION, PIXEL, SCRIM, SHELL, TITLE } from './splash-style.js';

/** Opening the post is a host call, so it lives with the entry point rather
 *  than with the card, which stays plain markup.
 *
 *  A sheen sweeps across it on a loop, because the button is the one thing on
 *  the card that has to be pressed and nothing else on the card moves sideways. */
const Enter = ({ label }: { label: string }) => (
  <button
    className="relative mt-1 flex h-10 cursor-pointer items-center justify-center overflow-hidden px-5"
    style={{
      border: '3px solid #000',
      borderRadius: '8px 2px 8px 2px',
      background: '#FCE270',
      boxShadow:
        '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
      color: '#000',
      fontFamily: PIXEL,
      fontSize: 14,
    }}
    onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
  >
    <span className="relative">{label}</span>
    <span
      className="glk-sheen pointer-events-none absolute inset-y-0 w-10 -skew-x-12"
      style={{
        background:
          'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.75),rgba(255,255,255,0))',
      }}
    />
  </button>
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

  useEffect(() => {
    let live = true;
    // A failed lookup is not an error worth showing: the plain splash is the
    // right answer for every post that is not a challenge, including one whose
    // data could not be read.
    void api
      .challengeCard()
      .then((r) => {
        if (live) setCard(r.card);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  return card ? (
    <Challenge card={card} cta={<Enter label="ACCEPT THE CHALLENGE" />} />
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
