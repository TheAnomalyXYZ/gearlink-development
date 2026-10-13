import { HomeScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** The home screen in the expanded view on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <HomeScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <HomeScreen />
  </MobileScreen>
);

/** With the home menu open. */
export const MobileMenu = () => (
  <MobileScreen story="MobileMenu">
    <HomeScreen state={{ homeMenu: true }} />
  </MobileScreen>
);
