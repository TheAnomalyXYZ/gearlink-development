/* Shared FX kit (shop, packs, quests; battle can reuse it). One fixed overlay
 * holds a particle canvas and a sprite layer. Also: flash, trauma shake,
 * hit-stop, a freeze-aware wait, rolling number readouts, pointer tilt, wobble
 * text and synthesized SFX. Client-only; transform / opacity / filter only.
 * Every sequence honours skip(): durations collapse and pending flights land. */
import { audio } from '../audio/audio.js';

/** A screen rect: a DOMRect, or a plain box in viewport px. */
export type FxRect = { left: number; top: number; width: number; height: number };
/** An element to measure, a rect already measured, or nothing. */
export type FxTarget = Element | FxRect | null | undefined;

/** View helpers buildView hands to the pack stage and the shop / quest juice. */
export type FxHelpers = {
  packById: (id: string) => { tint?: string; img?: string } | null | undefined;
  coinIcon: string;
  gemIcon: string;
  gearImage: (id: string) => string;
  crisp: (src: string) => string;
  packImg: (id: string) => string;
};

const now = (): number => performance.now();
const RM_KEY = 'gl.reduceMotion';

export const reduced = (): boolean => {
  try {
    if (localStorage.getItem(RM_KEY) === '1') return true;
  } catch {
    /* storage blocked */
  }
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
};
export const setReduced = (on: boolean): void => {
  try {
    localStorage.setItem(RM_KEY, on ? '1' : '0');
  } catch {
    /* storage blocked */
  }
};

/* ---------- layer ---------- */

let root: HTMLDivElement | null = null,
  canvas: HTMLCanvasElement | null = null,
  spriteLayer: HTMLDivElement | null = null;
export const layer = (): HTMLDivElement => {
  if (root && root.isConnected) return root;
  root = document.createElement('div');
  root.setAttribute('data-fx-layer', '');
  root.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9500;overflow:hidden';
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  spriteLayer = document.createElement('div');
  spriteLayer.style.cssText = 'position:absolute;inset:0';
  root.append(canvas, spriteLayer);
  document.body.appendChild(root);
  return root;
};
export const sprites = (): HTMLDivElement => {
  layer();
  // layer() always leaves a sprite layer behind; this only satisfies the type.
  if (!spriteLayer) spriteLayer = document.createElement('div');
  return spriteLayer;
};

export const rectOf = (x: FxTarget): FxRect | null => {
  if (!x) return null;
  if (x instanceof Element) {
    const r = x.getBoundingClientRect();
    return r.width || r.height ? r : null;
  }
  return x;
};
/** First element matching `sel` that is actually on screen. */
export const visible = (sel: string): HTMLElement | null => {
  for (const el of document.querySelectorAll(sel)) {
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
};

/* ---------- skip ---------- */

let speed = 1;
let skipTimer: ReturnType<typeof setTimeout> | undefined;
const live = new Set<Animation>();
export const ms = (v: number): number => v * speed * (reduced() ? 0.6 : 1);
export const track = (anim: Animation): Animation => {
  live.add(anim);
  anim.addEventListener('finish', () => live.delete(anim));
  anim.addEventListener('cancel', () => live.delete(anim));
  if (speed < 1) anim.playbackRate = 1 / Math.max(speed, 0.02);
  return anim;
};
/** Jump every running sequence to its end state. */
export const skip = (): void => {
  speed = 0.02;
  for (const a of [...live]) {
    try {
      a.finish();
    } catch {
      /* infinite or gone */
    }
  }
  finishRolls();
  clearTimeout(skipTimer);
  skipTimer = setTimeout(() => (speed = 1), 400);
};
export const resetSpeed = (): number => (speed = 1);

/* ---------- particles ---------- */

type Part = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  c: string;
  t0: number;
  life: number;
  g: number;
};
export type BurstOpts = {
  colors?: readonly string[];
  count?: number;
  speed?: number;
  delay?: number;
  gravity?: number;
  life?: number;
};

let parts: Part[] = [],
  raf = 0,
  frozenUntil = 0;
const MAX_PARTS = 150;
const pick = (colors: readonly string[], k: number): string =>
  colors[k % colors.length] ?? '#FFFFFF';
