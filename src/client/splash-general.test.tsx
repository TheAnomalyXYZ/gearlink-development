import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { General } from './splash-general.js';
import { GENERAL_GEAR, GENERAL_HEROES, GENERAL_TILES } from './splash-style.js';
import { WAVE_ENEMIES } from '../shared/engine/monsters.js';

void test('the general post sells the game, not a day, a place or a foe', () => {
  const html = renderToStaticMarkup(<General />);
  assert.ok(html.includes('GEARLINK'));
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

void test('the general post leads with a live board, a 6-link chain traced through it', () => {
  const html = renderToStaticMarkup(<General />);
  for (const t of GENERAL_TILES)
    assert.ok(html.includes(t.icon), 'tile art missing ' + t.icon);
  assert.equal(
    html.match(/min-h-0 glb-tile/g)?.length,
    6,
    'chain is not 6 links'
  );
  assert.ok(html.includes('6-LINK'), 'the link burst is missing');
  for (const t of GENERAL_TILES)
    assert.ok(existsSync('public' + t.icon), 'missing ' + t.icon);
});
