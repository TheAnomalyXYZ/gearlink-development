import { CountdownColon } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

/** The blinking separator between clock blocks. */
export const Blink = () => (
  <Stage>
    <CountdownColon />
  </Stage>
);