export const burst = (
  x: number,
  y: number,
  {
    colors = ['#FFFFFF'],
    count = 16,
    speed: v0 = 240,
    delay = 0,
    gravity = 900,
    life = 420,
  }: BurstOpts = {}
): void => {
  layer();
  const t0 = now() + delay;
  for (let k = 0; k < count && parts.length < MAX_PARTS; k++) {
    const a = Math.random() * Math.PI * 2,
      v = v0 * (0.35 + Math.random() * 0.85);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - v0 * 0.35,
      s: Math.random() < 0.5 ? 2 : 4,
      c: pick(colors, k),
      t0,
      life: life * (0.8 + Math.random() * 0.6),
      g: gravity,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
};
/** Slow drifting motes inside a rect until stop() is called. */
export const motes = (
  getRect: FxTarget | (() => FxTarget),
  colors: readonly string[]
): (() => void) => {
  const id = setInterval(() => {
    const r = rectOf(typeof getRect === 'function' ? getRect() : getRect);
    if (!r) return;
    for (let k = 0; k < 2 && parts.length < MAX_PARTS; k++)
      parts.push({
        x: r.left + Math.random() * r.width,
        y: r.top + r.height * (0.4 + Math.random() * 0.6),
        vx: (Math.random() - 0.5) * 18,
        vy: -20 - Math.random() * 30,
        s: 2,
        c: pick(colors, k),
        t0: now(),
        life: 1400 + Math.random() * 900,
        g: -6,
      });
    if (!raf) raf = requestAnimationFrame(tick);
  }, 140);
  return () => clearInterval(id);
};
const tick = (): void => {
  if (!canvas) {
    raf = 0;
    return;
  }
  const dpr = devicePixelRatio || 1,
    W = Math.round(innerWidth * dpr),
    H = Math.round(innerHeight * dpr);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const g = canvas.getContext('2d');
  if (!g) {
    raf = 0;
    return;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  const t = now(),
    frozen = t < frozenUntil;
  parts = parts.filter((p) => {
    if (frozen) p.t0 += 16;
    const age = t - p.t0;
    if (age > p.life) return false;
    if (age < 0) return true;
    const s = age / 1000;
    g.globalAlpha =
      age > p.life * 0.7 ? 1 - (age - p.life * 0.7) / (p.life * 0.3) : 1;
    g.fillStyle = p.c;
    g.fillRect(
      Math.round(p.x + p.vx * s),
      Math.round(p.y + p.vy * s + p.g * s * s * 0.5),
      p.s,
      p.s
    );
    return true;
  });
  g.globalAlpha = 1;
  raf = parts.length ? requestAnimationFrame(tick) : 0;
};

/* ---------- flying sprites ---------- */

export type FlyOpts = {
  icon?: string;
  count?: number;
  arcHeight?: number;
  stagger?: number;
  size?: number;
  duration?: number;
  onArrive?: (k: number) => void;
  onDone?: () => void;
};

let flying = 0;
const MAX_SPRITES = 20;
/** Sprites fly from one element (or rect) to another along an arc. Returns the
 *  ms until the last lands. onArrive(k) fires per sprite, onDone once. */
export const flyTo = (
  from: FxTarget,
  to: FxTarget,
  {
    icon,
    count = 6,
    arcHeight = 80,
    stagger = 35,
    size = 18,
    duration = 520,
    onArrive,
    onDone,
  }: FlyOpts = {}
): number => {
  const host = sprites();
  const fr = rectOf(from),
    tr = rectOf(to);
  const n = Math.max(0, Math.min(count, MAX_SPRITES - flying));
  if (!fr || !tr || !n) {
    for (let k = 0; k < count; k++) if (onArrive) onArrive(k);
    if (onDone) onDone();
    return 0;
  }
  const dur = ms(duration),
    st = ms(stagger);
  let landed = 0;
  for (let k = 0; k < n; k++) {
    flying++;
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;background:url("${icon}") center/contain no-repeat;image-rendering:pixelated;will-change:transform;opacity:0`;
    host.appendChild(el);
    const x0 =
        fr.left + fr.width / 2 + (Math.random() - 0.5) * fr.width * 0.5,
      y0 = fr.top + fr.height / 2 + (Math.random() - 0.5) * fr.height * 0.4;
    const x1 = tr.left + tr.width / 2,
      y1 = tr.top + tr.height / 2;
    const cx = (x0 + x1) / 2 + (Math.random() - 0.5) * 70,
      cy = Math.min(y0, y1) - arcHeight * (0.7 + Math.random() * 0.6);
    const frames: Keyframe[] = [];
    for (let s = 0; s <= 14; s++) {
      const u = s / 14,
        a = (1 - u) * (1 - u),
        b = 2 * (1 - u) * u,
        e = u * u;
      frames.push({
        offset: u,
        opacity: 1,
        transform: `translate3d(${Math.round(a * x0 + b * cx + e * x1)}px,${Math.round(a * y0 + b * cy + e * y1)}px,0) scale(${(1.1 - 0.4 * u).toFixed(3)}) rotate(${Math.round(u * 200)}deg)`,
      });
    }
    const anim = track(
      el.animate(frames, {
        duration: Math.max(1, dur),
        delay: k * st,
        easing: 'cubic-bezier(.45,0,.85,.55)',
        fill: 'both',
      })
    );
    anim.onfinish = () => {
      el.remove();
      flying--;
      if (onArrive) onArrive(k);
      if (++landed === n && onDone) onDone();
    };
  }
  return dur + (n - 1) * st;
};

/** Text that floats up off an element and fades. */
export const floatText = (
  el: FxTarget,
  text: string,
  color = '#FF7A7A',
  size = 16
): void => {
  const r = rectOf(el);
  if (!r) return;
  const t = document.createElement('div');
  t.textContent = text;
  t.style.cssText = `position:absolute;left:${r.left + r.width / 2}px;top:${r.top}px;transform:translate(-50%,-50%);font-family:VolterTitle,'Yoster Island',Volter,monospace;font-size:${size}px;color:${color};-webkit-text-stroke:4px #141D2E;paint-order:stroke fill;white-space:nowrap`;
  sprites().appendChild(t);
  const a = track(
    t.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%,-220%) scale(1)', opacity: 0 },
      ],
      { duration: ms(900), easing: 'ease-out', fill: 'forwards' }
    )
  );
  a.onfinish = () => t.remove();
};

