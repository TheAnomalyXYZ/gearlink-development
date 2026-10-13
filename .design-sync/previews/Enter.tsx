import { Enter } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

/** The primary call to action, with the twinkling stars of a claimable reward.
 *  It sits in a flex box, as on every card, so the stars hug the button. */
export const Sparkle = () => (
  <Stage>
    <Enter label="ACCEPT THE CHALLENGE" sparkle />
  </Stage>
);

/** The quieter face: same button, no stars. */
export const Plain = () => (
  <Stage>
    <Enter label="PLAY" />
  </Stage>
);

/** Labels are uppercased by the button; short verbs read best. */
export const Labels = () => (
  <Stage>
    <Enter label="Play now" sparkle />
    <Enter label="Play today's battle" sparkle />
    <Enter label="Play" />
  </Stage>
);
