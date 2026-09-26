/**
 * The first reads, started as early as possible and shared.
 *
 * `prefetchBoot` is called from the entry module before React renders, so the
 * profile and the quest board are already on the wire while the bundle mounts.
 * The promises are memoised, which also stops StrictMode's double mount from
 * sending every request twice.
 */
import type { InitResponse, QuestsResponse } from '../../shared/api.js';
import { api } from '../api.js';

type Boot = {
  init: Promise<InitResponse>;
  /** The board is a nicety on boot; a failed read resolves null and the tab
   *  waits on the next refresh rather than failing the whole app. */
  quests: Promise<QuestsResponse | null>;
};

let boot: Boot | null = null;

export const bootData = (): Boot =>
  (boot ??= { init: api.init(), quests: api.quests().catch(() => null) });

export const prefetchBoot = (): void => {
  bootData();
};
