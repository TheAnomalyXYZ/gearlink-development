import { Daily, Enter } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopPost, MobilePost } from '../preview-kit/frames';

/* The card's countdown runs on the real clock once mounted (`now` only pins
   the first render), so a live poster closes relative to the present. */
const HOUR = 3600_000;
const closesIn = (hours: number) => Date.now() + hours * HOUR;

const GHOST_TOWN = {
  day: 1,
  dateLabel: 'OCT 1',
  weekday: 'THU',
  endsAt: 1790899200000,
  foe: 'Poltergeist',
  foeArt: '/art/NeuraKnights/Monsters/Poltergeist_v001.png',
  region: 'Ghost Town',
  backdrop: '/art/PocketKnights/Background/GhostTown.png',
  accent: '#7FF0C4',
  tagline: 'The dead keep score too.',
  top: [
    { username: 'ironvanguard', score: 12340, avatar: '' },
    { username: 'quietarrow', score: 9000, avatar: '' },
    { username: 'gearmonger', score: 7615, avatar: '' },
  ],
  players: 42,
  tiles: [
    {
      icon: '/art/NeuraKnights/Gear/Archer/Archer_Weapon_Legendary_Base.png',
      effect: 'attack',
    },
    {
      icon: '/art/NeuraKnights/Gear/Archer/Archer_Weapon_Epic_Base.png',
      effect: 'attack',
    },
    {
      icon: '/art/NeuraKnights/Gear/Archer/Archer_Off_Hand_Epic_Base.png',
      effect: 'block',
    },
    {
      icon: '/art/NeuraKnights/Gear/Archer/Archer_Off_Hand_Rare_Base.png',
      effect: 'block',
    },
    {
      icon: '/art/NeuraKnights/Gear/Archer/Archer_Necklace_Epic_Base.png',
      effect: 'effect',
    },
  ],
};

const CASTLE = {
  day: 2,
  dateLabel: 'OCT 2',
  weekday: 'FRI',
  endsAt: 1790985600000,
  foe: 'The King',
  foeArt: '/art/NeuraKnights/Monsters/King_v001.png',
  region: 'Castle',
  backdrop: '/art/PocketKnights/Background/Castle.png',
  accent: '#FFC857',
  tagline: 'The crown is up for grabs.',
  top: [],
  players: 0,
  tiles: [
    {
      icon: '/art/NeuraKnights/Gear/Mage/Mage_Weapon_Legendary_Base.png',
      effect: 'attack',
    },
    {
      icon: '/art/NeuraKnights/Gear/Mage/Mage_Weapon_Epic_Base.png',
      effect: 'attack',
    },
    {
      icon: '/art/NeuraKnights/Gear/Mage/Mage_Off_Hand_Epic_Base.png',
      effect: 'block',
    },
    {
      icon: '/art/NeuraKnights/Gear/Mage/Mage_Off_Hand_Rare_Base.png',
      effect: 'block',
    },
    {
      icon: '/art/NeuraKnights/Gear/Mage/Mage_Necklace_Epic_Base.png',
      effect: 'effect',
    },
  ],
};

/** A Daily Battle post in the desktop feed: a live day with a ladder: the podium shows who holds the crown. */
export const Desktop = () => (
  <DesktopPost story="Desktop" title="Daily Battle - Ghost Town">
    <Daily
      poster={{ ...GHOST_TOWN, endsAt: closesIn(12) }}
      cta={<Enter label="PLAY TODAY'S BATTLE" sparkle />}
      endedCta={<Enter label="PLAY" />}
    />
  </DesktopPost>
);

/** The same post in the mobile app. */
export const Mobile = () => (
  <MobilePost story="Mobile" title="Daily Battle - Ghost Town">
    <Daily
      poster={{ ...GHOST_TOWN, endsAt: closesIn(12) }}
      cta={<Enter label="PLAY TODAY'S BATTLE" sparkle />}
      endedCta={<Enter label="PLAY" />}
    />
  </MobilePost>
);

/** A fresh day nobody has run yet: the crown is open. */
export const MobileFresh = () => (
  <MobilePost story="MobileFresh" title="Daily Battle - Castle">
    <Daily
      poster={{ ...CASTLE, endsAt: closesIn(9) }}
      cta={<Enter label="PLAY TODAY'S BATTLE" sparkle />}
      endedCta={<Enter label="PLAY" />}
    />
  </MobilePost>
);

/** The day is over: the stage drains of colour and the quieter CTA shows. */
export const MobileEnded = () => (
  <MobilePost story="MobileEnded" title="Daily Battle - Ghost Town">
    <Daily
      poster={{ ...GHOST_TOWN, endsAt: closesIn(-1) }}
      cta={<Enter label="PLAY TODAY'S BATTLE" sparkle />}
      endedCta={<Enter label="PLAY" />}
    />
  </MobilePost>
);
