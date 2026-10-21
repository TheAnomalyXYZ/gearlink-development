/**
 * Hero outfits: the same sprite recoloured, worn per class.
 *
 * Like flair, the catalogue is static and only what each player has UNLOCKED
 * lives in Redis. Every earned unlock reads facts the server already holds
 * (level, ascension, the gear collection), so an outfit can never be earned by
 * anything the client merely claims. The few premium outfits are bought with
 * gems and nothing else.
 *
 * An unlock is kept for good. Gear spent on upgrades never takes back the
 * outfit its set earned.
 */
import type { HeroClass } from './types.js';

/** A full set of one class's gear. Owning every piece unlocks its outfit. */
export type GearSet = {
  id: string;
  cls: HeroClass;
  name: string;
  pieces: string[];
};

export const GEAR_SETS: GearSet[] = [
  {
    id: 'hero-crystal',
    cls: 'Hero',
    name: 'Crystal Set',
    pieces: [
      'Hero-Weapon-Rare-Base',
      'Hero-Off-Hand-Rare-Base',
      'Hero-Chest-Rare-Base',
      'Hero-Hat-Rare-Base',
      'Hero-Necklace-Rare-Base',
    ],
  },
  {
    id: 'hero-dragon',
    cls: 'Hero',
    name: 'Dragon Set',
    pieces: [
      'Hero-Weapon-Epic-Base',
      'Hero-Off-Hand-Epic-Base',
      'Hero-Chest-Epic-Base',
      'Hero-Hat-Epic-Base',
      'Hero-Necklace-Epic-Base',
    ],
  },
  {
    id: 'archer-hunter',
    cls: 'Archer',
    name: 'Hunter Set',
    pieces: [
      'Archer-Weapon-Rare-Base',
      'Archer-Off-Hand-Rare-Base',
      'Archer-Chest-Rare-Base',
      'Archer-Hat-Rare-Base',
      'Archer-Necklace-Rare-Base',
    ],
  },
  {
    id: 'archer-zephyr',
    cls: 'Archer',
    name: 'Zephyr Set',
    pieces: [
      'Archer-Weapon-Epic-Base',
      'Archer-Off-Hand-Epic-Base',
      'Archer-Chest-Epic-Base',
      'Archer-Hat-Epic-Base',
      'Archer-Necklace-Epic-Base',
    ],
  },
  {
    // Every piece carrying the frost rider, plus the hat and amulet named for it.
    id: 'mage-frost',
    cls: 'Mage',
    name: 'Frost Set',
    pieces: [
      'Mage-Weapon-Epic-Base',
      'Mage-Off-Hand-Rare-Base',
      'Mage-Chest-Rare-Base',
      'Mage-Hat-Epic-Base',
      'Mage-Necklace-Epic-Base',
    ],
  },
  {
    id: 'mage-fire',
    cls: 'Mage',
    name: 'Fire Set',
    pieces: [
      'Mage-Weapon-Rare-Base',
      'Mage-Off-Hand-Epic-Base',
      'Mage-Chest-Epic-Base',
      'Mage-Hat-Rare-Base',
      'Mage-Necklace-Rare-Base',
    ],
  },
];

/** What an outfit asks of a player. */
export type SkinUnlock =
  /** The class's own look, worn from the start. */
  | { kind: 'free' }
  /** Player level reached. */
  | { kind: 'level'; min: number }
  /** Times The King has fallen. */
  | { kind: 'ascension'; min: number }
  /** Every piece of one gear set owned. */
  | { kind: 'set'; set: string }
  /** Bought outright with gems. Never earned by play. */
  | { kind: 'gems'; price: number };

export type SkinDef = {
  /** Stored against unlocks, so it never changes once shipped. */
  id: string;
  cls: HeroClass;
  name: string;
  /** One short theme line under the name. */
  tag: string;
  /** The full-body sprite, the same size as the class's own. */
  img: string;
  unlock: SkinUnlock;
};

/** The facts an outfit can be earned by, read off the player's profile. */
export type SkinFacts = {
  level: number;
  ascension: number;
  gear: Record<string, number>;
};

export const SKIN_GEM_PRICE = 250;

const ART = '/art/NeuraKnights/Characters/';
const skinArt = (cls: HeroClass, key: string) =>
  ART + 'Skins/' + cls + '_' + key + '.png';

