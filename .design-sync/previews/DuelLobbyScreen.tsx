import { DuelLobbyScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** The duel lobby, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <DuelLobbyScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <DuelLobbyScreen />
  </MobileScreen>
);
