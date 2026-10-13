import { Countdown } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

/** Seconds left on the day's battle. */
export const Hours = () => (
  <Stage>
    <Countdown left={11 * 3600 + 42 * 60 + 9} />
  </Stage>
);

/** Under an hour it turns red, reads FINAL HOUR and pulses. */
export const FinalHour = () => (
  <Stage>
    <Countdown left={14 * 60 + 37} />
  </Stage>
);