/* ---------- flash / shake / hit-stop ---------- */

export const flash = (color = '#FFFFFF', duration = 34, alpha = 0.9): void => {
  if (reduced()) return;
  const host = layer();
  const f = document.createElement('div');
  f.style.cssText = `position:absolute;inset:0;background:${color};opacity:0`;
  host.appendChild(f);
  const a = f.animate(
    [{ opacity: alpha }, { opacity: alpha, offset: 0.5 }, { opacity: 0 }],
    { duration }
  );
  a.onfinish = () => f.remove();
};

let trauma = 0,
  shakeRaf = 0,
  shakeEl: HTMLElement | null = null;
/** Same trauma model as the battle: amplitude = 9px * trauma^2, decays 1.6/s.
 *  Uses the `translate` property so it never fights a React transform. */
export const shake = (amount: number): void => {
  if (reduced() || !amount) return;
  trauma = Math.min(1, trauma + amount);
  if (shakeRaf) return;
  let last = now();
  const step = (): void => {
    const t = now(),
      dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const found = document.querySelector('.gl-frame');
    const el = found instanceof HTMLElement ? found : null;
    if (el !== shakeEl) {
      if (shakeEl) shakeEl.style.translate = '';
      shakeEl = el;
    }
    trauma = Math.max(0, trauma - 1.6 * dt);
    const a = 9 * trauma * trauma;
    if (el)
      el.style.translate =
        trauma > 0
          ? `${Math.round((a * (Math.sin(t * 0.091) + 0.6 * Math.sin(t * 0.037))) / 1.6)}px ${Math.round((a * (Math.sin(t * 0.083 + 2) + 0.6 * Math.sin(t * 0.029))) / 1.6)}px`
          : '';
    shakeRaf = trauma > 0 ? requestAnimationFrame(step) : 0;
  };
  shakeRaf = requestAnimationFrame(step);
};

