/**
 * Re-download the game art and fonts from the asset CDN into `public/art`.
 *
 * The app serves these from its own origin because a Devvit web view's CSP
 * blocks third-party images and fonts. Run this when the CDN art changes:
 *
 *   node tools/sync-art.mjs
 *
 * It writes only files that are missing or whose bytes differ, so a rerun is
 * cheap and the diff shows exactly what moved.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  COIN_ICON,
  EFFECT_ICON,
  GEAR,
  GEM_ICON,
  HERO_PERKS,
  INTENT_ICON,
  JUNK_ICON,
  LEAGUES,
  MAP_PIN_URLS,
  PACKS,
  RIDERS,
  WAVE_ENEMIES,
  backgroundUrlFor,
  getGearImageUrl,
  monsterUrlFor,
} from '../dist/test/shared/engine/index.js';

const CDN = 'https://files.anomalygames.ai/';
const LOCAL = '/art/';
const OUT = 'public/art';

/** Paths the code builds, plus the handful the markup and stylesheet hardcode. */
const HARDCODED = [
  '/art/NeuraKnights/Fonts/yosterislandreg.ttf',
  '/art/NeuraKnights/Fonts/Volter__28Goldfish_29.ttf',
  '/art/NeuraKnights/gui/Shop_V2.png',
  '/art/NeuraKnights/gui/Quest_V2.png',
  '/art/NeuraKnights/gui/Bag_V2.png',
  '/art/PocketKnights/Map/Base.png',
  '/art/PocketKnights/Pattern/MenuButtonPatten.svg',
  '/art/PocketKnights/sky_v3.png',
];

export const artPaths = () => {
  const paths = new Set(HARDCODED);
  for (const pin of MAP_PIN_URLS) paths.add(pin);
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
  // The fallback sprite an unknown monster name resolves to.
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
  return [...paths].sort();
};

const main = async () => {
  const paths = artPaths();
  let written = 0;
  let unchanged = 0;
  const failed = [];

  for (const path of paths) {
    const rel = path.slice(LOCAL.length);
    const dest = join(OUT, rel);
    try {
      const res = await fetch(CDN + rel);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const next = Buffer.from(await res.arrayBuffer());
      const current = await readFile(dest).catch(() => null);
      if (current && current.equals(next)) {
        unchanged++;
        continue;
      }
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, next);
      written++;
      console.log('wrote ' + rel);
    } catch (error) {
      failed.push(rel + ' (' + String(error) + ')');
    }
  }

  console.log(
    `\n${written} written, ${unchanged} unchanged, ${failed.length} failed.`
  );
  for (const f of failed) console.error('  ' + f);
  if (written) {
    console.log(
      '\nNote: public/art/PocketKnights/sky_v3.png is downscaled to 1600px wide.' +
        '\nIf it was just refreshed, re-run: sips -Z 1600 public/art/PocketKnights/sky_v3.png --out public/art/PocketKnights/sky_v3.png'
    );
  }
  if (failed.length) process.exitCode = 1;
};

await main();
