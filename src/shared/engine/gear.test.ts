import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEAR,
  GEAR_BY_ID,
  HERO_CLASSES,
  STARTER_GEAR,
  baseIdOf,
  defaultLoadout,
  loadoutIsLegal,
  ownedLoadout,
  riderOf,
} from './gear.js';
import { PACKS, rollPack } from './economy.js';
import { mulberry32 } from './rng.js';

const VARIANTS = GEAR.filter((g) => g.variantOf);

void test('every variant remixes a real base piece for a point of power', () => {
  assert.ok(VARIANTS.length > 0);
  for (const v of VARIANTS) {
    const base = GEAR_BY_ID[v.variantOf!]!;
    assert.ok(base && !base.variantOf, v.id);
    assert.equal(v.cls, base.cls, v.id);
    assert.equal(v.slot, base.slot, v.id);
    assert.equal(v.rarity, base.rarity, v.id);
    assert.equal(v.power, base.power - 1, v.id);
    assert.ok(riderOf(v.id), v.id + ' has a rider');
    // The art loader strips these words out of ids.
    assert.ok(!/Bronze|Silver|Gold|Crumbling/.test(v.id), v.id);
  }
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
});

void test('a loadout never holds a variant beside its own base', () => {
  const v = GEAR_BY_ID['Mage-Weapon-Common-Ember']!;
  const legal = defaultLoadout('Mage');
  const withBase = legal
    .filter((id) => GEAR_BY_ID[id]!.effect !== 'attack')
    .concat(['Mage-Weapon-Common-Base', v.id]);
  assert.equal(withBase.length, 5);
  assert.equal(loadoutIsLegal(withBase, 'Mage'), false);
  const swapped = withBase.map((id) =>
    id === 'Mage-Weapon-Common-Base' ? 'Mage-Weapon-Rare-Base' : id
  );
  assert.equal(loadoutIsLegal(swapped, 'Mage'), true);
});

void test('starter and owned loadouts never pair a variant with its base', () => {
  for (const id of Object.keys(STARTER_GEAR()))
    assert.ok(!GEAR_BY_ID[id]!.variantOf, id);
  for (const cls of HERO_CLASSES) {
    const all = Object.fromEntries(GEAR.map((g) => [g.id, 1]));
    const out = ownedLoadout(cls, all);
    assert.ok(loadoutIsLegal(out, cls), cls);
    const bases = out.map((id) => baseIdOf(GEAR_BY_ID[id]!));
    assert.equal(new Set(bases).size, 5, cls);
  }
});

void test('packs never drop a variant', () => {
  const rand = mulberry32(42);
  for (const pack of PACKS)
    for (let i = 0; i < 400; i++)
      for (const c of rollPack(pack, {}, rand))
        assert.ok(!GEAR_BY_ID[c.id]!.variantOf, pack.id + ' dropped ' + c.id);
});
