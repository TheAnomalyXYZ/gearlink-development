import { HeroPickScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** Picking a hero, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <HeroPickScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <HeroPickScreen />
  </MobileScreen>
);
