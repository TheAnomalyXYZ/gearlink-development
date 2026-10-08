import assert from 'node:assert/strict';
import test from 'node:test';
import { pageKind } from './pageTransition.js';

void test('map tabs slide sideways', () => {
  assert.equal(pageKind('home', 'shop'), 'lateral');
  assert.equal(pageKind('inventory', 'quests'), 'lateral');
  assert.equal(pageKind('home', 'duelLobby'), 'lateral');
});

void test('builds zoom in and back out', () => {
  assert.equal(pageKind('home', 'hero'), 'deeper');
  assert.equal(pageKind('hero', 'gear'), 'deeper');
  assert.equal(pageKind('gear', 'hero'), 'back');
  assert.equal(pageKind('duelConfirm', 'duelLobby'), 'back');
  assert.equal(pageKind('end', 'home'), 'back');
});

void test('fights clash, results slam, the splash irises open', () => {
  assert.equal(pageKind('gear', 'battle'), 'clash');
  assert.equal(pageKind('duelConfirm', 'duel'), 'clash');
  assert.equal(pageKind('battle', 'end'), 'slam');
  assert.equal(pageKind('splash', 'home'), 'iris');
});

void test('pack opening and no-ops are left alone', () => {
  assert.equal(pageKind('shop', 'opening'), null);
  assert.equal(pageKind('opening', 'inventory'), null);
  assert.equal(pageKind('home', 'home'), null);
});
