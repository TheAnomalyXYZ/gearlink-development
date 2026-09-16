import type {
  EffectKind,
  Gear,
  HeroClass,
  Rarity,
  Rider,
  RiderKind,
} from './types.js';
import { GEAR } from './gear-data.js';
import { RIDER_BY_ID } from './rider-data.js';

export { GEAR, RIDER_BY_ID };

export const GEAR_BY_ID: Record<string, Gear> = Object.fromEntries(
  GEAR.map((g) => [g.id, g])
);

export const riderOf = (cardId: string): Rider | null =>
  RIDER_BY_ID[cardId] ?? null;

/** Mark is a setup-then-cash-in ladder, not a flat bonus. */
export const markMultX100 = (stacks: number): number =>
  stacks > 2 ? 225 : stacks > 1 ? 175 : stacks > 0 ? 150 : 100;

export const NO_STATUS = { burn: 0, mark: 0, frost: 0, strength: 0, grit: 0 };

export type HeroPerk = {
  heroClass: HeroClass;
  attackX100: number;
  blockX100: number;
  healX100: number;
  startBlock: number;
  img: string;
  line: string;
};

export const HERO_PERKS: Record<HeroClass, HeroPerk> = {
  Hero: {
    heroClass: 'Hero',
    attackX100: 100,
    blockX100: 130,
    healX100: 100,
    startBlock: 10,
    img: 'https://files.anomalygames.ai/NeuraKnights/Characters/Hero_Avatar.png',
    line: '+30% block, start with 10 block',
  },
  Archer: {
    heroClass: 'Archer',
    attackX100: 125,
    blockX100: 100,
    healX100: 100,
    startBlock: 0,
    img: 'https://files.anomalygames.ai/NeuraKnights/Characters/Archer_Avatar.png',
    line: '+25% attack damage',
  },
  Mage: {
    heroClass: 'Mage',
    attackX100: 100,
    blockX100: 100,
    healX100: 150,
    startBlock: 0,
    img: 'https://files.anomalygames.ai/NeuraKnights/Characters/Mage_Avatar.png',
    line: '+50% healing',
  },
};

export const HERO_CLASSES: HeroClass[] = ['Hero', 'Archer', 'Mage'];

export const RARITY_ORDER: Rarity[] = ['Common', 'Rare', 'Epic', 'Legendary'];
export const RARITY_OUTLINE: Record<string, string> = {
  Starter: '#8A93B5',
  Base: '#E6D7BF',
  Common: '#9FB3D1',
  Rare: '#4F92F0',
  Epic: '#A46BE8',
  Legendary: '#F4B740',
};

export const RIDERS: Record<
  string,
  {
    type: string;
    label: string;
    color: string;
    on: 'monster' | 'hero';
    icon: string;
    verb: (v: number) => string;
    blurb: string;
  }
> = {
  burn: {
    type: 'Apply Burn',
    label: 'BURN',
    color: '#FF8A3D',
    on: 'monster',
    icon: 'https://files.anomalygames.ai/PocketKnights/Battle/Effects/Burn.png',
    verb: (v) => 'Apply ' + v + ' Burn',
    blurb:
      'Burn ticks that much damage at the end of every turn, then decays by 1.',
  },
  mark: {
    type: 'Apply Mark',
    label: 'MARK',
    color: '#FF6BD6',
    on: 'monster',
    icon: 'https://files.anomalygames.ai/PocketKnights/Battle/Effects/Mark.png',
    verb: (v) => 'Apply ' + v + ' Mark',
    blurb:
      'Your next attack link consumes a Mark: x1.5 at one stack, x1.75 at two, x2.25 at three.',
  },
  frost: {
    type: 'Apply Frost',
    label: 'FROST',
    color: '#7FD8FF',
    on: 'monster',
    icon: 'https://files.anomalygames.ai/PocketKnights/Battle/Effects/Frost.png',
    verb: (v) => 'Apply ' + v + ' Frost',
    blurb:
      'Each stack stalls the charge meter for one turn, delaying the swing.',
  },
  strength: {
    type: 'Gain Strength',
    label: 'STR',
    color: '#FFC24B',
    on: 'hero',
    icon: 'https://files.anomalygames.ai/PocketKnights/Battle/Effects/Strength.png',
    verb: (v) => 'Gain ' + v + ' Strength',
    blurb: 'Permanent for the run: every attack link hits for that much more.',
  },
  grit: {
    type: 'Gain Grit',
    label: 'GRIT',
    color: '#8FE3A2',
    on: 'hero',
    icon: 'https://files.anomalygames.ai/PocketKnights/Battle/Effects/Grit.png',
    verb: (v) => 'Gain ' + v + ' Grit',
    blurb:
      'Permanent for the run: every block link gives that much more block.',
  },
};

