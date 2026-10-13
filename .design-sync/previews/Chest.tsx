import { Chest, Enter } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopPost, MobilePost } from '../preview-kit/frames';

/** Wednesday 7 Oct 2026, inside the week the chests below belong to. */
const MIDWEEK = Date.UTC(2026, 9, 7, 12);
const RESET = 1791763200000;

const chest = {
  week: 2962,
  total: 0,
  bonusPct: 0,
  yours: 0,
  top: [] as { username: string; amount: number; isYou: boolean }[],
  donors: 0,
  resetAt: RESET,
};

/** A War Chest post in the desktop feed: a chest well into its second tier, with the reader among the givers. */
export const Desktop = () => (
  <DesktopPost story="Desktop" title="This week's War Chest is open - chip in for bonus coins">
    <Chest
      post={{
        chest: {
          ...chest,
          total: 21_000,
          bonusPct: 25,
          yours: 1_000,
          donors: 14,
          top: [
            { username: 'ironvanguard', amount: 12_000, isYou: false },
            { username: 'quietarrow', amount: 4_500, isYou: false },
            { username: 'pixelpaladin', amount: 1_000, isYou: true },
          ],
        },
        ended: false,
        coins: 3_200,
      }}
      signedIn
      now={MIDWEEK}
      onGive={() => {}}
      cta={<Enter label="PLAY" />}
    />
  </DesktopPost>
);

/** The same post in the mobile app. */
export const Mobile = () => (
  <MobilePost story="Mobile" title="This week's War Chest is open - chip in for bonus coins">
    <Chest
      post={{
        chest: {
          ...chest,
          total: 21_000,
          bonusPct: 25,
          yours: 1_000,
          donors: 14,
          top: [
            { username: 'ironvanguard', amount: 12_000, isYou: false },
            { username: 'quietarrow', amount: 4_500, isYou: false },
            { username: 'pixelpaladin', amount: 1_000, isYou: true },
          ],
        },
        ended: false,
        coins: 3_200,
      }}
      signedIn
      now={MIDWEEK}
      onGive={() => {}}
      cta={<Enter label="PLAY" />}
    />
  </MobilePost>
);

/** Monday's empty chest, asking for its first gift. */
export const MobileEmpty = () => (
  <MobilePost story="MobileEmpty" title="This week's War Chest is open - chip in for bonus coins">
    <Chest
      post={{ chest, ended: false, coins: 500 }}
      signedIn
      now={MIDWEEK}
      onGive={() => {}}
      cta={<Enter label="PLAY" />}
    />
  </MobilePost>
);

/** A gift in flight: its button reads "..." until the server answers. */
export const MobileGiving = () => (
  <MobilePost story="MobileGiving" title="This week's War Chest is open - chip in for bonus coins">
    <Chest
      post={{
        chest: {
          ...chest,
          total: 5_400,
          bonusPct: 10,
          donors: 6,
          top: [
            { username: 'gearmonger', amount: 3_000, isYou: false },
            { username: 'emberwitch', amount: 1_250, isYou: false },
          ],
        },
        ended: false,
        coins: 900,
      }}
      signedIn
      now={MIDWEEK}
      busy={250}
      onGive={() => {}}
      cta={<Enter label="PLAY" />}
    />
  </MobilePost>
);

/** A past week, sealed with its final tally. */
export const MobileSealed = () => (
  <MobilePost story="MobileSealed" title="Last week's War Chest">
    <Chest
      post={{
        chest: { ...chest, total: 6_000, bonusPct: 10, donors: 3 },
        ended: true,
        coins: 500,
      }}
      signedIn
      now={RESET + 1}
      cta={<Enter label="PLAY" />}
    />
  </MobilePost>
);
