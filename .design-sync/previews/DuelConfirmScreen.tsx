import { DuelConfirmScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** Before a duel, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <DuelConfirmScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <DuelConfirmScreen />
  </MobileScreen>
);
