import { PodiumSeat } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

/** The podium as the Daily card builds it: second, first, third. */
const Podium = ({ ended, rows }: { ended: boolean; rows: ({ username: string; score: number; avatar: string } | undefined)[] }) => (
  <Stage w={380}>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, width: '100%' }}>
      <PodiumSeat place={1} row={rows[1]} ended={ended} />
      <PodiumSeat place={0} row={rows[0]} ended={ended} />
      <PodiumSeat place={2} row={rows[2]} ended={ended} />
    </div>
  </Stage>
);

const TOP = [
  { username: 'ironvanguard', score: 12340, avatar: '' },
  { username: 'quietarrow', score: 9000, avatar: '' },
  { username: 'gearmonger', score: 7615, avatar: '' },
];

export const Ladder = () => <Podium ended={false} rows={TOP} />;

/** Nobody has run yet: three open seats. */
export const OpenSeats = () => <Podium ended={false} rows={[]} />;

/** A closed day crowns its champion. */
export const Champion = () => <Podium ended rows={TOP} />;
