import { Duellist } from 'gearlink-ds';
import '../preview-kit/game.module.css';

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

/** A full-body snoovatar stood in its warm light. Fills its box, so give it a
 *  height. No avatar falls back to Reddit's default snoo. */
export const DefaultSnoo = () => (
  <div style={{ margin: '0 auto', width: 160, height: 220, background: '#101528' }}>
    <Duellist card={GOLD} />
  </div>
);
