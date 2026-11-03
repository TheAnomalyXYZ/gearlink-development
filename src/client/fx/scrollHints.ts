/* Scroll hints. The scrollbar is hidden app-wide (see game.css) so it never
 * steals width from a pane; in its place, any vertical scroll pane with more
 * content above or below gets a bobbing chevron centred on that edge.
 *
 * One fixed layer serves every pane, so the ~20 inline-styled scroll panes in
 * Screen.tsx need no wrapper. Panes are found by their computed overflow-y, and
 * a chevron only shows when its pane is actually the topmost thing at that
 * spot - a modal over a scrolled list does not inherit the list's arrows.
 * The layer ignores pointer events, so it never eats a tap. */
import { reduced } from './fx.js';

/** Hide a hint until at least this many px remain that way. */
const EDGE_PX = 4;
/** Chevron box size and its inset from the pane edge. */
const SIZE = 26;
const INSET = 6;

// Candidates only: setting overflow-x alongside overflow-y serialises the
// style attribute as the shorthand (`overflow: hidden auto`), so the attribute
// can't say which axis scrolls. The computed style decides (see isPane).
const PANE_SELECTOR = [
  '[style*="overflow"]',
  '.overflow-auto',
  '.overflow-scroll',
  '.overflow-y-auto',
  '.overflow-y-scroll',
].join(',');

const isPane = (el: Element): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  const y = getComputedStyle(el).overflowY;
  return y === 'auto' || y === 'scroll';
};

export type ScrollHint = { up: boolean; down: boolean };

/** Which ways a pane can still scroll. Pure, for tests. */
export const scrollHint = (
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number
): ScrollHint => ({
  up: scrollTop > EDGE_PX,
  down: scrollTop + clientHeight < scrollHeight - EDGE_PX,
});

type Pair = { up: HTMLDivElement; down: HTMLDivElement };

const CHEVRON =
  '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">' +
  '<path d="M1 3h3l2 3 2-3h3L6 10z" fill="#FFFFFF"/></svg>';

const makeArrow = (dir: 'up' | 'down'): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = `gl-scroll-hint gl-scroll-hint-${dir}`;
  el.innerHTML = CHEVRON;
  el.style.width = `${SIZE}px`;
  el.style.height = `${SIZE}px`;
  return el;
};

/** True when `pane` (or something inside it) is what the user sees at (x, y). */
const onTop = (pane: Element, x: number, y: number): boolean => {
  const hit = document.elementFromPoint(x, y);
  return !!hit && (hit === pane || pane.contains(hit));
};

const place = (
  el: HTMLDivElement,
  show: boolean,
  x: number,
  y: number
): void => {
  // Only touch what changed: an unchanged write still dirties style.
  const left = `${x - SIZE / 2}px`;
  const top = `${y - SIZE / 2}px`;
  if (el.style.left !== left) el.style.left = left;
  if (el.style.top !== top) el.style.top = top;
  if (el.classList.contains('is-on') !== show) el.classList.toggle('is-on', show);
};

let uninstall: (() => void) | null = null;

/** Start watching for scroll panes. Idempotent: a second call returns the
 *  first install's teardown. The teardown removes the layer and every
 *  listener, so a remount starts clean. */
export const installScrollHints = (): (() => void) => {
  if (uninstall) return uninstall;
  if (typeof document === 'undefined') return () => {};

  const layer = document.createElement('div');
  layer.setAttribute('data-scroll-hints', '');
  document.body.appendChild(layer);

  const pairs = new Map<Element, Pair>();
  /** What the ResizeObserver watches per pane: the pane, and its children,
   *  whose growth changes scrollHeight without resizing the pane itself. */
  const watched = new Map<Element, Set<Element>>();
  let frame = 0;

  // Every trigger lands here, so a burst of scrolls, resizes and mutations in
  // one frame costs a single measure.
  const schedule = (): void => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const ro = new ResizeObserver(schedule);

  /** Keep the observer on `pane` and its current children, and only those:
   *  re-observing a target re-fires it, which would schedule forever. */
  const watch = (pane: Element): void => {
    let set = watched.get(pane);
    if (!set) {
      set = new Set([pane]);
      watched.set(pane, set);
      ro.observe(pane);
    }
    const kids = new Set(Array.from(pane.children));
    for (const el of set)
      if (el !== pane && !kids.has(el)) {
        ro.unobserve(el);
        set.delete(el);
      }
    for (const el of kids)
      if (!set.has(el)) {
        ro.observe(el);
        set.add(el);
      }
  };
  const unwatch = (pane: Element): void => {
    for (const el of watched.get(pane) ?? []) ro.unobserve(el);
    watched.delete(pane);
  };

  const update = (): void => {
    frame = 0;
    const still = reduced();
    if (layer.classList.contains('is-still') !== still)
      layer.classList.toggle('is-still', still);
    const seen = new Set<Element>();

    for (const pane of Array.from(document.querySelectorAll(PANE_SELECTOR))) {
      if (layer.contains(pane) || !isPane(pane)) continue;
      seen.add(pane);
      watch(pane);
      let pair = pairs.get(pane);
      if (!pair) {
        pair = { up: makeArrow('up'), down: makeArrow('down') };
        layer.append(pair.up, pair.down);
        pairs.set(pane, pair);
      }

      const r = pane.getBoundingClientRect();
      const big = r.width > SIZE * 2 && r.height > SIZE * 3;
      const hint = big
        ? scrollHint(pane.scrollTop, pane.clientHeight, pane.scrollHeight)
        : { up: false, down: false };

      const x = r.left + r.width / 2;
      const yUp = r.top + INSET + SIZE / 2;
      const yDown = r.bottom - INSET - SIZE / 2;
      place(pair.up, hint.up && onTop(pane, x, yUp), x, yUp);
      place(pair.down, hint.down && onTop(pane, x, yDown), x, yDown);
    }

    for (const [pane, pair] of pairs) {
      if (seen.has(pane)) continue;
      pair.up.remove();
      pair.down.remove();
      pairs.delete(pane);
      unwatch(pane);
    }
  };

  // Scroll does not bubble, so listen in the capture phase to hear every pane.
  const capture = { capture: true, passive: true };
  document.addEventListener('scroll', schedule, capture);
  window.addEventListener('resize', schedule);
  document.addEventListener('transitionend', schedule, true);
  document.addEventListener('animationend', schedule, true);
  // Nodes coming and going: a screen or phase change, a modal, a list
  // growing. Attributes are deliberately not watched - screen shake and card
  // tilt write style.transform every frame - and a pane that changes size is
  // heard by the ResizeObserver instead. The layer's own writes are ignored,
  // or each update would schedule the next.
  const mo = new MutationObserver((records) => {
    if (records.some((m) => !layer.contains(m.target))) schedule();
  });
  mo.observe(document.body, { childList: true, subtree: true });
  // Images loading, fonts settling or a class flipping a pane's overflow can
  // change things none of the above hears.
  const poll = setInterval(schedule, 500);
  schedule();

  const off = (): void => {
    uninstall = null;
    document.removeEventListener('scroll', schedule, capture);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('transitionend', schedule, true);
    document.removeEventListener('animationend', schedule, true);
    mo.disconnect();
    ro.disconnect();
    clearInterval(poll);
    cancelAnimationFrame(frame);
    frame = 0;
    pairs.clear();
    watched.clear();
    layer.remove();
  };
  uninstall = off;
  return off;
};
