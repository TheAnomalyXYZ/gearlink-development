import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildView } from './buildView.js';
import { Screen } from './Screen.js';
import type { GearLinkApp } from '../GearLinkApp.js';
import {
  DUEL_HP,
  FIRST_LOCATION,
  GEAR,
  NO_STATUS,
  enemyDisplayFor,
  Run,
  defaultLoadout,
  foeLoadout,
  makeDuelSide,
  mulberry32,
  QUESTS,
  questStatus,
} from '../../shared/engine/index.js';
import type { Profile, QuestBoard } from '../../shared/api.js';

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
  ascension: 1,
  progress: 3,
  heartPieces: 4,
  hearts: { Hero: 2, Archer: 0, Mage: 10 },
  seenFtue: false,
  seenDuelFtue: false,
  seenDuelSetup: false,
  duelCls: 'Hero',
  duelPicked: defaultLoadout('Hero'),
  duelListed: true,
  duelWeekDuels: 1,
  duelPrize: null,
  flairs: ['apprentice'],
  flair: 'apprentice',
  donated: 300,
};

/** One of each row state: claimable, in progress, claimed. */
const questProgress = {
  metrics: { battles: 3, wins: 1, packs: 1, duelWins: 10 },
  claimed: ['d_packs'],
};
const questBoard: QuestBoard = {
  ...(['daily', 'weekly'] as const).reduce(
    (b, p) => ({
      ...b,
      [p]: QUESTS.filter((q) => q.period === p).map((q) => {
        const s = questStatus(q, questProgress);
        return {
          id: q.id,
          period: q.period,
          title: q.title,
          blurb: q.blurb,
          progress: s.progress,
          target: q.target,
          reward: q.reward,
          claimed: s.claimed,
          claimable: s.claimable,
        };
      }),
    }),
    { daily: [], weekly: [] }
  ),
  dailyResetAt: Date.now() + 5 * 3_600_000,
  weeklyResetAt: Date.now() + 3 * 86_400_000,
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
    locationId: FIRST_LOCATION,
    openLocation: null,
    mapW: 384,
    mapH: 600,
    mapX: 0,
    mapY: -120,
    runWon: false,
    ascended: false,
    heartPiecesEarned: 0,
    heartUpgrading: false,
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
    volumes: { music: 50, sfx: 0 },
    lastGear: null,
    peek: null,
    cardInfo: null,
    shopTab: 'packs',
    invTab: 'packs',
    gearFilter: 'all',
    shopMsg: null,
    openPack: null,
    quests: questBoard,
    questTab: 'daily',
    questClaiming: null,
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
    duelFreeRefreshes: 5,
    duelRefreshCost: 20,
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
    versionInfo: () => ({ app: '0.0.7', build: 'abc1234 2026-10-01' }),
    waveCount: () => run.waveCount,
    waveDisplay: (w: number) =>
      enemyDisplayFor(run.planFor(w).name, run.location.region),
    locationName: () => run.location.name,
    isBossWave: (w: number) => run.isBossWave(w),
    isKingWave: () => false,
    heartsOfClass: () => 2,
    canUpgradeHp: () => true,
    upgradeHp: curried,
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
    pickLocation: curried,
    goMap: noop,
    replayDaily: noop,
    endAction: noop,
    startDuel: curried,
    pickFoe: curried,
    pickShopTab: curried,
    pickQuestTab: curried,
    claimQuest: curried,
    equipFlair: curried,
    donate: curried,
    pickInvTab: curried,
    inspectCard: curried,
    pickGearFilter: curried,
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
    goQuests: noop,
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
    openSettings: noop,
    openSettingsFromMenu: noop,
    closeSettings: noop,
    setMusicVolume: noop,
    setSfxVolume: noop,
    resetVolumes: noop,
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
    setFtueMap: noop,
    mapWrapRef: noop,
    onMapDown: noop,
    onMapMove: noop,
    onMapUp: noop,
    onMapClickCapture: noop,
    mapFrame: () => ({ w: 384, h: 852, x: 0, y: -100 }),
    tapLocation: curried,
    closeLocation: noop,
    setFtueHero: noop,
    setFtueGear: noop,
    setFtueSlots: noop,
    setFtueHomeNav: noop,
    setFtueHeroCta: noop,
    setFtueGearCta: noop,
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

void test("a Daily Battle's end screen reports the day's ladder", () => {
  const daily = { day: 4, locationId: 'caves', endsAt: 0 };
  const won = buildView(
    fakeApp({
      phase: 'end',
      bs,
      endReason: 'won',
      runWon: true,
      daily,
      locationId: 'caves',
      runBanked: 'banked',
      runRank: 2,
      runBest: true,
    })
  );
  assert.equal(won.endTitle, 'DAILY BATTLE #4 WON');
  assert.match(won.endBody, /#2 on today's ladder/);
  assert.equal(won.endActionLabel, 'PLAY AGAIN');
  assert.equal(won.endStats[0].label, "TODAY'S RANK");
  assert.equal(won.endStats[0].value, '#2');
  renders('daily end', {
    phase: 'end',
    bs,
    endReason: 'dead',
    daily,
    locationId: 'caves',
    runBanked: 'pending',
  });

  // Elsewhere on the same post, a map run still ends like a map run.
  const map = buildView(
    fakeApp({ phase: 'end', bs, endReason: 'won', daily, locationId: 'forest' })
  );
  assert.equal(map.endTitle, 'LOCATION TAKEN');
});

void test('every screen renders', () => {
  renders('splash', { phase: 'splash' });
  renders('home', { phase: 'home' });
  renders('home with a location open', {
    phase: 'home',
    openLocation: 'caves',
  });
  renders('home with a locked location open', {
    phase: 'home',
    openLocation: 'castle',
  });
  renders('home at first climb', {
    phase: 'home',
    profile: { ...profile, ascension: 0, progress: 0 },
  });
  renders('hero picker', { phase: 'hero' });
  renders('gear picker', {
    phase: 'gear',
    lastGear: defaultLoadout('Hero')[0],
  });
  renders('battle', { phase: 'battle', bs });
  renders('run end', { phase: 'end', bs, endReason: 'dead' });
  renders('location taken', {
    phase: 'end',
    bs,
    endReason: 'won',
    runWon: true,
  });
  renders('ascended', {
    phase: 'end',
    bs,
    endReason: 'won',
    runWon: true,
    ascended: true,
  });
  renders('shop', { phase: 'shop' });
  renders('shop coins tab', { phase: 'shop', shopTab: 'coins' });
  renders('shop gems tab', { phase: 'shop', shopTab: 'gems' });
  renders('quests', { phase: 'quests' });
  renders('quests weekly tab', { phase: 'quests', questTab: 'weekly' });
  renders('quests loading', { phase: 'quests', quests: null });
  renders('quests mid-claim', { phase: 'quests', questClaiming: 'd_battles' });
  renders('bag', { phase: 'inventory' });
  renders('collection', { phase: 'inventory', invTab: 'gear' });
  renders('collection owned filter', {
    phase: 'inventory',
    invTab: 'gear',
    gearFilter: 'owned',
  });
  renders('collection card info', {
    phase: 'inventory',
    invTab: 'gear',
    cardInfo: GEAR[0]!.id,
  });
  renders('duel lobby', { phase: 'duelLobby' });
  renders('duel lobby rules', { phase: 'duelLobby', duelRulesOpen: true });
  renders('duel opt-in', { phase: 'duelOptIn', flow: 'duel' });
  renders('duel hero picker', { phase: 'hero', flow: 'duel' });
  renders('hero picker with no pieces', {
    phase: 'hero',
    profile: { ...profile, heartPieces: 0 },
  });
  renders('hero picker mid-upgrade', { phase: 'hero', heartUpgrading: true });
  renders('hero picker at full hearts', {
    phase: 'hero',
    heroClass: 'Mage',
    picked: defaultLoadout('Mage'),
  });
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

void test('the pre-fight screen shows both fives and a start', () => {
  const foe = {
    kind: 'player',
    id: 't2_xyz',
    name: 'emberwright',
    cls: 'Mage',
    rating: 1240,
    skill: 0.94,
    blurb: 'Silver - duels as Mage',
    avatar: '',
    picked: [],
  };
  const html = renders('duel confirm', {
    phase: 'duelConfirm',
    duelFoe: foe,
    profile: {
      ...profile,
      duelCls: 'Hero',
      duelPicked: defaultLoadout('Hero'),
    },
  });
  assert.ok(html.includes('START DUEL'), 'no start button');
  assert.ok(html.includes('CHANGE'), 'no way to change the loadout');
  assert.ok(html.includes('u/emberwright'), 'the opponent is not named');
  renders('duel confirm vs bot', {
    phase: 'duelConfirm',
    duelFoe: { ...foe, kind: 'bot', id: 'bot:voss', name: 'Voss' },
  });
});

void test("last week's league prize shows over the app until collected", () => {
  const html = renders('prize', {
    phase: 'home',
    ready: true,
    profile: {
      ...profile,
      duelPrize: {
        week: 1,
        league: 'Gold 3',
        rewards: [
          { kind: 'coins', amount: 580 },
          { kind: 'pack', packId: 'base' },
        ],
      },
    },
  });
  assert.ok(html.includes('WEEKLY LEAGUE PRIZE'));
  assert.ok(html.includes('GOLD 3'));
  assert.ok(html.includes('COLLECT'));
  const lobby = renders('lobby prize table', {
    phase: 'duelLobby',
    duelRulesOpen: true,
  });
  assert.ok(lobby.includes('WEEKLY PRIZES'));
  assert.ok(lobby.includes('duels to qualify'));
});

void test('entering the league warns about the lock and shows the prizes', () => {
  const out = { ...profile, duelListed: false };
  const optIn = renders('opt-in, not entered', {
    phase: 'duelOptIn',
    flow: 'duel',
    profile: out,
  });
  assert.ok(optIn.includes('locked in until the Monday reset'));
  assert.ok(optIn.includes('WIN THIS WEEK IN'));
  assert.ok(optIn.includes('FRIENDLY DUELS ONLY'));
  const modal = renders('lock-in warning', {
    phase: 'duelOptIn',
    flow: 'duel',
    profile: out,
    enterConfirm: 'setup',
  });
  assert.ok(modal.includes('LOCK IN FOR THIS WEEK?'));
  const lobby = renders('lobby, friendly', {
    phase: 'duelLobby',
    profile: out,
  });
  assert.ok(lobby.includes('FRIENDLY DUELS'));
  assert.ok(lobby.includes('ENTER THIS WEEK&#x27;S LEAGUE'));
  const inLobby = renders('lobby, entered', { phase: 'duelLobby' });
  assert.ok(inLobby.includes('ENTERED - LOCKED IN'));
  const inOptIn = renders('opt-in, entered', {
    phase: 'duelOptIn',
    flow: 'duel',
  });
  assert.ok(inOptIn.includes('SAVE MY FIVE'));
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
    'location',
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
  const flair = renders('flair', { phase: 'home', modal: 'flair' });
  assert.ok(flair.includes('WEARING'));
  assert.ok(flair.includes('REMOVE'));
  const loading = renders('war chest loading', {
    phase: 'home',
    modal: 'warchest',
  });
  assert.ok(loading.includes('Opening the chest'));
  const chest = renders('war chest', {
    phase: 'home',
    modal: 'warchest',
    warChest: {
      total: 6_000,
      bonusPct: 10,
      yours: 250,
      top: [
        { username: 'smith', amount: 5_750, isYou: false },
        { username: 'tester', amount: 250, isYou: true },
      ],
      donors: 2,
      resetAt: Date.now() + 3 * 86_400_000,
    },
  });
  assert.ok(chest.includes('+10% BATTLE COINS LIVE'));
  assert.ok(chest.includes('LIVE'));
  assert.ok(chest.includes('smith'));
  assert.ok(chest.includes('(you)'));
  assert.ok(chest.includes('GIVE 50'));
  const empty = renders('war chest empty', {
    phase: 'home',
    modal: 'warchest',
    warChest: {
      total: 0,
      bonusPct: 0,
      yours: 0,
      top: [],
      donors: 0,
      resetAt: Date.now() + 86_400_000,
    },
  });
  assert.ok(empty.includes('NO BONUS YET'));
  assert.ok(empty.includes('No donors yet'));
  const settings = renders('settings', { phase: 'home', modal: 'settings' });
  assert.ok(settings.includes('Background Music'));
  assert.ok(settings.includes('Sound Effects'));
  assert.ok(settings.includes('aria-valuenow="0"'));
  assert.ok(settings.includes('DEFAULT'));
  assert.ok(settings.includes('Version 0.0.7'));
  assert.ok(settings.includes('Build abc1234 2026-10-01'));
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

void test('the quest tab carries an alert dot only while something is claimable', () => {
  const dot = 'background:#FF4D4D;border:1.5px solid #1D1C24;display:block';
  assert.ok(renders('home with claimable', { phase: 'home' }).includes(dot));
  const none: QuestBoard = {
    ...questBoard,
    daily: questBoard.daily.map((q) => ({ ...q, claimable: false })),
    weekly: questBoard.weekly.map((q) => ({ ...q, claimable: false })),
  };
  assert.ok(
    !renders('home with nothing to claim', {
      phase: 'home',
      quests: none,
      // Unopened packs light the BAG dot; this is about the quest dot.
      profile: { ...profile, packs: {} },
    }).includes(dot)
  );
});
