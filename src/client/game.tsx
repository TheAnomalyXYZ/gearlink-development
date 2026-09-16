import './index.css';
import './view/game.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GearLinkApp } from './GearLinkApp.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GearLinkApp />
  </StrictMode>
);
