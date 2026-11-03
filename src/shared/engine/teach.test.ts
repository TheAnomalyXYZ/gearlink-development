import assert from 'node:assert/strict';
import test from 'node:test';
import { LOCATIONS } from './campaign.js';
import { STARTER_GEAR, ownedLoadout, resolveLoadout } from './gear.js';
import { mulberry32 } from './rng.js';
import { Run } from './run.js';
import { findAttackLink, teachableSeed } from './teach.js';

void test('a tutorial seed deals an opening board with an attack link', () => {
  const gear = STARTER_GEAR();
  const picked = ownedLoadout('Hero', gear);
  const loadout = resolveLoadout(picked);
  const rand = mulberry32(7);
  for (let i = 0; i < 50; i++) {
    const seed = teachableSeed(gear, 0, rand);
    // The board the client deals: the post's Hero five at the first location,
    // with levels and hearts that the opening board never reads.
    const board = new Run({
      seed,
      heroClass: 'Hero',
      picked,
      locationId: LOCATIONS[0]!.id,
      hearts: 3,
      levels: picked.map(() => 4),
    }).start().board;
    assert.ok(findAttackLink(board, loadout), `seed ${seed} is unteachable`);
  }
});

void test('progress past the map clamps to its last location', () => {
  const gear = STARTER_GEAR();
  const picked = ownedLoadout('Hero', gear);
  const seed = teachableSeed(gear, 999, mulberry32(3));
  const board = new Run({
    seed,
    heroClass: 'Hero',
    picked,
    locationId: LOCATIONS[LOCATIONS.length - 1]!.id,
  }).start().board;
  assert.ok(findAttackLink(board, resolveLoadout(picked)));
});
