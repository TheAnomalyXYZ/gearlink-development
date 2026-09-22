import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  COIN_ICON,
  EFFECT_ICON,
  GEAR,
  GEM_ICON,
  HERO_PERKS,
  INTENT_ICON,
  JUNK_ICON,
  LEAGUES,
  PACKS,
  RIDERS,
  WAVE_ENEMIES,
  backgroundUrlFor,
  getGearImageUrl,
  monsterUrlFor,
} from './index.js';

/**
 * A Devvit web view's CSP blocks third-party images and fonts, so every asset
 * has to be served from this app's own origin. Two ways that breaks silently:
 * a path is rebuilt to point off-origin again, or the file behind a path is
 * missing from the bundle. Both render as a blank square with no error, which
 * is exactly the kind of thing a test should catch instead of a player.
 */

const collect = (): string[] => {
  const paths = new Set<string>();
  for (const g of GEAR) {
    const u = getGearImageUrl(g.id);
    if (u) paths.add(u);
  }
  for (const perk of Object.values(HERO_PERKS)) paths.add(perk.img);
  for (const rider of Object.values(RIDERS)) paths.add(rider.icon);
  for (const [name, region] of WAVE_ENEMIES) {
    paths.add(monsterUrlFor(name));
    paths.add(backgroundUrlFor(region));
  }
  paths.add(monsterUrlFor('__unknown__'));
  for (const icon of Object.values(INTENT_ICON)) paths.add(icon);
  for (const icon of Object.values(EFFECT_ICON)) paths.add(icon);
  paths.add(JUNK_ICON);
  for (const league of LEAGUES) paths.add(league.icon);
  paths.add(COIN_ICON);
  paths.add(GEM_ICON);
  for (const pack of PACKS) {
    paths.add(pack.img);
    paths.add(pack.glow);
  }
  return [...paths];
};

void test('no asset path points off this app origin', () => {
  for (const path of collect()) {
    assert.ok(
      path.startsWith('/art/'),
      `${path} is not served from /art - a web view's CSP will block it`
    );
  }
});

void test('every asset path has a file behind it', () => {
  const missing = collect().filter(
    (p) => !existsSync(join('public', p.slice(1)))
  );
  assert.deepEqual(missing, [], 'these are referenced but not bundled');
});

void test('every gear card resolves to an image', () => {
  for (const g of GEAR)
    assert.ok(
      getGearImageUrl(g.id),
      `${g.id} has no art, so its orb would be blank`
    );
});
