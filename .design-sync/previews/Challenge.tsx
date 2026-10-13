import { Challenge, Enter } from 'gearlink-ds';
import '../preview-kit/reddit.module.css';
import { DesktopPost, MobilePost } from '../preview-kit/frames';

const ARCHER_GOLD = {
  username: 'pixelpaladin',
  avatar: '',
  trophies: 1620,
  leagueName: 'Gold 2',
  leagueIcon: '/art/NeuraKnights/rank/Gold.png',
  leagueNumeral: 'II',
  leagueColor: '#FFC24B',
  leagueShade: '#6A4A0E',
  cls: 'Archer' as const,
  heroPerk: '+25% attack damage',
  gear: [
    { icon: '/art/NeuraKnights/Gear/Archer/Archer_Weapon_Legendary_Base.png', tint: '#F08686', name: 'Artemial Arcbow' },
    { icon: '/art/NeuraKnights/Gear/Archer/Archer_Weapon_Epic_Base.png', tint: '#D14141', name: 'Zephyr Bow' },
    { icon: '/art/NeuraKnights/Gear/Archer/Archer_Off_Hand_Epic_Base.png', tint: '#89BCFF', name: 'Infinite Quiver' },
    { icon: '/art/NeuraKnights/Gear/Archer/Archer_Off_Hand_Rare_Base.png', tint: '#3C63FF', name: 'Iron Quiver' },
    { icon: '/art/NeuraKnights/Gear/Archer/Archer_Necklace_Epic_Base.png', tint: '#C5F47D', name: 'Eagle Talisman' },
  ],
};

const MAGE_BRONZE = {
  username: 'emberwitch',
  avatar: '',
  trophies: 80,
  leagueName: 'Bronze 1',
  leagueIcon: '/art/NeuraKnights/rank/Bronze.png',
  leagueNumeral: 'I',
  leagueColor: '#CD8B54',
  leagueShade: '#5E3A22',
  cls: 'Mage' as const,
  heroPerk: '+50% healing',
  gear: [
    { icon: '/art/NeuraKnights/Gear/Mage/Mage_Weapon_Legendary_Base.png', tint: '#F08686', name: 'Tempest Staff' },
    { icon: '/art/NeuraKnights/Gear/Mage/Mage_Weapon_Epic_Base.png', tint: '#D14141', name: 'Frost Staff' },
    { icon: '/art/NeuraKnights/Gear/Mage/Mage_Off_Hand_Epic_Base.png', tint: '#89BCFF', name: 'Infernal Tome' },
    { icon: '/art/NeuraKnights/Gear/Mage/Mage_Off_Hand_Rare_Base.png', tint: '#3C63FF', name: 'Frozen Tome' },
    { icon: '/art/NeuraKnights/Gear/Mage/Mage_Necklace_Epic_Base.png', tint: '#C5F47D', name: 'Frostbite Amulet' },
  ],
};

/** A challenge post in the desktop feed, a signed-in reader facing a Gold duellist. */
export const Desktop = () => (
  <DesktopPost story="Desktop" title="u/pixelpaladin challenged you to a duel">
    <Challenge
      card={ARCHER_GOLD}
      viewer={{ username: 'quietarrow', avatar: '' }}
      cta={<Enter label="ACCEPT THE CHALLENGE" sparkle />}
    />
  </DesktopPost>
);

/** The same post in the mobile app. */
export const Mobile = () => (
  <MobilePost story="Mobile" title="u/pixelpaladin challenged you to a duel">
    <Challenge
      card={ARCHER_GOLD}
      viewer={{ username: 'quietarrow', avatar: '' }}
      cta={<Enter label="ACCEPT THE CHALLENGE" sparkle />}
    />
  </MobilePost>
);

/** Logged out: the reader's seat stands dimmed until someone takes it. */
export const MobileLoggedOut = () => (
  <MobilePost story="MobileLoggedOut" title="u/emberwitch challenged you to a duel">
    <Challenge
      card={MAGE_BRONZE}
      viewer={null}
      cta={<Enter label="ACCEPT THE CHALLENGE" sparkle />}
    />
  </MobilePost>
);
