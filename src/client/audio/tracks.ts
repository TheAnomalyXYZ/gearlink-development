/**
 * Every sound the game plays, as same-origin paths under `public/art`.
 *
 * Like the art, these are mirrored from the asset CDN by `tools/sync-art.mjs`
 * (the web view's CSP blocks third-party media), so the path after `/art/` is
 * the file's path on the CDN.
 */

export const SFX = {
  click: '/art/dont_die/dd_music/button_press_edit.mp3',
  link: '/art/dont_die/dd_music/player_move.mp3',
  reject: '/art/dont_die/dd_music/side_exhausted.mp3',
  attack: '/art/NeuraKnights/SFX/slash.mp3',
  block: '/art/dont_die/dd_music/gain_block_v2b.mp3',
  heal: '/art/dont_die/dd_music/heal_v2.mp3',
  bomb: '/art/dont_die/dd_music/side_burn.mp3',
  rider: '/art/dont_die/dd_music/buff.mp3',
  hurt: '/art/dont_die/dd_music/damage.mp3',
  blocked: '/art/NeuraKnights/SFX/armor_impact.mp3',
  kill: '/art/dont_die/dd_music/baddie_death_2.mp3',
  victory: '/art/dont_die/dd_music/battle_victory_v2.mp3',
  defeat: '/art/dont_die/dd_music/lose_game_v2.mp3',
  coins: '/art/dont_die/dd_music/get_coins.mp3',
  loot: '/art/dont_die/dd_music/get_other_loot.mp3',
} as const;

export type SfxKey = keyof typeof SFX;

export const BGM = {
  main: '/art/PocketKnights/Audio/bgm_001.mp3',
  duel: '/art/PocketKnights/Audio/Training_bgm_001.mp3',
  Forest: '/art/PocketKnights/Audio/Forest_bgm_001.mp3',
  Bridge: '/art/PocketKnights/Audio/Bridge_bgm_001.mp3',
  Caves: '/art/PocketKnights/Audio/Caves_bgm_001.mp3',
  'Ghost Town': '/art/PocketKnights/Audio/GhostTown_bgm_001.mp3',
  Mountain: '/art/PocketKnights/Audio/Mountain_bgm_001.mp3',
  Castle: '/art/PocketKnights/Audio/Castle_bgm_001.mp3',
} as const;

/** The track for a campaign region, falling back to the home theme. */
export const regionBgm = (region: string): string =>
  Object.entries(BGM).find(([k]) => k === region)?.[1] ?? BGM.main;

export const audioPaths = (): string[] => [
  ...Object.values(SFX),
  ...Object.values(BGM),
];
