/** Roster ordered by the monster table's base_hp ascending, so each wave is a
 *  bigger pool than the last. Past the roster the last entry keeps compounding,
 *  which is what makes the gauntlet endless. */
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
  'https://files.anomalygames.ai/NeuraKnights/Monsters/' +
  (MONSTER_IMG[name] ?? 'TrainingDummy_v002') +
  '.png';

export const backgroundUrlFor = (region: string): string =>
  'https://files.anomalygames.ai/PocketKnights/Background/' +
  (BG_FOR[region] ?? 'Forest') +
  '.png';

/** The roster entry a wave fields. Past the end of the list the final entry
 *  repeats, with its stats compounding. */
export const enemyDisplayForWave = (wave: number) => {
  const e = WAVE_ENEMIES[Math.min(wave - 1, WAVE_ENEMIES.length - 1)]!;
  return {
    name: e[0],
    region: e[1],
    url: monsterUrlFor(e[0]),
    bg: backgroundUrlFor(e[1]),
  };
};

export const INTENT_ICON: Record<string, string> = {
  attack:
    'https://files.anomalygames.ai/PocketKnights/Battle/Intent/Attack.png',
  heavy:
    'https://files.anomalygames.ai/PocketKnights/Battle/Intent/Special.png',
  charge:
    'https://files.anomalygames.ai/PocketKnights/Battle/Intent/Defense.png',
};

export const EFFECT_ICON: Record<string, string> = {
  attack:
    'https://files.anomalygames.ai/PocketKnights/Battle/Intent/Attack.png',
  block:
    'https://files.anomalygames.ai/PocketKnights/Battle/Effects/Shield.png',
  effect:
    'https://files.anomalygames.ai/PocketKnights/Item/RegularHealthPotion_v1.png',
};
