import { QuestsScreen } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

/** Daily quests, on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <QuestsScreen />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <QuestsScreen />
  </MobileScreen>
);

/** The weekly tab. */
export const MobileWeekly = () => (
  <MobileScreen story="MobileWeekly">
    <QuestsScreen tab="weekly" />
  </MobileScreen>
);