const classic = (cls: HeroClass): SkinDef => ({
  id: cls.toLowerCase() + '-classic',
  cls,
  name: 'Classic',
  tag: 'Default',
  img: ART + cls + '.png',
  unlock: { kind: 'free' },
});

/** Each class runs the same ladder - levels 5 and 15 and 30, The King, two
 *  gear sets - so no hero is the slow one to dress up. */
export const SKINS: SkinDef[] = [
  classic('Hero'),
  {
    id: 'hero-verdant',
    cls: 'Hero',
    name: 'Verdant Ranger',
    tag: 'Forest',
    img: skinArt('Hero', 'verdant'),
    unlock: { kind: 'level', min: 5 },
  },
  {
    id: 'hero-desert',
    cls: 'Hero',
    name: 'Desert Nomad',
    tag: 'Sand · Wanderer',
    img: skinArt('Hero', 'desert'),
    unlock: { kind: 'level', min: 15 },
  },
  {
    id: 'hero-nightblade',
    cls: 'Hero',
    name: 'Nightblade',
    tag: 'Stealth · Rogue',
    img: skinArt('Hero', 'nightblade'),
    unlock: { kind: 'level', min: 30 },
  },
  {
    id: 'hero-arcane',
    cls: 'Hero',
    name: 'Arcane Scholar',
    tag: 'Magic',
    img: skinArt('Hero', 'arcane'),
    unlock: { kind: 'level', min: 40 },
  },
  {
    id: 'hero-royal',
    cls: 'Hero',
    name: 'Royal Crusader',
    tag: 'Paladin',
    img: skinArt('Hero', 'royal'),
    unlock: { kind: 'ascension', min: 1 },
  },
  {
    id: 'hero-frost',
    cls: 'Hero',
    name: 'Frostguard',
    tag: 'Ice · Winter',
    img: skinArt('Hero', 'frost'),
    unlock: { kind: 'set', set: 'hero-crystal' },
  },
  {
    id: 'hero-ember',
    cls: 'Hero',
    name: 'Ember Lord',
    tag: 'Fire',
    img: skinArt('Hero', 'ember'),
    unlock: { kind: 'set', set: 'hero-dragon' },
  },

  classic('Archer'),
  {
    id: 'archer-autumn',
    cls: 'Archer',
    name: 'Autumn Hunter',
    tag: 'Woodland',
    img: skinArt('Archer', 'autumn'),
    unlock: { kind: 'level', min: 5 },
  },
  {
    id: 'archer-desert',
    cls: 'Archer',
    name: 'Sandstalker',
    tag: 'Desert',
    img: skinArt('Archer', 'desert'),
    unlock: { kind: 'level', min: 15 },
  },
  {
    id: 'archer-moonshade',
    cls: 'Archer',
    name: 'Moonshade',
    tag: 'Night · Stealth',
    img: skinArt('Archer', 'moonshade'),
    unlock: { kind: 'level', min: 30 },
  },
  {
    id: 'archer-royal',
    cls: 'Archer',
    name: 'Royal Marksman',
    tag: 'Royal Guard',
    img: skinArt('Archer', 'royal'),
    unlock: { kind: 'ascension', min: 1 },
  },
  {
    id: 'archer-ember',
    cls: 'Archer',
    name: 'Emberstrike',
    tag: 'Fire',
    img: skinArt('Archer', 'ember'),
    unlock: { kind: 'set', set: 'archer-hunter' },
  },
  {
    id: 'archer-frost',
    cls: 'Archer',
    name: 'Frostbow',
    tag: 'Ice · Winter',
    img: skinArt('Archer', 'frost'),
    unlock: { kind: 'set', set: 'archer-zephyr' },
  },
  {
    id: 'archer-sakura',
    cls: 'Archer',
    name: 'Sakura',
    tag: 'Spring Festival',
    img: skinArt('Archer', 'sakura'),
    unlock: { kind: 'gems', price: SKIN_GEM_PRICE },
  },

  classic('Mage'),
  {
    id: 'mage-druid',
    cls: 'Mage',
    name: 'Druid',
    tag: 'Nature',
    img: skinArt('Mage', 'druid'),
    unlock: { kind: 'level', min: 5 },
  },
  {
    id: 'mage-desert',
    cls: 'Mage',
    name: 'Sand Sultan',
    tag: 'Desert',
    img: skinArt('Mage', 'desert'),
    unlock: { kind: 'level', min: 15 },
  },
  {
    id: 'mage-void',
    cls: 'Mage',
    name: 'Voidcaller',
    tag: 'Shadow',
    img: skinArt('Mage', 'void'),
    unlock: { kind: 'level', min: 30 },
  },
  {
    id: 'mage-royal',
    cls: 'Mage',
    name: 'Royal Vizier',
    tag: 'Court Mage',
    img: skinArt('Mage', 'royal'),
    unlock: { kind: 'ascension', min: 1 },
  },
  {
    id: 'mage-frost',
    cls: 'Mage',
    name: 'Frost Sage',
    tag: 'Ice · Winter',
    img: skinArt('Mage', 'frost'),
    unlock: { kind: 'set', set: 'mage-frost' },
  },
  {
    id: 'mage-ember',
    cls: 'Mage',
    name: 'Pyromancer',
    tag: 'Fire',
    img: skinArt('Mage', 'ember'),
    unlock: { kind: 'set', set: 'mage-fire' },
  },
  {
    id: 'mage-starweaver',
    cls: 'Mage',
    name: 'Starweaver',
    tag: 'Cosmic',
    img: skinArt('Mage', 'starweaver'),
    unlock: { kind: 'gems', price: SKIN_GEM_PRICE },
  },
];

