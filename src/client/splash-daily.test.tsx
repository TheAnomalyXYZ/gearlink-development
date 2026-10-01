import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Daily } from './splash-daily.js';
import { posterFor } from '../shared/daily.js';

void test('a fresh daily poster shows its number, date, foe and an open crown', () => {
  const p = posterFor('2026-10-01');
  const html = renderToStaticMarkup(<Daily poster={p} />);
  assert.ok(html.includes('DAILY BATTLE'));
  assert.ok(html.includes('No.1'));
  assert.ok(html.includes('OCT 1'));
  assert.ok(html.includes(p.foe.toUpperCase()));
  assert.ok(html.includes(p.foeArt));
  assert.ok(html.includes(p.backdrop));
  assert.ok(html.includes('the first run takes the crown'));
  assert.ok(html.includes('NEXT DAILY BATTLE IN'));
});

void test('the podium shows whoever holds the ladder', () => {
  const p = posterFor(
    '2026-10-01',
    [
      { username: 'alpha', score: 12340, hero: 'Mage' },
      { username: 'bravo', score: 9000, hero: 'Archer' },
    ],
    7
  );
  const html = renderToStaticMarkup(<Daily poster={p} />);
  assert.ok(html.includes('u/alpha'));
  assert.ok(html.includes('12,340'));
  assert.ok(html.includes('u/bravo'));
  assert.ok(html.includes('open seat'), 'third seat should be open');
  assert.ok(html.includes('7 raiders'));
});
