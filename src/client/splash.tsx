import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import { GEARLINK_ICON } from './view/assets.js';

/**
 * The inline view, as it appears in the feed. Deliberately tiny: no engine, no
 * profile fetch, no card art - just enough to say what this is and open it.
 */
export const Splash = () => (
  <div
    className="relative flex h-full min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
    style={{
      backgroundColor: '#101528',
      backgroundImage:
        'url(/art/PocketKnights/sky_v3.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center bottom',
      fontFamily: 'Volter,ui-monospace,monospace',
    }}
  >
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg,rgba(11,16,32,.72),rgba(11,16,32,.3) 40%,rgba(16,21,40,.96))',
      }}
    />
    <div
      className="relative h-[72px] w-[68px] bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${GEARLINK_ICON})` }}
    />
    <div
      className="relative"
      style={{
        fontFamily: "'Yoster Island',Volter,monospace",
        fontSize: 'clamp(20px,5vw,30px)',
        color: '#FFF2B0',
        textShadow: '0 4px 0 #141D2E',
      }}
    >
      GEARLINK BATTLE
    </div>
    <div
      className="relative max-w-[34ch] text-xs leading-relaxed"
      style={{ color: '#CBD9EC' }}
    >
      Link your gear, break the wave, and see how deep the ladder takes you.
    </div>
    <button
      className="relative mt-2 flex h-11 cursor-pointer items-center justify-center px-6"
      style={{
        border: '3px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: '#FCE270',
        boxShadow:
          '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
        color: '#000',
        fontFamily: "'Yoster Island',Volter,monospace",
        fontSize: 15,
      }}
      onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    >
      ENTER THE GAUNTLET
    </button>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
