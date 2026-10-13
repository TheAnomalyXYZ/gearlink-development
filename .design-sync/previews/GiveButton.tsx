import { GiveButton } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

/** Gold when the wallet covers it, grey when it can't, "..." while in flight. */
export const States = () => (
  <Stage w={400}>
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      <GiveButton amount={50} live busy={false} onGive={() => {}} />
      <GiveButton amount={250} live busy onGive={() => {}} />
      <GiveButton amount={1000} live={false} busy={false} />
    </div>
  </Stage>
);
