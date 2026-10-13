import { PackOpenScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** A sealed pack, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <PackOpenScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <PackOpenScreen />
  </MobileScreen>
);
