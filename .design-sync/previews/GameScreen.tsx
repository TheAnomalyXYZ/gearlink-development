import { GameScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** Any phase with any state - here the home screen with settings open. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <GameScreen phase="home" state={{ modal: 'settings' }} />
  </DesktopScreen>
);

/** How to play, on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <GameScreen phase="home" state={{ modal: 'how' }} />
  </MobileScreen>
);
