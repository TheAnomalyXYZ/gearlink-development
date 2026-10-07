import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Daily } from './splash-daily.js';
import { DAY_MS, posterFor } from '../shared/daily.js';

/** Noon on the poster's own day, so the battle is still live. */
const LIVE = Date.UTC(2026, 9, 1, 12);

void test('a fresh daily poster shows its date, foe and an open crown', () => {
  const p = posterFor('2026-10-01');
  const html = renderToStaticMarkup(<Daily poster={p} now={LIVE} />);
  assert.ok(html.includes('DAILY BATTLE'));
  assert.ok(
    !html.includes('No.1'),
    'banner should carry the date, not a number'
  );
  assert.ok(html.includes('THU'));
  assert.ok(html.includes('OCT 1'));
  assert.ok(html.includes(`alt="${p.foe}"`));
  assert.ok(html.includes(p.foeArt));
  assert.ok(html.includes(p.backdrop));
  assert.ok(html.includes('the first run takes the crown'));
  assert.ok(html.includes('ENDS IN'));
  assert.ok(html.includes('>12<'), 'twelve hours left at noon');
  assert.ok(!html.includes('ENDED'));
});

void test('the podium shows whoever holds the ladder', () => {
  const p = posterFor(
    '2026-10-01',
    [
      { username: 'alpha', score: 12340, avatar: '/snoo/alpha.png' },
      { username: 'bravo', score: 9000, avatar: '' },
    ],
    7
  );
  const html = renderToStaticMarkup(<Daily poster={p} now={LIVE} />);
  assert.ok(html.includes('u/alpha'));
  assert.ok(html.includes('12,340'));
  assert.ok(html.includes('u/bravo'));
  assert.ok(html.includes('open seat'), 'third seat should be open');
  assert.ok(html.includes('7 raiders'));
});

void test('podium seats show snoovatars, plain Snoo when missing, never class art', () => {
  const p = posterFor(
    '2026-10-01',
    [
      { username: 'alpha', score: 12340, avatar: '/snoo/alpha.png' },
      { username: 'bravo', score: 9000, avatar: '' },
    ],
    2
  );
  const html = renderToStaticMarkup(<Daily poster={p} now={LIVE} />);
  assert.ok(html.includes('/snoo/alpha.png'), 'snoovatar not shown');
  assert.ok(html.includes('/avatars/snoo-default.png'), 'no Snoo fallback');
  assert.ok(!html.includes('_Avatar.png'), 'class art leaked onto the podium');
});

void test('a day that has passed shows final standings and its champion', () => {
  const p = posterFor(
    '2026-10-01',
    [{ username: 'alpha', score: 12340, avatar: '' }],
    4
  );
  const html = renderToStaticMarkup(
    <Daily poster={p} now={p.endsAt + DAY_MS} cta="LIVE" endedCta="CLOSED" />
  );
  assert.ok(html.includes('ENDED'));
  assert.ok(html.includes('FINAL STANDINGS'));
  assert.ok(html.includes('CHAMPION'));
  assert.ok(html.includes('u/alpha took the crown'));
  assert.ok(html.includes('CLOSED') && !html.includes('LIVE'));
  assert.ok(!html.includes('ENDS IN'), 'no countdown on a closed day');
});

void test('a closed day nobody played says the crown went unclaimed', () => {
  const p = posterFor('2026-10-01');
  const html = renderToStaticMarkup(<Daily poster={p} now={p.endsAt} />);
  assert.ok(html.includes('Nobody claimed the crown this day.'));
  assert.ok(!html.includes('CHAMPION'));
});
