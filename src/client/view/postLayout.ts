/**
 * Post layout: the battle filling a wide inline post (Reddit's 732x512 feed
 * frame). Everything is sized from the measured post container: the scene
 * strip from the height, the tile size from what is left, the side gutters
 * only if the width allows.
 *
 * Three modes: `wide` (board centred, hero and combo panels either side),
 * `narrow` (a hero row above the board instead), and `launch` (too small to
 * play - the enemy and a FIGHT button that opens the full game).
 */
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { RunState } from '../../shared/engine/index.js';

const TOP = 28,
  GAP = 12,
  PADB = 12,
  FP = 8,
  ROW = 28;

/** Each battle background's bottom rows, darkening, to fill past the art. */
const FLOOR: Record<string, readonly [string, string, string, string]> = {
  Forest: ['#968b5a', '#656040', '#393929', '#1e221a'],
  Bridge: ['#61522f', '#433c25', '#28281b', '#171b15'],
  Caves: ['#604c47', '#433834', '#282623', '#171a18'],
  GhostTown: ['#365248', '#283c35', '#1b2723', '#131b18'],
  Mountain: ['#888e9b', '#5c626a', '#343a3d', '#1c2222'],
  Castle: ['#54333b', '#3b282d', '#241e1f', '#161817'],
};
/** Where a character's feet touch each background, in source px of the
 *  480x932 art. */
const GROUND: Record<string, number> = {
  Forest: 448,
  Bridge: 425,
  Caves: 445,
  GhostTown: 415,
  Mountain: 445,
  Castle: 395,
};

/** The frame holds the game's own board: 6x5 tiles with 4px gaps, 10px/8px
 *  inner pad, 8px frame pad. */
const tileFor = (frameH: number): number =>
  Math.min(64, Math.floor((frameH - 16 - 2 * FP) / 5));
const fw = (t: number): number => 6 * t + 20 + 2 * FP;
const fh = (t: number): number => 5 * t + 16 + 2 * FP;

/** The app members the post layout reads and drives. */
export type PostApp = {
  postMode: boolean;
  postSizing: boolean;
  setPostRoot: (el: HTMLDivElement | null) => void;
  clearChain: () => void;
  openFullGame: (e: MouseEvent, go?: string) => void;
  setState: (s: { boardW: number; boardH: number }) => void;
};

export type PostState = {
  phase: string;
  postW: number;
  postH: number;
  boardW: number;
  chain: number[];
  preview: { effect?: string; val?: number } | null;
  bs: RunState | null;
  heroClass: string;
};

/** The parts of the battle view the post reads. */
export type PostBattle = {
  intentTipName?: string;
  intentValue?: string;
  intentSwing?: number;
  meterNotches?: Array<{ fill: string }>;
  blockLabel?: string;
  bgUrl?: string;
  perkText?: string;
};

