import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { General } from './splash-general.js';
import { GENERAL_GEAR, GENERAL_HEROES } from './splash-style.js';
import { WAVE_ENEMIES } from '../shared/engine/monsters.js';

void test('the general post sells the game, not a day, a place or a foe', () => {
  const html = renderToStaticMarkup(<General />);
  assert.ok(html.includes('GEARLINK'));
  assert.ok(html.includes('BATTLE'));
  for (const h of GENERAL_HEROES) assert.ok(html.includes(h.art));
  assert.ok(!html.includes('DAILY'), 'the daily poster leaked in');
  assert.ok(!html.includes('/Monsters/'), 'a foe leaked in');
  assert.ok(!html.includes('/Background/'), 'a region leaked in');
  for (const [name] of WAVE_ENEMIES)
    assert.ok(!html.includes(name.toUpperCase()), name + ' leaked in');
});

void test('every piece of art on the general post exists', () => {
  for (const p of [...GENERAL_HEROES.map((h) => h.art), ...GENERAL_GEAR])
    assert.ok(existsSync('public' + p), 'missing ' + p);
});
