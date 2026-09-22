import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildView } from './buildView.js';
import { Screen } from './Screen.js';
import type { GearLinkApp } from '../GearLinkApp.js';
import {
  DUEL_HP,
  NO_STATUS,
  Run,
  defaultLoadout,
  foeLoadout,
  makeDuelSide,
  mulberry32,
} from '../../shared/engine/index.js';
import type { Profile } from '../../shared/api.js';

/**
 * Renders every screen the app can be in. The view model is a bag of hundreds
 * of derived strings; a typo in a key or a lookup on a missing table throws at
 * render, not at compile, so this is the check that catches it.
 */

const profile: Profile = {
  username: 'tester',
  coins: 640,
  gems: 60,
  trophies: 1000,
  gear: Object.fromEntries(
    ['Hero', 'Archer', 'Mage'].flatMap((c) =>
      defaultLoadout(c as 'Hero').map((id) => [id, 1])
    )
  ),
  packs: { base: 2, gold: 1 },
  best: { score: 4210, waves: 7, chain: 6, hero: 'Hero' },
  seenFtue: false,
  seenDuelFtue: false,
  seenDuelSetup: false,
  duelCls: 'Hero',
  duelPicked: defaultLoadout('Hero'),
  duelListed: true,
};

const run = new Run({
  seed: 99,
  heroClass: 'Hero',
  picked: defaultLoadout('Hero'),
});
const bs = run.start();
const rng = mulberry32(7);

/** Enough of the app's surface for the view model: state plus the handful of
 *  methods it calls. Behaviour is not under test here - rendering is. */
