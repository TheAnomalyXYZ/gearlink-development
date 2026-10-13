import { WorldMap } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

const early = (
  <WorldMap
    embedded={false}
    lockedIds={['caves', 'ghost', 'mountain', 'castle']}
    nextId="bridge"
    onEnter={() => {}}
    onFocusChange={() => {}}
  />
);

/** The expanded game on desktop, early in the campaign: two stops open, the
 *  next fight flagged. The map caps at 460px wide and centres. */
export const Desktop = () => <DesktopScreen story="Desktop">{early}</DesktopScreen>;

/** The same screen on a phone, full screen. */
export const Mobile = () => <MobileScreen story="Mobile">{early}</MobileScreen>;

/** Every location unlocked, no fight cue. */
export const MobileAllOpen = () => (
  <MobileScreen story="MobileAllOpen">
    <WorldMap embedded={false} lockedIds={[]} onEnter={() => {}} onFocusChange={() => {}} />
  </MobileScreen>
);
