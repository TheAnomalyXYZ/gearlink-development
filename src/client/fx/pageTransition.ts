/* Page transitions. React swaps a screen in one commit, so the leaving screen
 * is captured just before that commit (getSnapshotBeforeUpdate), cloned into a
 * ghost layer after it, and played out while the new screen plays in:
 *   lateral - map tabs (home, quests, shop, bag, duels) slide past each other
 *   deeper / back - drilling into a build or backing out zooms through
 *   clash - into a fight: diagonal shutters slam shut, spark, and split open
 *   slam - the end screen drops in with a flash
 *   iris - the splash opens onto the map through a widening circle
 * Pack opening owns its own shared-element entrance, so it is left alone.
 * Ghosts never take input; everything is transform / opacity / clip-path. */
import * as fx from './fx.js';

export type PageKind =
  'lateral' | 'deeper' | 'back' | 'clash' | 'slam' | 'iris';

type Ghosted = {
  node: Element;
  rect: DOMRect;
  shell: boolean;
  scrolls: number[][];
};
/** What the screen looked like the instant before React swapped it. */
export type PageSnap = {
  kind: PageKind;
  dir: 1 | -1;
  known: Set<Element>;
  nodes: Ghosted[];
};

/* Map tabs in the order the nav reads, so a slide always goes the way the
 * player's thumb went. */
const TAB_ORDER: Record<string, number> = {
  home: 0,
  quests: 1,
  shop: 2,
  inventory: 3,
  duelOptIn: 4,
  duelLobby: 4,
};
const DEPTH: Record<string, number> = {
  splash: -1,
  home: 0,
  quests: 0,
  shop: 0,
  inventory: 0,
  duelOptIn: 0,
  duelLobby: 0,
  hero: 1,
  duelConfirm: 1,
  gear: 2,
  battle: 3,
  duel: 3,
  end: 4,
};

/** Which transition a move from one phase to another plays, if any. */
export const pageKind = (from: string, to: string): PageKind | null => {
  if (from === to || from === 'opening' || to === 'opening') return null;
  if (from === 'splash') return 'iris';
  if (to === 'battle' || to === 'duel') return 'clash';
  if (to === 'end') return 'slam';
  const a = TAB_ORDER[from],
    b = TAB_ORDER[to];
  if (a !== undefined && b !== undefined) return 'lateral';
  return (DEPTH[to] ?? 0) > (DEPTH[from] ?? 0) ? 'deeper' : 'back';
};

const shellEl = (): HTMLElement | null => {
  const el = document.querySelector('.gl-shell');
  return el instanceof HTMLElement ? el : null;
};
const pageEl = (): HTMLElement | null => {
  const el = document.querySelector('.gl-page');
  return el instanceof HTMLElement ? el : null;
};
/** Screen-level nodes: the shell's children, plus the page's own (the splash
 *  lives outside the frame). Overlays tagged data-pt-skip never transition. */
const screenNodes = (): { node: Element; shell: boolean }[] => {
  const out: { node: Element; shell: boolean }[] = [];
  const shell = shellEl(),
    page = pageEl();
  if (shell) for (const c of shell.children) out.push({ node: c, shell: true });
  if (page)
    for (const c of page.children)
      if (!c.classList.contains('gl-frame'))
        out.push({ node: c, shell: false });
  return out.filter((n) => !n.node.hasAttribute('data-pt-skip'));
};

/** Scroll offsets inside a node, by descendant index, so the ghost keeps the
 *  list where the player left it rather than jumping to the top. */
const scrollsOf = (node: Element): number[][] => {
  const out: number[][] = [];
  if (node.scrollTop || node.scrollLeft)
    out.push([-1, node.scrollTop, node.scrollLeft]);
  node.querySelectorAll('*').forEach((el, i) => {
    if (el.scrollTop || el.scrollLeft)
      out.push([i, el.scrollTop, el.scrollLeft]);
  });
  return out;
};