export const MONSTER_STATUS: RiderKind[] = ['burn', 'mark', 'frost'];
export const HERO_STATUS: RiderKind[] = ['strength', 'grit'];

/* Port of utils/getGearImageUrl.ts - same key normalisation and per-class
   folders, so a tile shows the real card art the arena shows. */
const GEAR_FOLDER: Record<string, string> = {
  Hero: 'Warrior',
  Archer: 'Archer',
  Mage: 'Mage',
};
const gearImageKey = (cardId: string) =>
  (cardId || '')
    .replace('-Crumbling', '')
    .replace('BasePlus', 'Base')
    .replace('Bronze', 'Base')
    .replace('Silver', 'Base')
    .replace('Gold', 'Base')
    .split('-')
    .join('_');

export const getGearImageUrl = (cardId: string): string => {
  const key = gearImageKey(cardId);
  if (!key) return '';
  if (key.indexOf('_Starter_') >= 0)
    return 'https://files.anomalygames.ai/NeuraKnights/Gear/' + key + '.png';
  const folder = GEAR_FOLDER[key.split('_')[0]!];
  return folder
    ? 'https://files.anomalygames.ai/NeuraKnights/Gear/' +
        folder +
        '/' +
        key +
        '.png'
    : '';
};

/** Default five for a class: strongest two attack, two block, one heal. */
export const defaultLoadout = (cls: HeroClass): string[] => {
  const of = (eff: EffectKind, n: number) =>
    GEAR.filter((g) => g.cls === cls && g.effect === eff)
      .sort((a, b) => b.power - a.power)
      .slice(0, n)
      .map((g) => g.id);
  return of('attack', 2).concat(of('block', 2), of('effect', 1));
};

/** Strongest OWNED five for a class. Gear can be unowned once packs are in the
 *  mix, so the picker and the hero step both go through this. */
export const ownedLoadout = (
  cls: HeroClass,
  gear: Record<string, number> | null | undefined
): string[] => {
  const have = (g: Gear) => (gear ? (gear[g.id] ?? 0) : 1) > 0;
  const of = (eff: EffectKind, n: number) =>
    GEAR.filter((g) => g.cls === cls && g.effect === eff && have(g))
      .sort((a, b) => b.power - a.power)
      .slice(0, n)
      .map((g) => g.id);
  const out = of('attack', 2).concat(of('block', 2), of('effect', 1));
  if (out.length === 5) return out;
  // Pad from anything else owned in the class so the five slots always fill.
  const extra = GEAR.filter(
    (g) => g.cls === cls && have(g) && out.indexOf(g.id) < 0
  ).map((g) => g.id);
  return out.concat(extra).slice(0, 5);
};

/** Every new account owns each class's default five, so a run is playable
 *  before a single pack is bought. */
export const STARTER_GEAR = (): Record<string, number> => {
  const m: Record<string, number> = {};
  for (const cls of HERO_CLASSES)
    for (const id of defaultLoadout(cls)) m[id] = (m[id] ?? 0) + 1;
  return m;
};

/** Resolve a picked id list into gear objects, in slot order. */
export const resolveLoadout = (picked: string[]): Gear[] =>
  picked.map((id) => GEAR_BY_ID[id]).filter((g): g is Gear => !!g);

/** A loadout is legal if it is exactly five pieces, all of the hero's class,
 *  with at most two of any one archetype. The server re-checks this: a forged
 *  loadout is the cheapest way to inflate a score. */
export const loadoutIsLegal = (picked: string[], cls: HeroClass): boolean => {
  if (!Array.isArray(picked) || picked.length !== 5) return false;
  if (new Set(picked).size !== 5) return false;
  const gear = resolveLoadout(picked);
  if (gear.length !== 5) return false;
  if (gear.some((g) => g.cls !== cls)) return false;
  for (const eff of ['attack', 'block', 'effect'] as const) {
    if (gear.filter((g) => g.effect === eff).length > 2) return false;
  }
  return true;
};
