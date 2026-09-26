import './index.css';
import './view/game.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GearLinkApp } from './GearLinkApp.js';
import { prefetchBoot } from './state/boot.js';

// Put the first reads on the wire before React mounts, not after.
prefetchBoot();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GearLinkApp />
  </StrictMode>
);
