/**
 * The feed cards' motion sheets (`glk-*`, plus the chest's and the daily
 * card's own), installed once.
 *
 * In the game each card inlines it with `<style>{MOTION}</style>`, so a piece
 * drawn on its own - the claim button's sheen and stars, a podium seat, or
 * anything a design
 * builds with those classes - would sit still and unstyled. Loading it at
 * bundle start gives every render the same classes the cards have.
 */
import { CHEST_MOTION } from '../../src/client/splash-chest.js';
import { DAILY_MOTION } from '../../src/client/splash-daily.js';
import { MOTION } from '../../src/client/splash-style.js';

if (typeof document !== 'undefined' && !document.getElementById('glk-motion')) {
  const s = document.createElement('style');
  s.id = 'glk-motion';
  s.textContent = MOTION + CHEST_MOTION + DAILY_MOTION;
  document.head.appendChild(s);
}
