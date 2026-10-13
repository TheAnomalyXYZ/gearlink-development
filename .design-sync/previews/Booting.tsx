import { Booting } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** What shows before the profile lands, in the expanded view on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <Booting />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <Booting />
  </MobileScreen>
);
