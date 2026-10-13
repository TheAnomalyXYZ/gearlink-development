import { LoadoutScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** Choosing the five, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <LoadoutScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <LoadoutScreen />
  </MobileScreen>
);