export const hitStop = (duration: number): void => {
  if (!duration || reduced() || speed < 1) return;
  const list = document
    .getAnimations()
    .filter((a) => a.playState === 'running');
  list.forEach((a) => {
    try {
      a.pause();
    } catch {
      /* gone */
    }
  });
  frozenUntil = now() + duration;
  setTimeout(
    () =>
      list.forEach((a) => {
        try {
          if (a.playState === 'paused') a.play();
        } catch {
          /* gone */
        }
      }),
    duration
  );
};

/** setTimeout that stretches across a hit-stop and collapses on skip. */
export const wait = (duration: number): Promise<void> =>
  new Promise<void>((res) => {
    let left = ms(duration),
      last = now();
    const step = (): void => {
      const t = now();
      if (t >= frozenUntil) left -= (t - last) / (speed < 1 ? 0.02 : 1);
      last = t;
      if (left <= 0) res();
      else setTimeout(step, Math.min(16, Math.max(1, left)));
    };
    if (left <= 0) res();
    else setTimeout(step, Math.min(16, left));
  });

/* ---------- rolling numbers ---------- */

type Roll = {
  shown: number;
  from: number;
  to: number;
  t0: number;
  ms: number;
  holdUntil: number;
  pop: number;
  dir: number;
  started: boolean;
  lastTick: number;
  steps: number;
};

const rolls = new Map<string, Roll>();
let rollNotify: (() => void) | null = null,
  rollTimer: ReturnType<typeof setInterval> | 0 = 0;
export const setRollNotify = (fn: (() => void) | null): (() => void) | null =>
  (rollNotify = fn);
const ease = (u: number): number => 1 - Math.pow(1 - u, 3);
const pumpRolls = (): void => {
  if (rollTimer) return;
  rollTimer = setInterval(() => {
    const t = now();
    let busy = false;
    for (const [key, r] of rolls) {
      if (r.shown === r.to) continue;
      if (t < r.holdUntil) {
        busy = true;
        continue;
      }
      if (!r.started) {
        r.started = true;
        r.t0 = t;
        r.pop++;
        if (r.to < r.from)
          floatText(
            visible('[data-fx="' + key + '"]'),
            '-' + (r.from - r.to).toLocaleString(),
            '#FF7A7A'
          );
      }
      const u = Math.min(1, (t - r.t0) / r.ms);
      const v = Math.round(r.from + (r.to - r.from) * ease(u));
      if (v !== r.shown && t - r.lastTick > 45) {
        r.lastTick = t;
        sfx.tick(Math.min(14, r.steps++));
      }
      r.shown = u >= 1 ? r.to : v;
      busy = busy || r.shown !== r.to;
    }
    if (rollNotify) rollNotify();
    if (!busy) {
      clearInterval(rollTimer);
      rollTimer = 0;
    }
  }, 33);
};

export type Rolled = { text: string; anim: string };
/** The number to show for `key` while it rolls toward `value`, and the pop
 *  animation (green up, red down) to put on the readout. */
export const rolled = (key: string, value: number): Rolled => {
  let r = rolls.get(key);
  if (!r) {
    r = {
      shown: value,
      from: value,
      to: value,
      t0: 0,
      ms: 500,
      holdUntil: 0,
      pop: 0,
      dir: 0,
      started: true,
      lastTick: 0,
      steps: 0,
    };
    rolls.set(key, r);
  } else if (value !== r.to) {
    r.from = r.shown;
    r.to = value;
    r.dir = value > r.from ? 1 : -1;
    r.ms = reduced() ? 250 : 500;
    r.started = false;
    r.steps = 0;
    pumpRolls();
  }
  const name = r.dir > 0 ? 'glRollUp' : r.dir < 0 ? 'glRollDown' : '';
  return {
    text: String(r.shown),
    anim:
      name && r.pop
        ? name + (r.pop % 2 ? 'A' : 'B') + ' 420ms ease-out'
        : 'none',
  };
};
/** Keep showing the old value until coins in flight land. */
export const holdRoll = (key: string, duration: number): void => {
  const r = rolls.get(key);
  if (!r) return;
  r.holdUntil = now() + duration;
};
/** Set the shown value without a roll (the change was already shown elsewhere). */
export const primeRoll = (key: string, value: number): void => {
  const r = rolls.get(key);
  if (r) {
    r.shown = r.from = r.to = value;
    r.started = true;
  }
};
export const finishRolls = (): void => {
  for (const r of rolls.values()) {
    r.shown = r.to;
    r.holdUntil = 0;
  }
  if (rollNotify) rollNotify();
};

