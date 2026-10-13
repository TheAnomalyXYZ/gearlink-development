import { HeroStander } from 'gearlink-ds';
import '../preview-kit/game.module.css';

const HEROES = [
  { name: 'ARCHER', art: '/art/NeuraKnights/Characters/Archer.png', color: '#5CC45A' },
  { name: 'HERO', art: '/art/NeuraKnights/Characters/Hero.png', color: '#E8453C' },
  { name: 'MAGE', art: '/art/NeuraKnights/Characters/Mage.png', color: '#8C7CFF' },
];

/** The three classes standing, as the General card lines them up: the middle
 *  one in front and a head taller. Each takes a share of its row's width. */
export const Lineup = () => (
  <div
    style={{
      width: 400,
      margin: '0 auto',
      height: 300,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: 16,
      background: 'url(/art/PocketKnights/sky_v3.png) center bottom/cover',
    }}
  >
    {HEROES.map((h, i) => (
      <HeroStander key={h.name} hero={h} i={i} />
    ))}
  </div>
);
