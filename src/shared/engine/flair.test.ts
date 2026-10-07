import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FLAIRS,
  FLAIR_TEXT_MAX,
  flairById,
  flairUnlocked,
  newlyUnlockedFlairs,
} from './flair.js';
import type { FlairDef, FlairFacts } from './flair.js';

const NONE: FlairFacts = {
  progress: 0,
  ascension: 0,
  bestScore: 0,
  bestChain: 0,
  trophies: 0,
  donated: 0,
};

const def = (unlock: FlairDef['unlock']): FlairDef => ({
  id: 'x',
  text: 'X',
  blurb: '',
  unlock,
  textColor: 'dark',
  backgroundColor: '#FFFFFF',
});

void test('flair ids are unique and every flair fits on Reddit', () => {
  const ids = FLAIRS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of FLAIRS) {
    assert.ok(f.text.length > 0, f.id + ' has no text');
    assert.ok(f.text.length <= FLAIR_TEXT_MAX, f.id + ' is too long');
    assert.ok(!f.id.includes(':'), f.id + ' would break its hash field');
    assert.match(f.backgroundColor, /^(#[0-9A-Fa-f]{6}|transparent)$/);
  }
  assert.equal(flairById(FLAIRS[0]!.id), FLAIRS[0]);
  assert.equal(flairById('nope'), null);
});

void test('each unlock kind is a threshold on its own fact', () => {
  assert.ok(flairUnlocked(def({ kind: 'free' }), NONE));
  const cases: [FlairDef['unlock'], keyof FlairFacts][] = [
    [{ kind: 'progress', min: 3 }, 'progress'],
    [{ kind: 'ascension', min: 3 }, 'ascension'],
    [{ kind: 'bestScore', min: 3 }, 'bestScore'],
    [{ kind: 'bestChain', min: 3 }, 'bestChain'],
    [{ kind: 'trophies', min: 3 }, 'trophies'],
    [{ kind: 'donated', min: 3 }, 'donated'],
  ];
  for (const [unlock, fact] of cases) {
    assert.equal(flairUnlocked(def(unlock), { ...NONE, [fact]: 2 }), false);
    assert.equal(flairUnlocked(def(unlock), { ...NONE, [fact]: 3 }), true);
  }
});

void test('only flairs not already owned come back as new', () => {
  const all = FLAIRS.map((f) => f.id);
  const rich: FlairFacts = {
    progress: 1e9,
    ascension: 1e9,
    bestScore: 1e9,
    bestChain: 1e9,
    trophies: 1e9,
    donated: 1e9,
  };
  assert.deepEqual(newlyUnlockedFlairs(rich, []), all);
  assert.deepEqual(newlyUnlockedFlairs(rich, all), []);
  assert.deepEqual(newlyUnlockedFlairs(rich, all.slice(1)), all.slice(0, 1));
});