/* ---------- tilt ---------- */

type Tilt = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  on: number;
};

let tiltOn = false;
const tilts = new Map<HTMLElement, Tilt>();
const tiltHostOf = (t: EventTarget | null): HTMLElement | null => {
  if (!(t instanceof Element)) return null;
  const host = t.closest('[data-tilt]');
  return host instanceof HTMLElement ? host : null;
};
/** Any [data-tilt] host tilts toward the pointer (perspective 600px, +-12deg),
 *  springs back on release, and exposes --tilt-x / --tilt-y / --tilt-on for
 *  specular and foil layers. [data-tilt-inner] is the element that rotates. */
export const initTilt = (): void => {
  if (tiltOn || typeof document === 'undefined') return;
  tiltOn = true;
  const aim = (host: HTMLElement, e: PointerEvent): void => {
    const r = host.getBoundingClientRect();
    let s = tilts.get(host);
    if (!s) {
      s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, on: 0 };
      tilts.set(host, s);
    }
    s.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    s.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    s.on = 1;
    loop();
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      const host = tiltHostOf(e.target);
      for (const [h, s] of tilts)
        if (h !== host) {
          s.on = 0;
          s.tx = 0;
          s.ty = 0;
        }
      if (host) aim(host, e);
      else loop();
    },
    { passive: true }
  );
  document.addEventListener(
    'pointerdown',
    (e) => {
      const host = tiltHostOf(e.target);
      if (host) aim(host, e);
    },
    { passive: true }
  );
  const release = (): void => {
    for (const s of tilts.values()) {
      s.on = 0;
      s.tx = 0;
      s.ty = 0;
    }
    loop();
  };
  document.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerType !== 'mouse') release();
    },
    { passive: true }
  );
  document.addEventListener('pointercancel', release, { passive: true });
};
let tiltRaf = 0;
const loop = (): void => {
  if (tiltRaf) return;
  tiltRaf = requestAnimationFrame(function step() {
    let busy = false;
    for (const [host, s] of tilts) {
      if (!host.isConnected) {
        tilts.delete(host);
        continue;
      }
      s.vx = (s.vx + (s.tx - s.x) * 0.18) * 0.72;
      s.vy = (s.vy + (s.ty - s.y) * 0.18) * 0.72;
      s.x += s.vx;
      s.y += s.vy;
      const found = host.querySelector('[data-tilt-inner]');
      const inner = found instanceof HTMLElement ? found : host;
      const max = reduced() ? 4 : 12;
      inner.style.transform = `perspective(600px) rotateX(${(-s.y * max).toFixed(2)}deg) rotateY(${(s.x * max).toFixed(2)}deg)`;
      host.style.setProperty('--tilt-x', s.x.toFixed(3));
      host.style.setProperty('--tilt-y', s.y.toFixed(3));
      host.style.setProperty(
        '--tilt-on',
        String(s.on || Math.min(1, Math.abs(s.x) + Math.abs(s.y)))
      );
      if (
        Math.abs(s.x - s.tx) +
          Math.abs(s.y - s.ty) +
          Math.abs(s.vx) +
          Math.abs(s.vy) >
        0.002
      )
        busy = true;
    }
    tiltRaf = busy ? requestAnimationFrame(step) : 0;
  });
};

/* ---------- wobble text ---------- */

export type WobbleOpts = {
  size?: number;
  color?: string;
  stroke?: string;
  stagger?: number;
};

