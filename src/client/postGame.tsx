/**
 * The inline post as a playable battle: the full game in post mode, loaded on
 * demand by the splash so other post types stay light.
 */
import './view/game.css';
import './view/worldMap.css';

import { setPostMode } from './postMode.js';
import { GearLinkApp, type GearLinkProps } from './GearLinkApp.js';

setPostMode(true);
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-post', '');
  holdFeedScroll(document);
}

/** In the feed, a drag that links orbs must not also scroll the page under
 *  it. `touch-action: none` on the board is not enough inside the mobile
 *  apps' webviews, so a touch that starts on a board cancels its own moves.
 *  The listener has to be non-passive for `preventDefault` to take. */
function holdFeedScroll(doc: Document): void {
  let held = false;
  doc.addEventListener(
    'touchstart',
    (e) => {
      held =
        e.target instanceof Element &&
        e.target.closest('[data-juice-board]') !== null;
    },
    { passive: true, capture: true }
  );
  doc.addEventListener(
    'touchmove',
    (e) => {
      if (held && e.cancelable) e.preventDefault();
    },
    { passive: false, capture: true }
  );
  const release = (e: TouchEvent): void => {
    if (e.touches.length === 0) held = false;
  };
  doc.addEventListener('touchend', release, { capture: true });
  doc.addEventListener('touchcancel', release, { capture: true });
}

export const PostGame = (p: GearLinkProps) => <GearLinkApp {...p} />;
