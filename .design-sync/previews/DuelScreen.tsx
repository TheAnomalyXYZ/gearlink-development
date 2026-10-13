import { DuelScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** A duel in progress, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <DuelScreen />
  </DesktopScreen>
);

/** A won duel. */
export const MobileWon = () => (
  <MobileScreen story="MobileWon">
    <DuelScreen won />
  </MobileScreen>
);
