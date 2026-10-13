import { CountdownColon, CountdownUnit } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

/** One block of the scoreboard clock; urgent turns it red. */
export const Normal = () => (
  <Stage>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <CountdownUnit value="11" unit="HRS" urgent={false} />
      <CountdownColon />
      <CountdownUnit value="42" unit="MIN" urgent={false} />
    </div>
  </Stage>
);

export const Urgent = () => (
  <Stage>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <CountdownUnit value="00" unit="MIN" urgent />
      <CountdownColon />
      <CountdownUnit value="37" unit="SEC" urgent />
    </div>
  </Stage>
);
