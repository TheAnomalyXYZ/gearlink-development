import { Fatal } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopScreen, MobileScreen } from '../preview-kit/frames';

const NETWORK = 'The server did not answer. Check your connection and reopen the post.';

/** What shows if the profile never lands, in the expanded view on desktop. */
export const Desktop = () => (
  <DesktopScreen story="Desktop">
    <Fatal message={NETWORK} />
  </DesktopScreen>
);

/** The same on a phone. */
export const Mobile = () => (
  <MobileScreen story="Mobile">
    <Fatal message={NETWORK} />
  </MobileScreen>
);

/** A longer message wraps at 36ch. */
export const MobileLongMessage = () => (
  <MobileScreen story="MobileLongMessage">
    <Fatal message="Your save could not be read. Nothing was lost: the forge keeps a copy, so close the post and open it again in a minute. If this keeps happening, let a moderator know." />
  </MobileScreen>
);
