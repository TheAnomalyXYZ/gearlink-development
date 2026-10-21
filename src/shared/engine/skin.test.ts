import assert from 'node:assert/strict';
import test from 'node:test';
import { GEAR_BY_ID } from './gear.js';
import {
  GEAR_SETS,
  SKINS,
  defaultSkinId,
  newlyUnlockedSkins,
  skinById,
  skinEarned,
  wornSkin,
} from './skin.js';
import type { SkinFacts } from './skin.js';

const NONE: SkinFacts = { level: 1, ascension: 0, gear: {} };

void test('skin ids are unique and fit a hash field', () => {
  const ids = SKINS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SKINS) assert.ok(!s.id.includes(':'), s.id);
});

void test('every class has a free classic and every set resolves', () => {
  for (const cls of ['Hero', 'Archer', 'Mage'] as const)
    assert.equal(skinById(defaultSkinId(cls))?.unlock.kind, 'free');
  for (const set of GEAR_SETS)
    for (const id of set.pieces) {
      assert.ok(GEAR_BY_ID[id], set.id + ' names unknown gear ' + id);
      assert.equal(GEAR_BY_ID[id]!.cls, set.cls, id + ' is another class');
    }
  for (const s of SKINS) {
    const u = s.unlock;
    if (u.kind !== 'set') continue;
    const set = GEAR_SETS.find((g) => g.id === u.set);
    assert.ok(set, s.id + ' names a missing set');
    assert.equal(set.cls, s.cls);
  }
});

void test('each hero has one or two gem-only outfits, never earned by play', () => {
  const gem = SKINS.filter((s) => s.unlock.kind === 'gems');
  for (const cls of ['Hero', 'Archer', 'Mage'] as const) {
    const n = gem.filter((s) => s.cls === cls).length;
    assert.ok(n >= 1 && n <= 2, cls + ' has ' + n + ' gem outfits');
  }
  const maxed: SkinFacts = {
    level: 50,
    ascension: 9,
    gear: Object.fromEntries(Object.keys(GEAR_BY_ID).map((id) => [id, 1])),
  };
  for (const s of gem) assert.equal(skinEarned(s, maxed), false);
  assert.deepEqual(
    newlyUnlockedSkins(maxed, []).sort(),
    SKINS.filter((s) => s.unlock.kind !== 'free' && s.unlock.kind !== 'gems')
      .map((s) => s.id)
      .sort()
  );
});

void test('a set unlocks only with every piece owned', () => {
  const frost = GEAR_SETS.find((s) => s.id === 'mage-frost')!;
  const most = Object.fromEntries(frost.pieces.slice(1).map((id) => [id, 1]));
  assert.ok(
    !newlyUnlockedSkins({ ...NONE, gear: most }, []).includes('mage-frost')
  );
  const all = { ...most, [frost.pieces[0]!]: 1 };
  assert.ok(
    newlyUnlockedSkins({ ...NONE, gear: all }, []).includes('mage-frost')
  );
});

void test('levels unlock in step and owned ones are not re-banked', () => {
  assert.deepEqual(newlyUnlockedSkins({ ...NONE, level: 5 }, []), [
    'hero-verdant',
    'archer-autumn',
    'mage-druid',
  ]);
  assert.deepEqual(
    newlyUnlockedSkins({ ...NONE, level: 5 }, ['hero-verdant']),
    ['archer-autumn', 'mage-druid']
  );
});

void test('wornSkin falls back to classic for locked or foreign outfits', () => {
  assert.equal(wornSkin('Archer', {}, []).id, 'archer-classic');
  assert.equal(
    wornSkin('Archer', { Archer: 'archer-sakura' }, []).id,
    'archer-classic'
  );
  assert.equal(
    wornSkin('Archer', { Archer: 'archer-sakura' }, ['archer-sakura']).id,
    'archer-sakura'
  );
  assert.equal(
    wornSkin('Archer', { Archer: 'mage-druid' }, ['mage-druid']).id,
    'archer-classic'
  );
});
