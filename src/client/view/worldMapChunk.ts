/**
 * The world map, as its own chunk. It is home's whole screen and nothing
 * else's - the inline post's battle never draws it - so the game chunk leaves
 * it out. The expanded game starts it loading as it boots (`preloadWorldMap`
 * in game.tsx), so it is in before the boot reads are and home never waits.
 */
import { lazy } from 'react';

type WorldMapModule = typeof import('./WorldMap.js');

let loading: Promise<WorldMapModule> | null = null;

/** Fetch the map once; a failed fetch clears itself so a later render retries. */
export const preloadWorldMap = (): Promise<WorldMapModule> =>
  (loading ??= import('./WorldMap.js').catch((e: unknown) => {
    loading = null;
    throw e;
  }));

/** Drawn inside a Suspense boundary; see Screen. */
export const WorldMap = lazy(() =>
  preloadWorldMap().then((m) => ({ default: m.WorldMap }))
);
