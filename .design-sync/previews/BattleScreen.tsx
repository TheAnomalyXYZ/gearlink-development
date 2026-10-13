import { BattleScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** A battle in progress, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <BattleScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <BattleScreen />
  </MobileScreen>
);

/** Paused. */
export const MobilePaused = () => (
  <MobileScreen story="MobilePaused">
    <BattleScreen state={{ modal: 'pause' }} />
  </MobileScreen>
);