export const skinById = (id: string): SkinDef | null =>
  SKINS.find((s) => s.id === id) ?? null;

export const gearSetById = (id: string): GearSet | null =>
  GEAR_SETS.find((s) => s.id === id) ?? null;

export const skinsFor = (cls: HeroClass): SkinDef[] =>
  SKINS.filter((s) => s.cls === cls);

export const defaultSkinId = (cls: HeroClass): string =>
  cls.toLowerCase() + '-classic';

/** Pieces of a set owned, for the picker's "3/5". */
export const setPiecesOwned = (
  set: GearSet,
  gear: Record<string, number>
): number => set.pieces.filter((id) => (gear[id] ?? 0) > 0).length;

/** True when play has earned the outfit. A gem outfit is never earned. */
export const skinEarned = (def: SkinDef, facts: SkinFacts): boolean => {
  const u = def.unlock;
  switch (u.kind) {
    case 'free':
      return true;
    case 'level':
      return facts.level >= u.min;
    case 'ascension':
      return facts.ascension >= u.min;
    case 'set': {
      const set = gearSetById(u.set);
      return !!set && setPiecesOwned(set, facts.gear) === set.pieces.length;
    }
    case 'gems':
      return false;
  }
};

/** True when a player may wear it: free, or banked in `owned`. */
export const skinOwned = (def: SkinDef, owned: readonly string[]): boolean =>
  def.unlock.kind === 'free' || owned.includes(def.id);

/** Earned outfits not already in `owned`, in catalogue order. Free ones are
 *  never banked - everybody has them. */
export const newlyUnlockedSkins = (
  facts: SkinFacts,
  owned: readonly string[]
): string[] =>
  SKINS.filter(
    (s) =>
      s.unlock.kind !== 'free' && !owned.includes(s.id) && skinEarned(s, facts)
  ).map((s) => s.id);

/** The sprite a class stands in: the worn outfit when it is still legal for
 *  that class, else its own look. */
export const wornSkin = (
  cls: HeroClass,
  worn: Partial<Record<HeroClass, string>>,
  owned: readonly string[]
): SkinDef => {
  const def = skinById(worn[cls] ?? '');
  return def && def.cls === cls && skinOwned(def, owned)
    ? def
    : skinById(defaultSkinId(cls))!;
};

/** How the unlock reads in the picker. */
export const skinUnlockLine = (def: SkinDef): string => {
  const u = def.unlock;
  switch (u.kind) {
    case 'free':
      return 'Default look';
    case 'level':
      return 'Reach level ' + u.min;
    case 'ascension':
      return 'Defeat The King';
    case 'set':
      return 'Collect the ' + (gearSetById(u.set)?.name ?? 'full set');
    case 'gems':
      return 'Shop exclusive';
  }
};
