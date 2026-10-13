import { DailyBanner } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

const POSTER = {
  day: 1,
  dateLabel: 'OCT 1',
  weekday: 'THU',
  endsAt: Date.now() + 12 * 3600_000,
  foe: 'Poltergeist',
  foeArt: '/art/NeuraKnights/Monsters/Poltergeist_v001.png',
  region: 'Ghost Town',
  backdrop: '/art/PocketKnights/Background/GhostTown.png',
  accent: '#7FF0C4',
  tagline: 'The dead keep score too.',
  top: [],
  players: 0,
};

/** The ribbon: title, then the day's chip in the poster's accent. */
export const Live = () => (
  <Stage>
    <DailyBanner poster={POSTER} ended={false} />
  </Stage>
);

/** A closed day goes steel grey and takes an ENDED stamp. */
export const Ended = () => (
  <Stage>
    <DailyBanner poster={POSTER} ended />
  </Stage>
);
