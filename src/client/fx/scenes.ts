/**
 * The victory sequence and the pack-opening stage, kept out of the game chunk.
 *
 * Each is a thousand-odd lines of DOM choreography that only plays when a
 * battle ends or a pack opens, so the game chunk carries this stand-in: the
 * same calls, quiet until the module is in. The first sync fetches both when
 * the main thread is next idle - long before a battle can end or a pack can
 * open - and asks for a render once they land, so the next sync picks up
 * whatever screen is already up.
 */
import type { FxHelpers } from './fx.js';
import type { PackStageApp } from './packStage.js';
import type { EndReason, VictoryApp, VictoryHelpers } from './victory.js';

type VictoryModule = typeof import('./victory.js');
type PackStageModule = typeof import('./packStage.js');

let victory: VictoryModule | null = null;
let stage: PackStageModule | null = null;
let loading: Promise<void> | null = null;
let idleQueued = false;
let notify: (() => void) | null = null;

/** Called once the scenes land, so the app renders and syncs them. */
export const setScenesNotify = (fn: () => void): void => {
  notify = fn;
};

/** Both scenes, fetched once. A failed fetch clears itself so the next sync
 *  tries again rather than leaving the game without its scenes for good. */
const load = (): Promise<void> =>
  (loading ??= Promise.all([import('./victory.js'), import('./packStage.js')])
    .then(([v, p]) => {
      victory = v;
      stage = p;
      notify?.();
    })
    .catch(() => {
      loading = null;
    }));

const loadWhenIdle = (): void => {
  if (loading || idleQueued) return;
  idleQueued = true;
  const go = (): void => {
    idleQueued = false;
    void load();
  };
  // Safari has no idle callback; there the fetch simply starts now.
  if (typeof requestIdleCallback === 'function')
    requestIdleCallback(go, { timeout: 2000 });
  else go();
};

/** Called every render from buildView; see `victory.ts`. */
export const syncVictory = (app: VictoryApp, helpers: VictoryHelpers): void => {
  if (victory) victory.syncVictory(app, helpers);
  else loadWhenIdle();
};

/** Start the sequence; false while it is still loading, so the caller goes
 *  straight to the end screen exactly as it does when there is no document. */
export const start = (
  app: VictoryApp,
  opts: { reason: EndReason; locationName: string }
): boolean => (victory ? victory.start(app, opts) : false);

/** Called every render from buildView; see `packStage.ts`. */
export const syncPackStage = (app: PackStageApp, h: FxHelpers): void => {
  if (stage) stage.syncPackStage(app, h);
  else loadWhenIdle();
};

/** The bag's bounce, played late rather than dropped if the stage is not in. */
export const popBag = (n?: number): void => {
  if (stage) stage.popBag(n);
  else void load().then(() => stage?.popBag(n));
};