const fakeApp = (over: Record<string, unknown>): GearLinkApp => {
  const noop = () => undefined;
  const curried = () => noop;
  const state = {
    profile,
    leaderboard: [
      {
        rank: 1,
        username: 'tester',
        score: 4210,
        waves: 7,
        chain: 6,
        hero: 'Hero',
        isYou: true,
      },
      {
        rank: 2,
        username: 'someone',
        score: 900,
        waves: 3,
        chain: 4,
        hero: 'Mage',
        isYou: false,
      },
    ],
    phase: 'home',
    heroClass: 'Hero',
    tab: 'attack',
    picked: defaultLoadout('Hero'),
    bs: null,
    endT: 1,
    coinsEarned: 120,
    endReason: null,
    boardW: 340,
    boardH: 283,
    chain: [],
    busy: false,
    clearing: [],
    hitWho: null,
    drop: null,
    pops: [],
    arming: [],
    detonating: [],
    blasting: [],
    rejecting: [],
    kick: false,
    slashGen: 0,
    hpShown: null,
    pHpShown: null,
    monPhase: null,
    dying: null,
    swing: null,
    lastSwing: null,
    hoverStatus: null,
    ftueStep: null,
    ftuePlace: null,
    ftueSample: { damage: 4, killed: false },
    preview: null,
    modal: null,
    homeMenu: false,
    lastGear: null,
    peek: null,
    cardInfo: null,
    shopTab: 'packs',
    invTab: 'packs',
    shopMsg: null,
    openPack: null,
    flow: 'run',
    runSaved: null,
    duelSetup: null,
    duelSaving: false,
    duelOpponents: [
      {
        kind: 'player',
        id: 't2_abc',
        name: 'duellist',
        cls: 'Archer',
        rating: 1020,
        skill: 0.8,
        blurb: 'Gold 2 - duels as Archer',
        avatar: 'https://example.invalid/snoo.png',
        picked: defaultLoadout('Archer'),
      },
      {
        kind: 'bot',
        id: 'bot:sledge',
        name: 'Sledge',
        cls: 'Hero',
        rating: 1100,
        skill: 0.72,
        blurb: 'Gold 2 - Trades blows. Blocks late.',
        avatar: '',
        picked: [],
      },
    ],
    duelCursor: 0,
    duelLoading: false,
    duelPadded: true,
    challengeUrl: 'https://reddit.com/r/test/comments/abc',

    duel: null,
    duelFoe: null,
    duelOutcome: null,
    duelClock: 180,
    duelTurns: 0,
    duelLog: [],
    duelFtue: null,
    duelW: 300,
    duelH: 250,
    duelMini: 18,
    duelStacked: true,
    duelHit: null,
    foeBeat: 'thinking',
    foeChain: [],
    foeClearing: [],
    foeDrop: null,
    foePops: [],
    foeSaid: '',
    foeJunk: 0,
    foeHitFor: 0,
    ...over,
  };
  return {
    state,
    loadout: () => run.loadout,
    perk: () => run.perk,
    maxHp: () => 40,
    mflags: () => ({
      swiftEnemy: false,
      noSupers: false,
      brittleBlock: false,
      chainFrenzy: false,
      glassKnight: false,
    }),
    enemyAt: (_b: unknown, w: number) => run.enemyForWave(w),
    blockCapFor: (e: { strength: number }) => run.blockCapFor(e as never),
    swingStrength: (e: { strength: number }, h: number) =>
      run.swingStrength(e as never, h),
    intentFor: (e: unknown, m: number, h: number) =>
      run.intentFor(e as never, m, h),
    scoreOf: (s: typeof bs) => s.damageDealt,
    ftueHint: () => null,
    rollUp: (v: number) => v,
    packSummary: () => 'New gear - Rare',
    hoverStatus: curried,
    toggleStatusTip: curried,
    pickHero: curried,
    pickTab: curried,
    toggleGear: curried,
    selectGear: curried,
    clearSlot: curried,
    pageSlot: curried,
    inspectGear: curried,
    goStep: curried,
    startDuel: curried,
    pickShopTab: curried,
    pickInvTab: curried,
    inspectCard: curried,
    buyCoins: curried,
    buyGems: curried,
    buyPack: curried,
    openPack: curried,
    closePeek: noop,
    closeCardInfo: noop,
    closeModal: noop,
    openHow: noop,
    openBoard: noop,
    openPause: noop,
    resume: noop,
    quitRun: noop,
    startRun: noop,
    goLoadout: noop,
    goHome: noop,
    goShop: noop,
    goInventory: noop,
    goDuelLobby: noop,
    goDuelOptIn: noop,
    enterDuelSetup: noop,
    leaveDuelSetup: noop,
    nextDuelSetup: noop,
    skipDuelSetup: noop,
    listAndShare: noop,
    saveUnlisted: noop,
    toggleListed: noop,
    postChallenge: noop,
    openChallenge: noop,
    refreshOpponents: noop,
    leaveDuel: noop,
    duelAgain: noop,
    revealNext: noop,
    revealAll: noop,
    collectPack: noop,
    nextDuelFtue: noop,
    skipDuelFtue: noop,
    advanceFtue: noop,
    endFtue: noop,
    toggleHomeMenu: noop,
    openBoardFromMenu: noop,
    openHowFromMenu: noop,
    onDown: noop,
    onMove: noop,
    onUp: noop,
    onCancel: noop,
    stop: noop,
    boardWrapRef: noop,
    foeWrapRef: noop,
    duelArenaRef: noop,
    setFtueRoot: noop,
    setFtueBoard: noop,
    setFtueEnemy: noop,
    setFtueTrack: noop,
    setFtueCard: noop,
    setFtueFight: noop,
    setFtueHero: noop,
    setFtueGear: noop,
    setFtueSlots: noop,
  } as unknown as GearLinkApp;
};

const renders = (label: string, over: Record<string, unknown>) => {
  const html = renderToStaticMarkup(<Screen v={buildView(fakeApp(over))} />);
  assert.ok(html.length > 500, label + ' rendered almost nothing');
  assert.ok(
    !html.includes('undefined'),
    label + ' leaked an undefined into the markup'
  );
  return html;
};

void test('every screen renders', () => {
  renders('splash', { phase: 'splash' });
  renders('home', { phase: 'home' });
  renders('hero picker', { phase: 'hero' });
  renders('gear picker', {
    phase: 'gear',
    lastGear: defaultLoadout('Hero')[0],
  });
  renders('battle', { phase: 'battle', bs });
  renders('run end', { phase: 'end', bs, endReason: 'dead' });
  renders('shop', { phase: 'shop' });
  renders('shop coins tab', { phase: 'shop', shopTab: 'coins' });
  renders('shop gems tab', { phase: 'shop', shopTab: 'gems' });
  renders('bag', { phase: 'inventory' });
  renders('collection', { phase: 'inventory', invTab: 'gear' });
  renders('duel lobby', { phase: 'duelLobby' });
  renders('duel opt-in', { phase: 'duelOptIn', flow: 'duel' });
  renders('duel hero picker', { phase: 'hero', flow: 'duel' });
});

