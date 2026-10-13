import { RunEndScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** A won run, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <RunEndScreen won />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <RunEndScreen won />
  </MobileScreen>
);

/** A lost run. */
export const MobileLost = () => (
  <MobileScreen story="MobileLost">
    <RunEndScreen won={false} />
  </MobileScreen>
);