/** Call before the commit that changes phase. */
export const capture = (from: string, to: string): PageSnap | null => {
  const kind = pageKind(from, to);
  if (!kind || !pageEl()) return null;
  const a = TAB_ORDER[from] ?? DEPTH[from] ?? 0,
    b = TAB_ORDER[to] ?? DEPTH[to] ?? 0;
  const nodes = screenNodes();
  return {
    kind,
    dir: b >= a ? 1 : -1,
    known: new Set(nodes.map((n) => n.node)),
    nodes: nodes.map(({ node, shell }) => ({
      node,
      shell,
      rect: node.getBoundingClientRect(),
      scrolls: scrollsOf(node),
    })),
  };
};

/* ---------- layers ---------- */

let teardown: (() => void) | null = null;

/** A fixed box pinned over `r`, clipping what it holds. */
const box = (
  r: { left: number; top: number; width: number; height: number },
  z: number
): HTMLDivElement => {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;overflow:hidden;pointer-events:none;z-index:${z};contain:strict`;
  return el;
};

const VIEWPORT = (): DOMRect => new DOMRect(0, 0, innerWidth, innerHeight);

/** Copy the leaving nodes into ghost layers at the rects they held. */
const buildGhosts = (
  snap: PageSnap
): { hosts: HTMLElement[]; ghosts: HTMLElement[] } => {
  const shell = shellEl();
  const sr = shell ? shell.getBoundingClientRect() : VIEWPORT();
  const font = shell ? getComputedStyle(shell) : null;
  const hosts: HTMLElement[] = [],
    ghosts: HTMLElement[] = [],
    scrolls: number[][][] = [];
  let shellHost: HTMLElement | null = null,
    pageHost: HTMLElement | null = null;
  for (const g of snap.nodes) {
    if (g.node.isConnected || !(g.node instanceof HTMLElement)) continue;
    const host = g.shell
      ? (shellHost ??= box(sr, 9400))
      : (pageHost ??= box(VIEWPORT(), 9400));
    const origin = g.shell ? sr : VIEWPORT();
    const clone = g.node.cloneNode(true);
    if (!(clone instanceof HTMLElement)) continue;
    // A ghost must never answer a juice lookup or an id query.
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      el.removeAttribute('id');
      for (const a of [...el.attributes])
        if (a.name.startsWith('data-fx') || a.name === 'data-juice')
          el.removeAttribute(a.name);
    }
    Object.assign(clone.style, {
      position: 'absolute',
      left: g.rect.left - origin.left + 'px',
      top: g.rect.top - origin.top + 'px',
      width: g.rect.width + 'px',
      height: g.rect.height + 'px',
      margin: '0',
      boxSizing: 'border-box',
      inset: 'auto',
      animation: 'none',
    });
    host.appendChild(clone);
    // Canvases clone blank; paint over what they showed.
    const src = g.node.querySelectorAll('canvas'),
      dst = clone.querySelectorAll('canvas');
    src.forEach((c, i) => {
      const d = dst[i];
      const ctx = d && d.getContext('2d');
      if (ctx && c.width && c.height)
        try {
          ctx.drawImage(c, 0, 0);
        } catch {
          /* tainted or lost */
        }
    });
    ghosts.push(clone);
    scrolls.push(g.scrolls);
  }
  for (const h of [shellHost, pageHost]) {
    if (!h) continue;
    if (font)
      Object.assign(h.style, {
        fontFamily: font.fontFamily,
        color: font.color,
        lineHeight: font.lineHeight,
      });
    document.body.appendChild(h);
    hosts.push(h);
  }
  // Scroll offsets only take once the clone is laid out.
  ghosts.forEach((c, k) => {
    const all = c.querySelectorAll('*');
    for (const [i = 0, t, l] of scrolls[k] ?? []) {
      const el = i === -1 ? c : all[i];
      if (el) {
        el.scrollTop = t ?? 0;
        el.scrollLeft = l ?? 0;
      }
    }
  });
  return { hosts, ghosts };
};

type AnimOpts = { duration: number; delay?: number; easing?: string };
/** Every transition animation holds its ends (fill both) and is cancelled as
 *  a set once the move settles, so nothing lingers on the live screen. */
const anim = (el: Element, frames: Keyframe[], opts: AnimOpts): Animation =>
  fx.track(
    el.animate(frames, {
      fill: 'both',
      easing: opts.easing ?? 'linear',
      duration: fx.ms(opts.duration),
      delay: fx.ms(opts.delay ?? 0),
    })
  );

const OUT = 'cubic-bezier(.55,0,.75,.3)';
const SPRING = 'cubic-bezier(.2,1.25,.35,1)';
const GLIDE = 'cubic-bezier(.16,1,.3,1)';

/** Speed lines whipping across the shell the way the screens travel. */
const streaks = (sr: DOMRect, dir: 1 | -1): HTMLElement => {
  const host = box(sr, 9450);
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    const h = 2 + Math.round(Math.random() * 3);
    const w = sr.width * (0.3 + Math.random() * 0.4);
    s.style.cssText = `position:absolute;top:${8 + Math.random() * 84}%;left:0;width:${w}px;height:${h}px;border-radius:${h}px;background:linear-gradient(${dir > 0 ? 270 : 90}deg,rgba(255,242,176,0),rgba(255,242,176,.85))`;
    host.appendChild(s);
    const x0 = dir > 0 ? sr.width : -w,
      x1 = dir > 0 ? -w : sr.width;
    anim(
      s,
      [
        { transform: `translateX(${x0}px)`, opacity: 0 },
        { opacity: 0.9, offset: 0.3 },
        { transform: `translateX(${x1}px)`, opacity: 0 },
      ],
      {
        duration: 300 + Math.random() * 120,
        delay: Math.random() * 90,
        easing: 'ease-in',
      }
    );
  }
  document.body.appendChild(host);
  return host;
};

/** Diagonal shutters that slam over the old screen and split over the new. */
const shutters = (
  sr: DOMRect,
  alive: () => boolean,
  onShut: () => void
): { host: HTMLElement; done: Promise<void> } => {
  const host = box(sr, 9450);
  const stripes =
    'repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 10px,rgba(255,255,255,0) 10px 22px),linear-gradient(180deg,#1C2134,#0B1020)';
  const mk = (clip: string): HTMLDivElement => {
    const p = document.createElement('div');
    p.style.cssText = `position:absolute;inset:0;background:${stripes};clip-path:${clip}`;
    host.appendChild(p);
    return p;
  };
  const left = mk('polygon(0 0,62% 0,38% 100%,0 100%)');
  const right = mk('polygon(62% 0,100% 0,100% 100%,38% 100%)');
  // The seam: a hot gold line along the diagonal where the two halves meet.
  const len = Math.hypot(sr.width * 0.24, sr.height);
  const ang = Math.atan2(sr.height, -sr.width * 0.24);
  const seam = document.createElement('div');
  seam.style.cssText = `position:absolute;left:50%;top:50%;width:${len}px;height:6px;margin:-3px 0 0 ${-len / 2}px;background:linear-gradient(90deg,rgba(255,242,176,0),#FFF2B0 20%,#FFFFFF 50%,#FFF2B0 80%,rgba(255,242,176,0));box-shadow:0 0 18px 4px rgba(252,226,112,.8);transform:rotate(${ang}rad) scaleX(0);opacity:0`;
  host.appendChild(seam);
  document.body.appendChild(host);

  const close = 210,
    hold = 150,
    open = 360;
  anim(
    left,
    [{ transform: 'translateX(-105%)' }, { transform: 'translateX(0)' }],
    {
      duration: close,
      easing: OUT,
    }
  );
  const shut = anim(
    right,
    [{ transform: 'translateX(105%)' }, { transform: 'translateX(0)' }],
    { duration: close, easing: OUT }
  );
  const done = new Promise<void>((res) => {
    shut.onfinish = () => {
      if (!alive()) return res();
      onShut();
      fx.sfx.thud();
      fx.flash('#FFF2B0', 70, 0.45);
      fx.shake(0.55);
      fx.burst(sr.left + sr.width / 2, sr.top + sr.height / 2, {
        colors: ['#FFFFFF', '#FFF2B0', '#FCE270', '#FF9B3D'],
        count: 34,
        speed: 340,
        gravity: 500,
        life: 520,
      });
      anim(
        seam,
        [
          { transform: `rotate(${ang}rad) scaleX(0)`, opacity: 1 },
          {
            transform: `rotate(${ang}rad) scaleX(1.1)`,
            opacity: 1,
            offset: 0.35,
          },
          { transform: `rotate(${ang}rad) scaleX(1)`, opacity: 0 },
        ],
        { duration: hold + open * 0.6, easing: 'ease-out' }
      );
      const split = {
        duration: open,
        delay: hold,
        easing: 'cubic-bezier(.7,0,.25,1)',
      };
      fx.sfx.whoosh();
      anim(
        left,
        [{ transform: 'translateX(0)' }, { transform: 'translate(-105%,-4%)' }],
        split
      );
      anim(
        right,
        [{ transform: 'translateX(0)' }, { transform: 'translate(105%,4%)' }],
        split
      ).onfinish = () => res();
    };
  });
  return { host, done };
};

/* ---------- play ---------- */

/** Call right after the commit that changed phase. `onDone` fires once the
 *  new screen has settled (re-measure anything positioned against it). */
export const play = (snap: PageSnap, onDone?: () => void): void => {
  teardown?.();
  const fresh = screenNodes()
    .map((n) => n.node)
    .filter(
      (n): n is HTMLElement => n instanceof HTMLElement && !snap.known.has(n)
    );
  const frame = document.querySelector('.gl-frame');
  const shell = shellEl();
  if (!shell || (!fresh.length && snap.kind !== 'iris')) {
    onDone?.();
    return;
  }
  const sr = shell.getBoundingClientRect();
  const { hosts, ghosts } = buildGhosts(snap);
  const extra: HTMLElement[] = [];
  const running: Animation[] = [];
  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    teardown = null;
    for (const a of running)
      try {
        a.cancel();
      } catch {
        /* gone */
      }
    for (const h of [...hosts, ...extra]) h.remove();
    onDone?.();
  };
  teardown = finish;
  const go = (el: Element, frames: Keyframe[], opts: AnimOpts): Animation => {
    const a = anim(el, frames, opts);
    running.push(a);
    return a;
  };
  const [main, ...bars] = fresh;
  /** Bottom bars and other secondary pieces rise in just behind the screen. */
  const riseBars = (delay: number): void =>
    bars.forEach((b, i) =>
      go(
        b,
        [
          { transform: 'translateY(110%)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: 380, delay: delay + i * 60, easing: SPRING }
      )
    );
  /** Done once everything started so far has played out (or was cut). */
  const settle = (): void => {
    void Promise.allSettled(running.map((a) => a.finished)).then(finish);
  };

  if (fx.reduced()) {
    ghosts.forEach((g) =>
      go(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 })
    );
    fresh.forEach((f) =>
      go(f, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 })
    );
    return settle();
  }

  const dir = snap.dir;
  switch (snap.kind) {
    case 'lateral': {
      ghosts.forEach((g) =>
        go(
          g,
          [
            { transform: 'none', opacity: 1, filter: 'brightness(1)' },
            {
              transform: `translateX(${-dir * 38}%) scale(.92) rotate(${-dir * 1.5}deg)`,
              opacity: 0,
              filter: 'brightness(.5)',
            },
          ],
          { duration: 300, easing: OUT }
        )
      );
      extra.push(streaks(sr, dir));
      if (main)
        go(
          main,
          [
            {
              transform: `translateX(${dir * 70}%) scale(.94) rotate(${dir * 2}deg)`,
              opacity: 0,
            },
            {
              transform: `translateX(${-dir * 2.5}%) scale(1.01) rotate(0deg)`,
              opacity: 1,
              offset: 0.65,
            },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 460, delay: 40, easing: GLIDE }
        );
      riseBars(140);
      return settle();
    }
    case 'deeper':
    case 'back': {
      const inn = snap.kind === 'deeper';
      fx.sfx.whoosh();
      ghosts.forEach((g) =>
        go(
          g,
          [
            {
              transform: 'scale(1)',
              opacity: 1,
              filter: 'blur(0px) brightness(1)',
            },
            {
              transform: `scale(${inn ? 1.18 : 0.84})`,
              opacity: 0,
              filter: 'blur(4px) brightness(1.4)',
            },
          ],
          { duration: 320, easing: OUT }
        )
      );
      if (main)
        go(
          main,
          [
            {
              transform: `scale(${inn ? 0.82 : 1.16})`,
              opacity: 0,
              filter: 'brightness(1.6)',
            },
            {
              transform: `scale(${inn ? 1.025 : 0.985})`,
              opacity: 1,
              filter: 'brightness(1.1)',
              offset: 0.6,
            },
            { transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' },
          ],
          { duration: 480, delay: 60, easing: GLIDE }
        );
      riseBars(180);
      return settle();
    }
    case 'clash': {
      // The old screen holds still under the shutters; the fight is already
      // mounted beneath it and flares as they split. No transform here: the
      // battle sizes its board off rendered rects while it mounts.
      fresh.forEach((f) =>
        go(f, [{ opacity: 0 }, { opacity: 0 }], { duration: 210 })
      );
      const s = shutters(
        sr,
        () => !finished,
        () => {
          for (const h of hosts) h.remove();
          fresh.forEach((f) =>
            go(
              f,
              [
                { opacity: 1, filter: 'brightness(2) saturate(1.4)' },
                { opacity: 1, filter: 'brightness(1) saturate(1)' },
              ],
              { duration: 520, delay: 120, easing: GLIDE }
            )
          );
        }
      );
      extra.push(s.host);
      void s.done.then(settle);
      return;
    }
    case 'slam': {
      ghosts.forEach((g) =>
        go(
          g,
          [
            { opacity: 1, filter: 'brightness(1) grayscale(0)' },
            { opacity: 0, filter: 'brightness(.3) grayscale(1)' },
          ],
          { duration: 300, easing: 'ease-in' }
        )
      );
      if (main)
        go(
          main,
          [
            { transform: 'translateY(-14%) scale(1.25)', opacity: 0 },
            { transform: 'translateY(0) scale(.96)', opacity: 1, offset: 0.55 },
            { transform: 'translateY(0) scale(1.015)', offset: 0.8 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 520, delay: 180, easing: 'cubic-bezier(.3,.9,.4,1)' }
        );
      setTimeout(
        () => {
          fx.flash('#FFFFFF', 90, 0.35);
          fx.shake(0.35);
          fx.sfx.thud();
        },
        fx.ms(180 + 520 * 0.55)
      );
      riseBars(420);
      return settle();
    }
    case 'iris': {
      ghosts.forEach((g) =>
        go(
          g,
          [
            { transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' },
            { transform: 'scale(1.3)', opacity: 0, filter: 'brightness(1.8)' },
          ],
          { duration: 560, easing: 'cubic-bezier(.5,0,.8,.4)' }
        )
      );
      fx.sfx.whoosh();
      const target = frame || shell;
      go(
        target,
        [
          { clipPath: 'circle(0% at 50% 62%)' },
          { clipPath: 'circle(75% at 50% 50%)' },
        ],
        { duration: 640, delay: 80, easing: 'cubic-bezier(.6,0,.2,1)' }
      );
      fx.burst(sr.left + sr.width / 2, sr.top + sr.height * 0.62, {
        colors: ['#FFF2B0', '#FCE270', '#FFFFFF'],
        count: 26,
        speed: 300,
        gravity: 300,
        life: 640,
        delay: 120,
      });
      if (main)
        go(
          main,
          [
            { transform: 'scale(1.08)', filter: 'brightness(1.5)' },
            { transform: 'scale(1)', filter: 'brightness(1)' },
          ],
          { duration: 760, delay: 80, easing: GLIDE }
        );
      riseBars(420);
      return settle();
    }
  }
};