void test('the duel setup coaching renders at every step', () => {
  for (let i = 0; i < 4; i++)
    renders('duel setup ' + i, {
      phase: ['hero', 'hero', 'gear', 'duelOptIn'][i],
      flow: 'duel',
      duelSetup: i,
      lastGear: defaultLoadout('Hero')[0],
    });
});

void test('a lobby with nobody listed still fills with bots', () => {
  const html = renders('empty pool', {
    phase: 'duelLobby',
    duelOpponents: [],
    duelPadded: true,
    duelLoading: true,
  });
  assert.ok(html.includes('REFRESH'), 'the refresh control went missing');
});

void test('the battle HUD renders through a whole turn cycle', () => {
  for (const over of [
    { swing: 'attack' },
    { swing: 'heavy' },
    { swing: 'landed', lastSwing: { damage: 6, blocked: 2 } },
    { monPhase: 'dying', dying: { name: 'Slime', url: 'x', bg: 'y' } },
    { monPhase: 'empty' },
    { monPhase: 'spawning' },
    { busy: true, clearing: [0, 1, 2] },
    { arming: [4], detonating: [4], blasting: [3, 5] },
    { chain: [0, 1, 2], preview: { text: 'ATK 8', color: '#E75757' } },
    { hoverStatus: 'block' },
    { hoverStatus: 'burn' },
  ])
    renders('battle ' + JSON.stringify(over).slice(0, 40), {
      phase: 'battle',
      bs,
      ...over,
    });
});

void test('a duel renders on both layouts and at its end', () => {
  const duel = {
    me: makeDuelSide('Hero', run.loadout, 1, rng),
    foe: makeDuelSide('Mage', foeLoadout('Mage', []), 0.9, rng),
  };
  const foe = {
    kind: 'player',
    id: 't2_xyz',
    name: 'emberwright',
    cls: 'Mage',
    rating: 1240,
    skill: 0.94,
    blurb: '',
    avatar: '',
    picked: [],
  };
  renders('duel stacked', { phase: 'duel', duel, duelFoe: foe });
  renders('duel compact', {
    phase: 'duel',
    duel,
    duelFoe: foe,
    duelStacked: false,
  });
  renders('duel with statuses', {
    phase: 'duel',
    duelFoe: foe,
    duel: {
      me: {
        ...duel.me,
        stx: { ...NO_STATUS, strength: 2, grit: 1 },
        hp: DUEL_HP - 12,
      },
      foe: { ...duel.foe, stx: { ...NO_STATUS, burn: 3, mark: 1 } },
    },
  });
  renders('duel over', {
    phase: 'duel',
    duel,
    duelFoe: foe,
    duelOutcome: { kind: 'win', won: true, delta: 22 },
  });
  renders('duel primer', { phase: 'duel', duel, duelFoe: foe, duelFtue: 0 });
});

void test('the coaching overlay renders at every step', () => {
  const place = {
    side: 'above' as const,
    offset: 40,
    hole: { top: 10, left: 10, w: 80, h: 30 },
  };
  for (const step of [
    'fight',
    'hero',
    'gear',
    'orbs',
    'drag',
    'damage',
    'waves',
  ])
    renders('ftue ' + step, {
      phase: 'battle',
      bs,
      ftueStep: step,
      ftuePlace: place,
    });
});

void test('modals render', () => {
  renders('pause', { phase: 'battle', bs, modal: 'pause' });
  renders('how to play', { phase: 'home', modal: 'how' });
  renders('ladder', { phase: 'home', modal: 'board' });
});

void test('a pack open renders sealed, revealed and collectable', () => {
  const cards = [{ gear: run.loadout[0]!, isNew: true, refund: 0 }];
  const base = { phase: 'opening' as const };
  renders('sealed', {
    ...base,
    openPack: {
      id: 'base',
      token: 't',
      cards,
      shown: 0,
      torn: false,
      from: 'shop',
    },
  });
  renders('revealed', {
    ...base,
    openPack: {
      id: 'base',
      token: 't',
      cards,
      shown: 1,
      torn: true,
      from: 'shop',
    },
  });
});
