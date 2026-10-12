/**
 * Post mode: the inline feed post IS the first battle. The inline entry sets
 * this before it mounts the app; the expanded game never does.
 */
let on = false;

export const setPostMode = (v: boolean): void => {
  on = v;
};
export const isPostMode = (): boolean => on;

/** What the expanded game should do once it boots, handed over from the post
 *  through storage (both views share the webview's origin). */
const GO_KEY = 'gl:go';
const LIVE_KEY = 'gl:liveRun';

export const setGoTo = (go: string): void => {
  try {
    localStorage.setItem(GO_KEY, go);
  } catch {
    /* storage off: the full game just opens on the map */
  }
};
/** Read once and cleared, so a later visit doesn't replay it. */
export const takeGoTo = (): string | null => {
  try {
    const v = localStorage.getItem(GO_KEY);
    localStorage.removeItem(GO_KEY);
    return v || null;
  } catch {
    return null;
  }
};

export type LiveRun = {
  spec: unknown;
  moves: number[][];
  picked: string[];
  heroClass: string;
  locationId: string;
};

export const saveLiveRun = (r: LiveRun): void => {
  try {
    localStorage.setItem(LIVE_KEY, JSON.stringify(r));
  } catch {
    /* storage off */
  }
};
export const clearLiveRun = (): void => {
  try {
    localStorage.removeItem(LIVE_KEY);
  } catch {
    /* storage off */
  }
};
export const loadLiveRun = (): unknown => {
  try {
    return JSON.parse(localStorage.getItem(LIVE_KEY) ?? 'null');
  } catch {
    return null;
  }
};
