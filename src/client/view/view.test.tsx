import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildView } from './buildView.js';
import { Screen } from './Screen.js';
import {
  DUEL_HP,
  GEAR,
  NO_STATUS,
  defaultLoadout,
  foeLoadout,
  makeDuelSide,
} from '../../shared/engine/index.js';
import type { QuestBoard } from '../../shared/api.js';

import {
  bs,
  demoApp as fakeApp,
  profile,
  questBoard,
  rng,
  run,
} from './demoApp.js';

/**
 * Renders every screen the app can be in. The view model is a bag of hundreds
 * of derived strings; a typo in a key or a lookup on a missing table throws at
 * render, not at compile, so this is the check that catches it.
 */

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
  renders('knights', { phase: 'knights' });
  renders('knights as archer', { phase: 'knights', heroClass: 'Archer' });
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
  renders('shop outfits tab', { phase: 'shop', shopTab: 'outfits' });
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
  const cards = [{ gear: run.loadout[0]!, isNew: true, owned: 1 }];
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

void test('the knights page lays out outfits and the shop sells the exclusives', () => {
  const knights = buildView(fakeApp({ phase: 'knights', heroClass: 'Mage' }));
  assert.equal(knights.isKnights, true);
  assert.equal(knights.heroStepTitle, 'KNIGHTS');
  assert.ok(knights.knightsSkins.length > 1);
  assert.equal(knights.heroStepActions.length, 1);
  // The page shows outfits in full, so the plate's picker button stands down.
  assert.ok(
    knights.heroCards.every(
      (h: { skinDisplay: string }) => h.skinDisplay === 'none'
    )
  );

  const shop = buildView(fakeApp({ phase: 'shop', shopTab: 'outfits' }));
  assert.equal(shop.outfitPaneDisplay, 'flex');
  assert.equal(shop.packPaneDisplay, 'none');
  assert.ok(shop.shopSkins.length >= 3);
  // Every exclusive names the hero it dresses, since the tab mixes classes.
  assert.ok(shop.shopSkins.every((k: { sub: string }) => k.sub.length > 0));

  const home = buildView(fakeApp({ phase: 'home' }));
  assert.equal(typeof home.heroChip.run, 'function');
});
