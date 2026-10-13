import { RankIcon } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

const GOLD = {
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
  gear: [],
};

const rank = (leagueName: string, leagueIcon: string, leagueNumeral: string) => ({
  ...GOLD,
  leagueName,
  leagueIcon,
  leagueNumeral,
});

/** The rank sprite with its numeral; Knight is a single rung with none. */
export const Leagues = () => (
  <Stage>
    <RankIcon card={rank('Bronze 1', '/art/NeuraKnights/rank/Bronze.png', 'I')} />
    <RankIcon card={rank('Platinum 2', '/art/NeuraKnights/rank/Platinum.png', 'II')} />
    <RankIcon card={rank('Gold 2', '/art/NeuraKnights/rank/Gold.png', 'II')} />
    <RankIcon card={rank('Knight', '/art/NeuraKnights/rank/Goldblack.png', '')} />
  </Stage>
);
