import assert from 'node:assert/strict';
import test from 'node:test';
import { PACKS } from './economy.js';
import { LEAGUES } from './league.js';
import {
  PRIZE_TABLE,
  SEASON_MIN_DUELS,
  seasonPrizeFor,
  settlePrize,
} from './season.js';

const worth = (trophies: number) =>
  seasonPrizeFor(trophies).reduce(
    (n, r) =>
      n +
      (r.kind === 'coins' ? r.amount : r.kind === 'gems' ? r.amount * 20 : 400),
    0
  );

void test('every league has a prize, and each pays more than the one below', () => {
  assert.equal(PRIZE_TABLE.length, LEAGUES.length);
  for (let i = 1; i < LEAGUES.length; i++)
    assert.ok(
      worth(LEAGUES[i]!.floor) > worth(LEAGUES[i - 1]!.floor),
      LEAGUES[i]!.name + ' pays no more than ' + LEAGUES[i - 1]!.name
    );
});

void test('every pack a prize names is a real pack', () => {
  const ids = new Set(PACKS.map((p) => p.id));
  for (const row of PRIZE_TABLE)
    for (const r of row.rewards)
      if (r.kind === 'pack') assert.ok(ids.has(r.packId), r.packId);
});

void test('a week pays for the league it ended in, only if it was played', () => {
  const b3 = LEAGUES.find((l) => l.name === 'Bronze 3')!;
  assert.equal(settlePrize(7, b3.floor, SEASON_MIN_DUELS - 1), null);
  const p = settlePrize(7, b3.floor, SEASON_MIN_DUELS)!;
  assert.equal(p.league, 'Bronze 3');
  assert.equal(p.week, 7);
  assert.deepEqual(p.rewards, seasonPrizeFor(b3.floor));
});
