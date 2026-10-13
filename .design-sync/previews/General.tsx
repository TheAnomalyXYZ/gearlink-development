import { Enter, General } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopPost, MobilePost } from '../preview-kit/frames';

const TITLE = 'Gearlink - match, link, fight!';

/** The feed card every playable post wears, as it sits in the desktop feed. */
export const Desktop = () => (
  <DesktopPost story="Desktop" title={TITLE}>
    <General cta={<Enter label="PLAY NOW" sparkle />} />
  </DesktopPost>
);

/** The same post in the mobile app, edge to edge. */
export const Mobile = () => (
  <MobilePost story="Mobile" title={TITLE}>
    <General cta={<Enter label="PLAY NOW" sparkle />} />
  </MobilePost>
);

/** No call to action: what a logged-out reader sees while the game loads. */
export const MobileLoggedOut = () => (
  <MobilePost story="MobileLoggedOut" title={TITLE}>
    <General />
  </MobilePost>
);
