/* v3 juice layer: link ladder + haptics, staggered resolve with canvas shards and
 * flying pips, hit-stop, trauma shake, flashes, the bomb forge pull and landing
 * ticks. Client-only and DOM-driven; the engine and its replay never see it. */
import { audio } from './audio/audio.js';
import { stepDelays } from './view/tilePalette.js';
import type { TilePalette } from './view/tilePalette.js';

/** The app members the juice reads: the phase (battle vs duel board). It also
 *  calls `app.timers.freeze(ms)` when present, so pending beats wait out a
 *  hit-stop; that member is looked up at runtime because the app keeps its
 *  timers private. */
export type JuiceApp = {
  state: { phase: string };
};
/** Which board a call is about. */
export type JuiceBoard = 'main' | 'duel';
/** What a cleared cell pays into, and the colours to draw its debris in. */
export type CellInfo = {
  pal?: TilePalette | null | undefined;
  effect?: string | undefined;
};
export type ImpactKind = 'hit' | 'big' | 'kill' | 'bomb' | 'hurt';

type Shard = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  c: string;
  t0: number;
  life: number;
};

const STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const SUPER_MIN = 6;
const FLIGHT = 280;
const LAUNCH = 70;
const IMPACT: Record<ImpactKind, readonly [number, number]> = {
  hit: [60, 0.15],
  big: [100, 0.3],
  kill: [100, 0.6],
  bomb: [120, 0.5],
  hurt: [0, 0.35],
};
const vib = (p: number | number[]): void => {
  try {
    if (navigator.vibrate) navigator.vibrate(p);
  } catch {
    /* blocked inside some iframes */
  }
};
const now = (): number => performance.now();
/** `app.timers.freeze(ms)`, if the app's timers have one. */
const freezeTimers = (app: JuiceApp | null, ms: number): void => {
  if (!app) return;
  const timers: unknown = Reflect.get(app, 'timers');
  if (!timers || typeof timers !== 'object') return;
  const freeze: unknown = Reflect.get(timers, 'freeze');
  if (typeof freeze === 'function') freeze.call(timers, ms);
};

class Juice {
  app: JuiceApp | null = null;
  trauma = 0;
  shakeRaf = 0;
  shakeEl: HTMLElement | null = null;
  parts: Shard[] = [];
  partRaf = 0;
  canvas: HTMLCanvasElement | null = null;
  frozenUntil = 0;
  frozenMs = 0;
  forged: Animation[] = [];
  lastTick = 0;

  bind(app: JuiceApp): void {
    this.app = app;
  }

  private kindNow(): JuiceBoard {
    return this.app && this.app.state && this.app.state.phase === 'duel'
      ? 'duel'
      : 'main';
  }

  boardEl(kind?: string): Element | null {
    const k = kind || this.kindNow();
    return document.querySelector('[data-juice-board="' + k + '"]');
  }
  cellEl(board: Element | null, i: number): Element | null {
    return board ? board.querySelector('[data-cell="' + i + '"]') : null;
  }

  /* ---------- linking ---------- */

  link(n: number, back?: boolean): void {
    const s = STEPS[Math.min(Math.max(n, 1) - 1, STEPS.length - 1)] ?? 0;
    audio.play('link', { rate: Math.pow(2, s / 12) });
    vib(n >= SUPER_MIN ? 20 : 8);
    if (n === SUPER_MIN && !back) {
      audio.play('rider', { rate: 1.5, gain: 0.6 });
      this.flash(this.boardEl(), 0.45, 34);
    }
  }

  /* ---------- resolve ---------- */

  /** Stagger the clear along the chain, burst shards, fly a pip per tile to what
   *  it pays into. Returns the ms until the last pip lands - land() is scheduled
   *  for exactly then. */
  resolve(
    order: readonly number[],
    cleared: readonly number[],
    info: (i: number) => CellInfo | null | undefined,
    kind?: JuiceBoard
  ): number {
    const board = this.boardEl(kind);
    const d = stepDelays(order.length);
    const last = d[d.length - 1] || 0;
    const delayOf = (i: number): number => {
      const k = order.indexOf(i);
      return k >= 0 ? (d[k] ?? last) : last;
    };
    let end = 0;
    let landed = 0;
    const total = cleared.length;
    cleared.forEach((i) => {
      const el = this.cellEl(board, i);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const c = info(i) || {};
      const delay = delayOf(i);
      this.shards(r, c.pal, delay);
      const arrive = this.pip(r, c, delay + LAUNCH, () => {
        landed++;
        audio.play('click', {
          rate: 1 + 0.06 * Math.min(landed, 10),
          gain: 0.25,
        });
        if (landed === total) vib(6);
      });
      end = Math.max(end, arrive);
    });
    end = Math.max(end, last + 300);
    setTimeout(() => this.clearForge(), end + 40);
    return end;
  }

