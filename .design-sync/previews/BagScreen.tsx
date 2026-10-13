import { BagScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** The bag, packs tab, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <BagScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <BagScreen />
  </MobileScreen>
);

/** The gear collection. */
export const MobileCollection = () => (
  <MobileScreen story="MobileCollection">
    <BagScreen tab="gear" />
  </MobileScreen>
);
