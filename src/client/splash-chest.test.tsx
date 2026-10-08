import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Chest } from './splash-chest.js';
import type { WarChest, WarChestPost } from '../shared/api.js';
import {
  WAR_CHEST_ART,
  warChestEndsAt,
  warChestStartsAt,
} from '../shared/engine/warchest.js';

/** The week of Monday 5 Oct 2026, and a Wednesday inside it. */
const WEEK = Math.floor(
  (Math.floor(Date.UTC(2026, 9, 7) / 86_400_000) + 3) / 7
);
const MIDWEEK = Date.UTC(2026, 9, 7, 12);

const chest = (over: Partial<WarChest> = {}): WarChest => ({
  week: WEEK,
  total: 0,
  bonusPct: 0,
  yours: 0,
  top: [],
  donors: 0,
  resetAt: warChestEndsAt(WEEK),
  ...over,
});

const post = (over: Partial<WarChestPost> = {}): WarChestPost => ({
  chest: chest(),
  ended: false,
  coins: 500,
  ...over,
});

void test('the week helpers bracket the week they name', () => {
  assert.ok(warChestStartsAt(WEEK) <= MIDWEEK);
  assert.ok(MIDWEEK < warChestEndsAt(WEEK));
  assert.equal(new Date(warChestStartsAt(WEEK)).getUTCDay(), 1, 'a Monday');
});

void test('an empty chest invites the first gift', () => {
  const html = renderToStaticMarkup(
    <Chest post={post()} signedIn now={MIDWEEK} />
  );
  assert.ok(html.includes('WAR CHEST'));
  assert.ok(html.includes('WEEK OF OCT 5'));
  assert.ok(html.includes('EMPTIES IN 4D 12H'));
  assert.ok(html.includes(WAR_CHEST_ART));
  assert.ok(html.includes('NO BONUS YET'));
  assert.ok(html.includes('be the first'));
  assert.ok(html.includes('GIVE 50'));
  assert.ok(html.includes('YOU HAVE 500'));
});

void test('a filling chest shows its bonus, givers and the reader', () => {
  const html = renderToStaticMarkup(
    <Chest
      post={post({
        chest: chest({
          total: 21_000,
          bonusPct: 25,
          yours: 1_000,
          donors: 2,
          top: [
            { username: 'smith', amount: 20_000, isYou: false },
            { username: 'tester', amount: 1_000, isYou: true },
          ],
        }),
      })}
      signedIn
      now={MIDWEEK}
    />
  );
  assert.ok(html.includes('21,000'));
  assert.ok(html.includes('+25% BATTLE COINS LIVE'));
  assert.ok(html.includes('u/smith 20,000'));
  assert.ok(html.includes('YOU GAVE 1,000'));
  assert.ok(html.includes('2 GIVERS'));
});

void test('a give the wallet cannot cover is disabled', () => {
  const html = renderToStaticMarkup(
    <Chest post={post({ coins: 100 })} signedIn now={MIDWEEK} />
  );
  // 50 is affordable, 250 and 1,000 are not.
  assert.equal(html.match(/disabled=""/g)?.length, 2);
});

void test('a logged-out reader is asked to log in, not offered buttons', () => {
  const html = renderToStaticMarkup(
    <Chest post={post({ coins: null })} signedIn={false} now={MIDWEEK} />
  );
  assert.ok(html.includes('Log in to Reddit'));
  assert.ok(!html.includes('GIVE 50'));
});

void test('a past week is sealed with its final tally', () => {
  const html = renderToStaticMarkup(
    <Chest
      post={post({
        ended: true,
        chest: chest({ total: 6_000, bonusPct: 10, donors: 3 }),
      })}
      signedIn
      now={warChestEndsAt(WEEK) + 1}
      cta="OPEN"
    />
  );
  assert.ok(html.includes('SEALED'));
  assert.ok(html.includes('FINAL TALLY'));
  assert.ok(html.includes('+10% BATTLE COINS REACHED'));
  assert.ok(html.includes('OPEN'));
  assert.ok(!html.includes('GIVE 50'));
});
