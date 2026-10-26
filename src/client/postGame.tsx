/**
 * The inline post as a playable battle: the full game in post mode, loaded on
 * demand by the splash so other post types stay light.
 */
import './view/game.css';
import './view/worldMap.css';

import { setPostMode } from './postMode.js';
import { GearLinkApp, type GearLinkProps } from './GearLinkApp.js';

setPostMode(true);
if (typeof document !== 'undefined')
  document.documentElement.setAttribute('data-post', '');

export const PostGame = (p: GearLinkProps) => <GearLinkApp {...p} />;
