/**
 * ART PATHS
 *
 * Every image and font is served from this app's own `/art` (bundled from
 * `public/art`), not hotlinked from the asset CDN. A Devvit web view runs under
 * a Content Security Policy that blocks third-party `img-src` and `font-src`,
 * so a remote URL renders as nothing at all. `tools/sync-art.mjs` refreshes the
 * local copies from the CDN, and a unit test fails the build if any path the
 * code builds has no file behind it.
 */

/** The whole roster, ordered by the monster table's base_hp ascending. The MAP
 *  is what decides who a battle fields now (see campaign.ts); this list is the
 *  full cast, and the asset test walks it to prove every one has art. */
export const WAVE_ENEMIES: [string, string][] = [
  ['Bandit Scout', 'Forest'],
  ['Bandit Leader', 'Forest'],
  ['Bridge Troll', 'Bridge'],
  ['Cave Bat', 'Caves'],
  ['Slime', 'Caves'],
  ['Cave Mother Slime', 'Caves'],
  ['Wandering Spirit', 'Ghost Town'],
  ['Poltergeist', 'Ghost Town'],
  ['Phantom Warlord', 'Ghost Town'],
  ['Ice Golem', 'Mountain'],
  ['Frost Dragonling', 'Mountain'],
  ['Ice Queen', 'Mountain'],
  ['Castle Guard', 'Castle'],
  ['Champion Knight', 'Castle'],
  ['The King', 'Castle'],
];

/** base_hp from pocket_knights_monster (Training Dummy's 10000 is a practice
 *  target and is excluded from the roster). */
export const MONSTER_BASE_HP: Record<string, number> = {
  'Bandit Scout': 30,
  'Bandit Leader': 40,
  'Bridge Troll': 80,
  'Cave Bat': 100,
  Slime: 120,
  'Cave Mother Slime': 140,
  'Wandering Spirit': 150,
  Poltergeist: 175,
  'Phantom Warlord': 200,
  'Ice Golem': 220,
  'Frost Dragonling': 250,
  'Castle Guard': 300,
  'Champion Knight': 350,
  'Ice Queen': 280,
  'The King': 400,
};

const MONSTER_IMG: Record<string, string> = {
  Slime: 'Slime_v002',
  'Cave Bat': 'CaveBat_v001',
  'Bandit Scout': 'BanditScout_v003',
  Poltergeist: 'Poltergeist_v001',
  'Bandit Leader': 'BanditLeader_v001',
  'Wandering Spirit': 'WanderingSpirit_v001',
  'Cave Mother Slime': 'CaveMotherSlime_v001',
  'Bridge Troll': 'Bridge_Troll_v001',
  'Ice Golem': 'IceGolem_v001',
  'Phantom Warlord': 'PhantomWarlord_v001',
  'Frost Dragonling': 'FrostDragonling_v001',
  'Ice Queen': 'IceQueen_v001',
  'Castle Guard': 'CastleGuard_v001',
  'Champion Knight': 'ChampionKnight_v001',
  'The King': 'King_v001',
};

const BG_FOR: Record<string, string> = {
  Forest: 'Forest',
  Caves: 'Caves',
  Bridge: 'Bridge',
  Mountain: 'Mountain',
  'Ghost Town': 'GhostTown',
  Castle: 'Castle',
};

export const monsterUrlFor = (name: string): string =>
  '/art/NeuraKnights/Monsters/' +
  (MONSTER_IMG[name] ?? 'TrainingDummy_v002') +
  '.png';

export const backgroundUrlFor = (region: string): string =>
  '/art/PocketKnights/Background/' + (BG_FOR[region] ?? 'Forest') + '.png';

/** Frames per idle sheet: each sheet is this many still-sized frames laid out
 *  left to right, built on the sprite's own pixel grid (Bestiary design). */
export const IDLE_FRAMES = 8;

/** Seconds per idle loop. Fliers beat fast, heavies breathe slow; anyone not
 *  listed uses the default. */
const IDLE_SEC: Record<string, number> = {
  'Cave Bat': 0.56,
  'Frost Dragonling': 0.9,
  Slime: 1.1,
  'Cave Mother Slime': 1.5,
  'Wandering Spirit': 1.6,
  Poltergeist: 1.4,
  'Phantom Warlord': 1.8,
  'Bridge Troll': 2.2,
  'Ice Golem': 2.2,
  'The King': 2.2,
};
const IDLE_SEC_DEFAULT = 1.8;

/** The 8-frame idle sheet for a roster monster, or '' when it has none (the
 *  Training Dummy stands still). */
export const idleSheetFor = (name: string): string => {
  const img = MONSTER_IMG[name];
  return img ? '/art/NeuraKnights/Monsters/Idle/' + img + '.png' : '';
};

export const idleSecFor = (name: string): number =>
  IDLE_SEC[name] ?? IDLE_SEC_DEFAULT;

/** Art and name for one planned wave. The region comes from the LOCATION, not
 *  the monster, so a bandit fought in the Castle stands in the Castle. */
export const enemyDisplayFor = (name: string, region: string) => ({
  name,
  region,
  url: monsterUrlFor(name),
  sheet: idleSheetFor(name),
  idleSec: idleSecFor(name),
  bg: backgroundUrlFor(region),
});

export const INTENT_ICON: Record<string, string> = {
  attack: '/art/PocketKnights/Battle/Intent/Attack.png',
  heavy: '/art/PocketKnights/Battle/Intent/Special.png',
  charge: '/art/PocketKnights/Battle/Intent/Defense.png',
};

export const EFFECT_ICON: Record<string, string> = {
  attack: '/art/PocketKnights/Battle/Intent/Attack.png',
  block: '/art/PocketKnights/Battle/Effects/Shield.png',
  effect: '/art/PocketKnights/Item/RegularHealthPotion_v1.png',
};
