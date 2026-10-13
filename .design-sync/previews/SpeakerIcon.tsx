import { SpeakerIcon } from 'gearlink-ds';
import '../preview-kit/game.module.css';

const Tile = ({ value, label }: { value: number; label: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'Volter,ui-monospace,monospace',
      fontSize: 11,
      color: '#4B6A85',
    }}
  >
    <SpeakerIcon value={value} />
    {label}
  </div>
);

/** Off at 0, one wave below 50, two waves from 50. */
export const Levels = () => (
  <div style={{ margin: '0 auto', width: 'fit-content', display: 'flex', gap: 28, padding: 16, background: '#FDFDFD' }}>
    <Tile value={0} label="0" />
    <Tile value={30} label="30" />
    <Tile value={80} label="80" />
  </div>
);
