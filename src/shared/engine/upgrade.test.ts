import assert from 'node:assert/strict';
import test from 'node:test';
import { GEAR_BY_ID, defaultLoadout, resolveLoadout } from './gear.js';
import { rollPack, packById } from './economy.js';
import { Run } from './run.js';
import { verifyRun } from './replay.js';
import {
  GEAR_MAX_LEVEL,
  UPGRADE_COINS_BASE,
  gearLevelOf,
  leveledPower,
  spareCopies,
  upgradeBlock,
  upgradeCost,
} from './upgrade.js';

void test('every level-up costs more copies and coins than the last', () => {
  let prev = { copies: 0, coins: 0 };
  for (let L = 1; L < GEAR_MAX_LEVEL; L++) {
    const c = upgradeCost('Rare', L)!;
    assert.ok(c.copies >= prev.copies, 'copies at ' + L);
    assert.ok(c.coins > prev.coins, 'coins at ' + L);
    prev = c;
  }
  assert.equal(upgradeCost('Rare', GEAR_MAX_LEVEL), null);
  assert.equal(upgradeCost('Common', 1)!.coins, UPGRADE_COINS_BASE.Common);
  assert.ok(
    upgradeCost('Legendary', 1)!.coins > upgradeCost('Common', 1)!.coins
  );
});

void test('the card itself is never a spare copy', () => {
  assert.equal(spareCopies(0), 0);
  assert.equal(spareCopies(1), 0);
  assert.equal(spareCopies(4), 3);
});

void test('upgradeBlock names what is missing', () => {
  const c = upgradeCost('Common', 1)!;
  assert.equal(upgradeBlock('Common', 0, 1, 9999), 'unowned');
  assert.equal(upgradeBlock('Common', 1, 1, 9999), 'copies');
  assert.equal(upgradeBlock('Common', 1 + c.copies, 1, c.coins - 1), 'coins');
  assert.equal(upgradeBlock('Common', 1 + c.copies, 1, c.coins), null);
  assert.equal(upgradeBlock('Common', 99, GEAR_MAX_LEVEL, 9999), 'maxed');
});

void test('levels raise power and junk levels read as 1', () => {
  assert.equal(leveledPower(10, 1), 10);
  assert.equal(leveledPower(10, 2), 11);
  assert.ok(leveledPower(10, GEAR_MAX_LEVEL) > leveledPower(10, 5));
  assert.equal(gearLevelOf(undefined, 'x'), 1);
  assert.equal(gearLevelOf({ x: 99 }, 'x'), GEAR_MAX_LEVEL);
  const picked = defaultLoadout('Hero');
  const base = resolveLoadout(picked);
  const up = resolveLoadout(picked, [3, 1, 1, 1, 1]);
  assert.equal(up[0]!.power, leveledPower(base[0]!.power, 3));
  assert.equal(up[1]!.power, base[1]!.power);
  assert.equal(GEAR_BY_ID[picked[0]!]!.power, base[0]!.power);
});

void test('a duplicate pull stacks instead of refunding', () => {
  const pack = packById('base')!;
  const [first] = rollPack(pack, {}, () => 0);
  const [again] = rollPack(pack, { [first!.id]: 2 }, () => 0);
  assert.deepEqual(first, { id: first!.id, isNew: true, owned: 1 });
  assert.deepEqual(again, { id: first!.id, isNew: false, owned: 3 });
});

void test('the replay fights at the submitted levels and rejects bad ones', () => {
  const picked = defaultLoadout('Hero');
  const levels = [5, 5, 5, 5, 5];
  const run = new Run({ seed: 7, heroClass: 'Hero', picked, levels });
  assert.equal(
    run.loadout[0]!.power,
    leveledPower(GEAR_BY_ID[picked[0]!]!.power, 5)
  );
  const ok = verifyRun({
    seed: 7,
    heroClass: 'Hero',
    picked,
    moves: [],
    levels,
  });
  assert.ok(ok.ok);
  const bad = verifyRun({
    seed: 7,
    heroClass: 'Hero',
    picked,
    moves: [],
    levels: [GEAR_MAX_LEVEL + 1, 1, 1, 1, 1],
  });
  assert.deepEqual(bad, { ok: false, reason: 'bad gear levels' });
});