  target(effect: string | undefined, kind: JuiceBoard): Element | null {
    const q = (...sels: string[]): Element | null => {
      for (const s of sels) {
        for (const el of document.querySelectorAll(s)) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return el;
        }
      }
      return null;
    };
    if (effect === 'attack')
      return kind === 'duel'
        ? q('[data-juice-board="foe"]', '[data-juice="foe"]')
        : q('[data-juice="monster"]');
    if (effect === 'block')
      return q(
        '[data-juice="hero-block"]',
        '[style*="Battle/Effects/Shield.png"]',
        '[data-juice="hero-hp"]'
      );
    return q('[data-juice="hero-status"]', '[data-juice="hero-hp"]');
  }

  pip(r: DOMRect, c: CellInfo, delay: number, done: () => void): number {
    const t = this.target(c.effect, this.kindNow());
    const x0 = r.left + r.width / 2,
      y0 = r.top + r.height / 2;
    let x1 = x0,
      y1 = r.top - 80;
    if (t) {
      const tr = t.getBoundingClientRect();
      x1 = tr.left + tr.width / 2;
      y1 = tr.top + tr.height / 2;
    }
    const el = document.createElement('div');
    const col = (c.pal && c.pal.rim) || '#FFF2B0';
    el.style.cssText =
      'position:fixed;left:0;top:0;width:8px;height:8px;margin:-4px 0 0 -4px;background:' +
      col +
      ';box-shadow:0 0 0 2px #0B0D1A;z-index:9001;pointer-events:none;opacity:0;will-change:transform';
    document.body.appendChild(el);
    const cx = (x0 + x1) / 2 + (Math.random() * 60 - 30),
      cy = Math.min(y0, y1) - 40 - Math.random() * 30;
    const frames: Keyframe[] = [];
    for (let s = 0; s <= 12; s++) {
      const u = s / 12,
        a = (1 - u) * (1 - u),
        b = 2 * (1 - u) * u,
        e = u * u;
      const x = Math.round(a * x0 + b * cx + e * x1),
        y = Math.round(a * y0 + b * cy + e * y1);
      frames.push({
        transform:
          'translate3d(' +
          x +
          'px,' +
          y +
          'px,0) rotate(' +
          Math.round(u * 270) +
          'deg)',
        opacity: 1,
        offset: u,
      });
    }
    const anim = el.animate(frames, {
      duration: FLIGHT,
      delay,
      easing: 'cubic-bezier(.5,0,.9,.5)',
      fill: 'both',
    });
    anim.onfinish = () => {
      el.remove();
      done();
    };
    return delay + FLIGHT;
  }

  /* ---------- shards ---------- */

  ensureCanvas(): HTMLCanvasElement {
    if (this.canvas && this.canvas.isConnected) return this.canvas;
    const cv = document.createElement('canvas');
    cv.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9000';
    document.body.appendChild(cv);
    this.canvas = cv;
    return cv;
  }

  shards(r: DOMRect, pal: TilePalette | null | undefined, delay: number): void {
    const cols = pal ? [pal.face, pal.rim, pal.top] : ['#FFFFFF'];
    const n = 6 + Math.floor(Math.random() * 5);
    const t0 = now() + delay + 34;
    for (let k = 0; k < n && this.parts.length < 120; k++) {
      this.parts.push({
        x: r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.6,
        y: r.top + r.height / 2 + (Math.random() - 0.5) * r.height * 0.6,
        vx: (Math.random() - 0.5) * 260,
        vy: -60 - Math.random() * 220,
        s: Math.random() < 0.5 ? 2 : 4,
        c: cols[k % cols.length] ?? '#FFFFFF',
        t0,
        life: 300 + Math.random() * 150,
      });
    }
    if (!this.partRaf) this.partRaf = requestAnimationFrame(this.partTick);
  }

  partTick = (): void => {
    const cv = this.ensureCanvas();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(window.innerWidth * dpr),
      H = Math.round(window.innerHeight * dpr);
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    const g = cv.getContext('2d');
    if (!g) {
      this.partRaf = 0;
      return;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const t = now();
    const frozen = t < this.frozenUntil;
    this.parts = this.parts.filter((p) => {
      if (frozen) p.t0 += 16;
      const age = t - p.t0;
      if (age > p.life) return false;
      if (age < 0) return true;
      const s = age / 1000;
      const x = Math.round(p.x + p.vx * s),
        y = Math.round(p.y + p.vy * s + 900 * s * s);
      g.globalAlpha =
        age > p.life * 0.7 ? 1 - (age - p.life * 0.7) / (p.life * 0.3) : 1;
      g.fillStyle = p.c;
      g.fillRect(x, y, p.s, p.s);
      return true;
    });
    g.globalAlpha = 1;
    this.partRaf = this.parts.length ? requestAnimationFrame(this.partTick) : 0;
    if (!this.partRaf) g.clearRect(0, 0, W, H);
  };

  /* ---------- impact ---------- */

  impact(kind: ImpactKind): void {
    const T = IMPACT[kind];
    if (!T) return;
    if (T[0]) this.freeze(T[0]);
    this.addTrauma(T[1]);
    vib(kind === 'bomb' ? [30, 40, 60] : kind === 'kill' ? 24 : 12);
  }

  freeze(ms: number): void {
    freezeTimers(this.app, ms);
    const list = (
      typeof document.getAnimations === 'function' ? document.getAnimations() : []
    ).filter((a) => a.playState === 'running');
    list.forEach((a) => {
      try {
        a.pause();
      } catch {
        /* already gone */
      }
    });
    this.frozenUntil = now() + ms;
    setTimeout(() => {
      list.forEach((a) => {
        try {
          if (a.playState === 'paused') a.play();
        } catch {
          /* removed while frozen */
        }
      });
    }, ms);
  }

  addTrauma(v: number): void {
    this.trauma = Math.min(1, this.trauma + v);
    if (this.shakeRaf) return;
    let last = now();
    const tick = (): void => {
      const t = now();
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const found = document.querySelector('[data-juice="column"]');
      const el = found instanceof HTMLElement ? found : null;
      if (el !== this.shakeEl) {
        if (this.shakeEl) this.shakeEl.style.transform = '';
        this.shakeEl = el;
      }
      this.trauma = Math.max(0, this.trauma - 1.6 * dt);
      const a = 8 * this.trauma * this.trauma;
      if (el) {
        const x = Math.round(
          (a * (Math.sin(t * 0.091) + Math.sin(t * 0.037) * 0.6)) / 1.6
        );
        const y = Math.round(
          (a * (Math.sin(t * 0.083 + 2) + Math.sin(t * 0.029) * 0.6)) / 1.6
        );
        el.style.transform =
          this.trauma > 0 ? 'translate3d(' + x + 'px,' + y + 'px,0)' : '';
      }
      this.shakeRaf = this.trauma > 0 ? requestAnimationFrame(tick) : 0;
    };
    this.shakeRaf = requestAnimationFrame(tick);
  }

  flash(el: Element | null, alpha = 1, ms = 17): void {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = document.createElement('div');
    f.style.cssText =
      'position:fixed;left:' +
      r.left +
      'px;top:' +
      r.top +
      'px;width:' +
      r.width +
      'px;height:' +
      r.height +
      'px;background:#FFFFFF;pointer-events:none;z-index:9002;opacity:0';
    document.body.appendChild(f);
    const a = f.animate(
      [{ opacity: alpha }, { opacity: alpha, offset: 0.99 }, { opacity: 0 }],
      { duration: ms, easing: 'steps(1,end)' }
    );
    a.onfinish = () => f.remove();
  }

  /* ---------- bombs ---------- */

  /** A 6+ link pulls its tiles into the spawn cell before the bomb forms. */
  forge(order: readonly number[], spawn: number, kind?: JuiceBoard): number {
    const board = this.boardEl(kind);
    const s = this.cellEl(board, spawn);
    if (!s) return 0;
    const sr = s.getBoundingClientRect();
    order.forEach((i) => {
      if (i === spawn) return;
      const el = this.cellEl(board, i);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = Math.round(sr.left - r.left),
        dy = Math.round(sr.top - r.top);
      this.forged.push(
        el.animate(
          [
            { transform: 'translate3d(0,0,0) scale(1.08)' },
            {
              transform:
                'translate3d(' + dx + 'px,' + dy + 'px,0) scale(.7)',
            },
          ],
          { duration: 180, easing: 'ease-in', fill: 'forwards' }
        )
      );
    });
    return 180;
  }
  clearForge(): void {
    this.forged.forEach((a) => {
      try {
        a.cancel();
      } catch {
        /* gone */
      }
    });
    this.forged = [];
  }

  detonate(kind?: JuiceBoard): void {
    this.impact('bomb');
    this.flash(this.boardEl(kind), 1, 17);
  }

  /* ---------- cascade ---------- */

  /** A soft tick as each column lands, never more than one per 30ms. */
  dropTicks(dist: readonly number[], cols: number): void {
    const times = new Set<number>();
    dist.forEach((fell, i) => {
      if (fell > 0) times.add(150 + fell * 55 + (i % cols) * 18);
    });
    let prev = -1e9;
    [...times]
      .sort((a, b) => a - b)
      .forEach((t) => {
        if (t - prev < 30) return;
        prev = t;
        setTimeout(
          () =>
            audio.play('click', {
              rate: 0.95 + Math.random() * 0.13,
              gain: 0.18,
            }),
          t
        );
      });
  }
}

export const juice = new Juice();
