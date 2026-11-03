import './index.css';
import './view/game.css';
import './view/worldMap.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GearLinkApp } from './GearLinkApp.js';
import { installScrollHints } from './fx/scrollHints.js';
import { prefetchBoot } from './state/boot.js';
import { preloadWorldMap } from './view/worldMapChunk.js';

// Put the first reads on the wire before React mounts, not after - and the
// map, which home draws first and the game chunk leaves out.
prefetchBoot();
void preloadWorldMap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GearLinkApp />
  </StrictMode>
);

// The scrollbar is hidden app-wide; these chevrons say "more this way" instead.
installScrollHints();
