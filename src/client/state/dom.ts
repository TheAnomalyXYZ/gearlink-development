/** Small DOM helpers the app's measurement code leans on. */

/** Swap an observer onto a new element. Returns the new observer (or null when
 *  there is nothing to observe), disconnecting the old one either way. */
export const reobserve = (
  prev: ResizeObserver | null,
  el: Element | null,
  onResize: () => void
): ResizeObserver | null => {
  prev?.disconnect();
  if (!el || typeof ResizeObserver === 'undefined') return null;
  const next = new ResizeObserver(onResize);
  next.observe(el);
  return next;
};

const px = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Height the column's OTHER children claim, from their floors rather than their
 * rendered heights - the stage flexes into whatever the board leaves, so
 * measuring what it renders at would be circular.
 */
export const siblingFloors = (column: Element, skip: Element): number => {
  let used = 0;
  for (const c of Array.from(column.children)) {
    if (c === skip) continue;
    const cs = getComputedStyle(c);
    // `min-height: auto` parses to NaN, which is the important case: it means
    // the sibling never declared a floor, NOT that it can collapse to zero.
    const declared = parseFloat(cs.minHeight);
    const floor = Number.isFinite(declared) ? declared : null;
    const rendered = c.getBoundingClientRect().height;
    // A sibling that can shrink is charged the floor it declared, since the
    // board is what it shrinks to make room for. One that cannot shrink - or
    // never declared a floor - is charged what it occupies, because that
    // height IS its floor. Charging an undeclared floor as zero was what made
    // the board size itself too tall and then get trimmed back every resize.
    const shrinkable = parseFloat(cs.flexShrink) > 0;
    used +=
      shrinkable && floor !== null ? floor : Math.max(floor ?? 0, rendered);
  }
  return used;
};

/** Padding, gaps and every non-board child of the board's panel. */
export const panelChrome = (panel: Element, board: Element): number => {
  const pcs = getComputedStyle(panel);
  let chrome =
    px(pcs.paddingTop) +
    px(pcs.paddingBottom) +
    px(pcs.rowGap) * Math.max(0, panel.children.length - 1);
  for (const c of Array.from(panel.children))
    if (c !== board) chrome += c.getBoundingClientRect().height;
  return chrome;
};

export const safeToast = (show: (msg: string) => void, msg: string): void => {
  try {
    show(msg);
  } catch {
    /* a toast is a nicety; the inline message is the real report */
  }
};