/** Letters pop in one by one (scale 0 -> 1.3 -> 1, 40ms apart), then bob. */
export const wobble = (
  text: string,
  {
    size = 28,
    color = '#FFF2B0',
    stroke = '#000000',
    stagger = 40,
  }: WobbleOpts = {}
): HTMLDivElement => {
  const el = document.createElement('div');
  el.style.cssText = `display:flex;justify-content:center;font-family:VolterTitle,'Yoster Island',Volter,monospace;font-size:${size}px;line-height:1;color:${color};-webkit-text-stroke:${Math.max(3, Math.round(size / 6))}px ${stroke};paint-order:stroke fill;white-space:nowrap`;
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch === ' ' ? ' ' : ch;
    s.style.cssText = 'display:inline-block;transform:scale(0)';
    el.appendChild(s);
    const a = track(
      s.animate(
        [
          { transform: 'scale(0)' },
          { transform: 'scale(1.3)', offset: 0.6 },
          { transform: 'scale(1)' },
        ],
        {
          duration: ms(260),
          delay: ms(i * stagger),
          easing: 'ease-out',
          fill: 'forwards',
        }
      )
    );
    a.onfinish = () => {
      s.style.transform = 'none';
      if (!reduced())
        s.style.animation = `glLetterBob 1.3s ease-in-out ${(-i * 0.13).toFixed(2)}s infinite`;
    };
  });
  return el;
};

/* ---------- SFX (synthesized; swap for files in audio/tracks.ts) ---------- */

type SfxBus = { c: AudioContext; out: GainNode };
const bus = (): SfxBus | null => {
  const c = audio.context,
    out = audio.sfxOut;
  return c && out && c.state === 'running' ? { c, out } : null;
};
const env = (g: GainNode, t: number, peak: number, dur: number): void => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
};
const tone = (
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  peak = 0.2,
  at = 0
): void => {
  const b = bus();
  if (!b) return;
  const c = b.c;
  const t = c.currentTime + at,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, peak, dur);
  o.connect(g).connect(b.out);
  o.start(t);
  o.stop(t + dur + 0.05);
};
type NoiseOpts = {
  type?: BiquadFilterType;
  f0?: number;
  f1?: number;
  q?: number;
  peak?: number;
  at?: number;
};
let noiseBuf: AudioBuffer | null = null;
const noise = (
  dur: number,
  {
    type = 'bandpass',
    f0 = 1200,
    f1 = 0,
    q = 1,
    peak = 0.3,
    at = 0,
  }: NoiseOpts = {}
): void => {
  const b = bus();
  if (!b) return;
  const c = b.c;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + at,
    s = c.createBufferSource(),
    f = c.createBiquadFilter(),
    g = c.createGain();
  s.buffer = noiseBuf;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, peak, dur);
  s.connect(f).connect(g).connect(b.out);
  s.start(t);
  s.stop(t + dur + 0.05);
};
const semi = (n: number): number => Math.pow(2, n / 12);
export const sfx = {
  tick: (step = 0): void => tone('square', 880 * semi(step), 0, 0.04, 0.06),
  tear: (): void => noise(0.3, { f0: 3200, f1: 600, q: 0.7, peak: 0.35 }),
  crack: (i = 0): void =>
    noise(0.06, { type: 'highpass', f0: 1600 + i * 350, q: 0.8, peak: 0.25 }),
  whoosh: (): void => noise(0.32, { f0: 280, f1: 2600, q: 1.1, peak: 0.2 }),
  flip: (): void => {
    noise(0.03, { type: 'highpass', f0: 2600, peak: 0.22 });
    noise(0.03, { type: 'highpass', f0: 1900, peak: 0.18, at: 0.08 });
  },
  chime: (tier = 0): void => {
    const f = 660 * semi([0, 4, 7, 12][Math.min(tier, 3)] ?? 0);
    tone('sine', f, 0, 0.55, 0.2);
    tone('triangle', f * 2, 0, 0.25, 0.05);
  },
  thud: (): void => {
    tone('sine', 130, 45, 0.24, 0.45);
    noise(0.09, { type: 'lowpass', f0: 700, peak: 0.2 });
  },
  pop: (step = 0): void =>
    tone('sine', 620 * semi(step), 980 * semi(step), 0.08, 0.14),
  dull: (): void => tone('square', 150, 95, 0.15, 0.1),
  fanfare: (): void => {
    [0, 4, 7, 12].forEach((s, i) =>
      tone('triangle', 523 * semi(s), 0, 0.32, 0.16, i * 0.11)
    );
    [12, 16, 19].forEach((s) => tone('sine', 523 * semi(s), 0, 1.2, 0.07, 0.48));
  },
};
