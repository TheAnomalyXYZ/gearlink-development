import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEAR,
  HERO_PERKS,
  MAP_ART,
  MIN_LINK,
  NO_STATUS,
} from '../../shared/engine/index.js';
import type { Gear } from '../../shared/engine/index.js';
import { MUTATORS } from './appState.js';
import { duelLogLine, linkPreview, swingPop } from './feedback.js';
import { clampPan, panBounds } from './mapPan.js';
import { packSummary, toOpenCards } from './packs.js';
import { Timers } from './timers.js';
import type { OpenState } from './appState.js';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

void test('a timer key holds one handle: rescheduling cancels the old beat', async () => {
  const t = new Timers<'a'>();
  const fired: string[] = [];
  t.after('a', 5, () => fired.push('first'));
  t.after('a', 5, () => fired.push('second'));
  await wait(20);
  assert.deepEqual(fired, ['second']);
  assert.equal(t.has('a'), false);
});

void test('a beat can reschedule its own key from inside its callback', async () => {
  const t = new Timers<'a'>();
  const fired: number[] = [];
  t.after('a', 1, () => {
    fired.push(1);
    t.after('a', 1, () => fired.push(2));
  });
  await wait(20);
  assert.deepEqual(fired, [1, 2]);
});

void test('clearAll stops timeouts and intervals alike', async () => {
  const t = new Timers<'a' | 'b'>();
  let n = 0;
  t.after('a', 5, () => n++);
  t.every('b', 2, () => n++);
  t.clearAll();
  await wait(20);
  assert.equal(n, 0);
});

void test('the map pan never leaves the artwork', () => {
  const w = 300;
  const h = 400;
  const { minX, minY, scale } = panBounds(w, h);
  assert.ok(MAP_ART.w * scale >= w && MAP_ART.h * scale >= h);
  assert.deepEqual(clampPan(50, 50, w, h), { x: 0, y: 0 });
  assert.deepEqual(clampPan(-1e6, -1e6, w, h), { x: minX, y: minY });
});

const attackOrb = GEAR.find((g) => g.effect === 'attack')!;

void test('a short link previews its progress, not a payout', () => {
  const p = linkPreview({
    chain: [0],
    board: [0],
    loadout: [attackOrb],
    perk: HERO_PERKS.Hero,
    sx: { ...NO_STATUS },
    foeSx: { ...NO_STATUS },
    duelling: false,
    mutators: MUTATORS,
  });
  assert.equal(p?.text, 'LINK 1 / ' + MIN_LINK);
});

void test('a full attack link previews its damage, and a Mark says so', () => {
  const chain = Array.from({ length: MIN_LINK }, (_, i) => i);
  const base = {
    chain,
    board: chain.map(() => 0),
    loadout: [attackOrb],
    perk: HERO_PERKS.Hero,
    sx: { ...NO_STATUS },
    duelling: false,
    mutators: MUTATORS,
  };
  const plain = linkPreview({ ...base, foeSx: { ...NO_STATUS } });
  const marked = linkPreview({ ...base, foeSx: { ...NO_STATUS, mark: 2 } });
  assert.match(plain!.text, new RegExp('from ' + MIN_LINK + ' orbs'));
  assert.doesNotMatch(plain!.text, /MARKED/);
  assert.match(marked!.text, /MARKED/);
});

void test('a swing that is fully blocked says BLOCKED', () => {
  assert.equal(swingPop(0).text, 'BLOCKED');
  assert.equal(swingPop(7).text, '-7');
});

void test('the duel log names the biggest thing a move did', () => {
  const line = duelLogLine(
    { attack: 4, blockGain: 0, heal: 0, junkSend: 2 },
    'You'
  );
  assert.equal(line, 'You hit for 4, sent 2 junk');
});

const card = (gear: Gear, isNew: boolean, refund: number) => ({
  gear,
  isNew,
  refund,
});

void test('pack cards drop unknown pulls and the summary names the best one', () => {
  const [a, b] = [GEAR[0]!, GEAR[1]!];
  const cards = toOpenCards([
    { id: a.id, isNew: true, refund: 0 },
    { id: 'no-such-gear', isNew: true, refund: 0 },
  ]);
  assert.equal(cards.length, 1);
  const op: OpenState = {
    id: 'p',
    token: 't',
    cards: [card(a, true, 0), card(b, false, 5)],
    shown: 0,
    torn: false,
    from: 'shop',
  };
  const s = packSummary(op);
  assert.match(s, /^1 new piece/);
  assert.match(s, /\+5 coins from duplicates/);
  assert.match(s, /best: /);
});