export const postVm = (app: PostApp, st: PostState, b: PostBattle) => {
  const on = app.postMode && st.phase === 'battle';
  const base = {
    isPostBattle: on,
    isBattleStd: st.phase === 'battle' && !app.postMode,
    postRootRef: app.setPostRoot,
  };
  if (!on) return { ...base, post: null };
  const W = st.postW || 740,
    H = st.postH || 512;
  const scene = Math.max(120, Math.min(200, Math.round(H * 0.293)));
  let frameH = H - TOP - scene - GAP - PADB;
  let tile = tileFor(frameH);
  let mode: 'wide' | 'narrow' | 'launch' = 'wide';
  let frameW = fw(tile);
  if (tile < 40) mode = 'launch';
  else if (W < frameW + 2 * 140 + 32) {
    mode = 'narrow';
    tile = tileFor(frameH - ROW - 6);
    if (tile < 40) mode = 'launch';
  }
  tile = Math.max(40, tile);
  frameW = fw(tile);
  frameH = fh(tile);
  const boardTop = TOP + scene + GAP + (mode === 'narrow' ? ROW + 6 : 0);
  // the enemy at a whole number of CSS px per art pixel (sheets hold 120 art px)
  const ks = Math.max(1, Math.floor((scene + TOP - 30) / 120));
  const sprite = 120 * ks;
  // keep the board's measured size in step with this layout
  if (Math.abs((st.boardW || 0) - (tile * 6 + 20)) > 1 && !app.postSizing) {
    app.postSizing = true;
    requestAnimationFrame(() => {
      app.postSizing = false;
      app.setState({ boardW: tile * 6 + 20, boardH: tile * 5 + 16 });
    });
  }
  const chain = st.chain;
  const p = st.preview,
    k = chain.length;
  const what =
    p && p.effect === 'attack'
      ? ' DMG'
      : p && p.effect === 'block'
        ? ' BLOCK'
        : ' HEAL';
  const comboText = !k
    ? ''
    : k < 3
      ? 'LINK ' + k
      : 'LINK ' + k + ' → ' + (p && p.val != null ? p.val + what : '');
  const turns = st.bs ? st.bs.turnsUsed : 0;
  const name = String(b.intentTipName ?? '').toUpperCase(),
    v = b.intentValue;
  const left = (b.meterNotches ?? []).filter(
    (x) => x.fill !== '#FFF2B0'
  ).length;
  const hit = /ATTACK|STRIKE|HIT|SLASH|SMASH/.test(name),
    guard = /BLOCK|GUARD|SHIELD/.test(name);
  const n = Math.max(1, left);
  const intentText =
    name === 'WINDING UP'
      ? 'ATTACKING IN ' + n + ' TURN' + (n === 1 ? '' : 'S')
      : (hit
          ? 'HITS FOR ' + v + (left > 1 ? '' : ' NEXT TURN')
          : guard
            ? 'BLOCKS ' + v
            : name + (v != null && v !== '' ? ' ' + v : '')) +
        (left > 1 ? ' IN ' + left : '');
  // the art is placed by its ground line, so the ground row lands exactly
  // where the enemy's feet are
  const bgName =
    (/Background\/([A-Za-z]+)\.png/.exec(b.bgUrl ?? '') ?? [])[1] ?? 'Forest';
  const groundY = GROUND[bgName] ?? 448;
  const FL = FLOOR[bgName] ?? FLOOR['Forest']!;
  const DROP = GAP - 4,
    HPROW = 14;
  const feetY = TOP + DROP + scene - HPROW;
  // the wide art (64 source px more scene painted past each edge), zoomed out
  // 15% from cover-width and raised 25px
  const sk = (W / 480) * 0.85;
  const bgY = Math.round(feetY - groundY * sk) - 25;
  const artEnd = bgY + Math.round(932 * sk);
  const gutW = Math.min(170, Math.floor((W - frameW) / 2) - 24);
  const block = Number(b.blockLabel) || 0;
  const swing = Number(b.intentSwing) || 0;
  return {
    ...base,
    post: {
      wide: mode === 'wide',
      narrow: mode === 'narrow',
      launch: mode === 'launch',
      sceneH: scene + 'px',
      bgSize: Math.round(608 * sk) + 'px auto',
      bgPos: 'center ' + bgY + 'px',
      bgWide: '/fx/bg-wide/' + bgName + '.png',
      veilTop: boardTop + 'px',
      sceneTop: TOP + DROP + 'px',
      floorTop: artEnd + 'px',
      floorDisplay: artEnd < H ? 'flex' : 'none',
      floor1: FL[0],
      floor2: FL[1],
      floor3: FL[2],
      floor: FL[3],
      spriteW: Math.round(sprite) + 'px',
      launchSprite: Math.round(Math.min(sprite * 1.2, H * 0.45)) + 'px',
      frameWpx: frameW + 'px',
      frameHpx: frameH + 'px',
      boardTop: boardTop + 'px',
      rowTop: TOP + scene + GAP + 'px',
      gutW: gutW + 'px',
      gutTop: boardTop + frameH / 2 + 'px',
      gutL: Math.round(W / 2 - frameW / 2 - 16 - gutW) + 'px',
      gutR: Math.round(W / 2 + frameW / 2 + 16) + 'px',
      comboN: String(k),
      comboText,
      comboDisplay: k ? 'flex' : 'none',
      comboColor: k >= 6 ? '#FFFFFF' : '#FFF2B0',
      comboAnim: k
        ? 'glChipPop' + (k % 2 ? 'A' : 'B') + ' 220ms cubic-bezier(.3,1.8,.5,1)'
        : 'none',
      hint:
        turns < 2
          ? 'Drag across 3+ matching tiles to link. Link 6+ to forge a bomb.'
          : '',
      hintDisplay: turns < 2 && !k ? 'block' : 'none',
      blockDisplay: block > 0 ? 'flex' : 'none',
      blockText: 'YOU ARE BLOCKING FOR ' + block,
      intentIconDisplay: name === 'WINDING UP' ? 'none' : 'block',
      intentPadL: name === 'WINDING UP' ? '8px' : '4px',
      dmgDisplay: swing > 0 ? 'block' : 'none',
      dmgText: 'YOU WILL TAKE ' + Math.max(0, swing - block) + ' DAMAGE',
      intentText,
      intentColor: hit ? '#FF8A80' : guard ? '#7FF0EA' : '#FFF2B0',
      heroName: st.heroClass.toUpperCase(),
      perk: String(b.perkText ?? '').replace(/^\s*[A-Z]+\s+(?=[+-])/, ''),
      clear: app.clearChain,
      expand: (e: ReactMouseEvent) => app.openFullGame(e.nativeEvent, 'resume'),
    },
  };
};

export type PostView = NonNullable<ReturnType<typeof postVm>['post']>;
