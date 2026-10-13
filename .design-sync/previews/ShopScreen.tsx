import { ShopScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** The shop on its packs tab, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <ShopScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <ShopScreen />
  </MobileScreen>
);

/** The coins tab. */
export const MobileCoins = () => (
  <MobileScreen story="MobileCoins">
    <ShopScreen tab="coins" />
  </MobileScreen>
);

/** The gems tab. */
export const MobileGems = () => (
  <MobileScreen story="MobileGems">
    <ShopScreen tab="gems" />
  </MobileScreen>
);
