import { Component } from 'react';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import {
  LOCATIONS,
  MAP_ART,
  mapPinUrlFor,
} from '../../shared/engine/campaign.js';

/**
 * The world map as a "focus diorama": the Base.png artwork with swaying grass,
 * a location sticker per campaign stop, and a tap that tips the world back,
 * lifts that location's animated art at ~2.2x and offers ENTER. Ported from
 * the "World Map" design component; ids are the campaign's location ids.
 */

export type WorldMapProps = {
  /** Fill the host box (true in the app). When false it sizes itself to the
   *  viewport, caps at 460px wide and draws its own bottom nav. */
  embedded: boolean;
  lockedIds: string[];
  onEnter: (id: string) => void;
  onFocusChange: (focused: boolean) => void;
  /** Max pointer tilt of the focused art, in degrees (0-20). */
  tiltMax?: number;
  /** How far the world tips back when a location is focused, in degrees (35-70). */
  pitch?: number;
  /** Spinning light rays behind the focused location. */
  showRays?: boolean;
};

type Phase = 'map' | 'dip' | 'focus' | 'exit';

type WorldMapState = {
  sel: string | null;
  last: string;
  phase: Phase;
  sw: number;
  sh: number;
  pan: number;
};

type MapLoc = {
  id: string;
  name: string;
  boss: string;
  waves: string;
  pin: string;
  at: { top?: number; bottom?: number; left?: number; right?: number };
  /** Sprite size in pixels of the 384px-wide map art. */
  w: number;
  h: number;
  /** Per-frame duration of the 8-frame idle sheet. */
  fms: number;
};

type Geo = {
  L: MapLoc;
  w: number;
  h: number;
  left: number;
  top: number;
  ax: number;
  ay: number;
};

type PinHandlers = {
  tap: (e: ReactMouseEvent<HTMLDivElement>) => void;
  tilt: (el: HTMLDivElement | null) => void;
  band: (el: HTMLDivElement | null) => void;
  squash: (el: HTMLDivElement | null) => void;
};

type Star = {
  x: string;
  y: string;
  size: string;
  color: string;
  anim: string;
};

type Cloud = { y: string; u: string; shadow: string; anim: string };

type Tuft = [x: number, y: number, w: number, h: number, phase: number];

const ART_W = MAP_ART.w;
const ART_H = MAP_ART.h;
const BASE_URL = MAP_ART.url;
const FX = '/fx/map/';
/** Sprites are laid out at focus size and scaled down on the map, so they
 *  rasterise crisp when focused. */
const HERO = 2.2;
const PIXEL_FONT = "var(--gl-pixel,'Yoster Island'),Volter,monospace";

/** Sprite heights (the width is the campaign's `pinW`) and the castle's
 *  faster idle. Everything else comes from campaign.ts. */
const PIN_SIZE: Record<string, { h: number; fms?: number }> = {
  forest: { h: 134 },
  bridge: { h: 102 },
  caves: { h: 132 },
  ghost: { h: 162 },
  mountain: { h: 148 },
  castle: { h: 200, fms: 150 },
};

const pct = (v: string | undefined): number | undefined =>
  v === undefined ? undefined : parseFloat(v);

const LOC: MapLoc[] = LOCATIONS.map((l) => {
  const size = PIN_SIZE[l.id];
  const at: MapLoc['at'] = {};
  const top = pct(l.at.top);
  const bottom = pct(l.at.bottom);
  const left = pct(l.at.left);
  const right = pct(l.at.right);
  if (top !== undefined) at.top = top;
  if (bottom !== undefined) at.bottom = bottom;
  if (left !== undefined) at.left = left;
  if (right !== undefined) at.right = right;
  return {
    id: l.id,
    name: l.name,
    boss: l.boss.toUpperCase(),
    waves:
      (l.minWaves === l.maxWaves
        ? String(l.minWaves)
        : l.minWaves + '-' + l.maxWaves) + ' WAVES',
    pin: l.pin,
    at,
    w: l.pinW,
    h: size?.h ?? l.pinW,
    fms: size?.fms ?? 180,
  };
});

// Swaying grass: the tufts already painted into Base.png, split out at build
// time (tools/map-grass.js), redrawn over the still map with their upper rows
// nudged one art pixel by a gust that rolls across the land.
// prettier-ignore
const TUFTS: Tuft[] = [[104,58,4,8,0.84],[122,58,6,8,1.43],[80,62,6,8,0.82],[60,68,4,8,0.64],[162,70,8,6,1.64],[228,74,4,8,2.03],[248,74,6,8,2.08],[206,78,6,8,1.99],[270,78,6,8,2.46],[40,84,8,4,0.68],[286,84,8,8,2.55],[50,96,6,8,0.82],[302,98,8,6,2.75],[188,104,4,8,1.64],[196,108,8,8,1.77],[306,114,8,4,2.75],[70,124,8,4,1.03],[298,126,8,6,2.38],[92,132,4,8,1.2],[98,136,4,6,1.14],[58,150,8,8,1.1],[286,156,8,4,2.71],[44,162,6,8,0.61],[30,168,8,8,0.71],[4,172,4,8,0.73],[16,172,6,8,0.7],[150,196,4,10,1.69],[326,198,6,8,2.94],[156,200,8,8,1.88],[348,200,4,8,3.27],[140,204,6,6,1.49],[274,204,6,8,2.45],[290,206,8,8,2.82],[304,218,6,4,2.69],[8,220,4,8,0.44],[20,228,8,8,0.62],[298,234,8,4,2.72],[30,242,8,4,0.71],[306,246,8,8,3.05],[374,248,8,8,3.36],[326,252,6,8,3.1],[360,252,6,8,3.42],[344,254,4,8,2.9],[26,270,8,8,0.71],[14,276,6,8,0.77],[2,280,4,8,0.66],[88,302,4,8,1.28],[74,304,8,8,1.06],[68,320,8,6,1.4],[64,334,8,8,0.96],[54,340,6,8,1.06],[132,344,4,4,1.62],[34,346,8,8,1.07],[124,350,4,4,1.86],[22,362,8,4,0.93],[234,362,4,4,2.3],[226,366,4,4,2.37],[380,366,4,4,3.43],[242,374,4,4,2.47],[28,372,8,8,0.94],[38,390,8,4,0.99],[150,392,6,4,1.91],[34,406,8,4,1.13],[132,412,4,8,1.66],[226,416,6,4,2.69],[24,414,8,8,0.99],[104,414,6,8,1.77],[144,414,8,8,1.95],[334,418,8,4,3.34],[116,416,8,8,1.69],[156,420,8,6,1.98],[14,420,6,8,1.04],[2,422,4,8,1.08],[330,430,8,6,3.21],[162,432,8,4,2.14],[188,436,6,4,2.11],[320,436,8,8,3.24],[282,444,6,4,2.86],[154,444,8,8,1.91],[310,448,8,4,3.09],[72,450,4,8,1.56],[10,452,4,8,1.15],[54,452,8,8,1.09],[146,452,6,8,2.11],[24,454,6,8,0.85],[100,454,6,8,1.57],[40,456,4,8,1.01],[118,456,6,8,1.54],[132,456,4,8,2.1],[350,458,8,8,3.31],[326,460,4,8,3.34],[340,460,4,8,3.2],[334,476,6,4,3.33],[86,490,6,4,1.61],[330,510,6,6,3.19],[16,514,4,6,1.3],[6,516,8,8,1.21],[20,520,6,6,1.32],[376,558,4,4,3.97],[244,554,14,16,3.01],[312,552,22,20,3.43],[260,560,8,12,2.82],[336,564,8,8,3.25],[374,570,6,8,3.65],[156,570,8,10,1.98],[364,574,4,8,3.46],[146,574,8,12,2.18],[240,578,4,8,2.68],[230,580,8,8,2.86],[352,582,8,8,3.63],[246,584,6,6,2.96],[346,594,8,4,3.48],[296,584,22,18,3.42],[166,598,8,10,2.17],[262,598,8,12,2.94],[344,604,8,6,3.81],[148,598,14,14,1.98],[174,608,8,12,2.37],[346,616,8,4,3.39],[152,614,8,12,2.43],[178,624,4,8,2.5],[190,624,4,8,2.73],[352,626,6,8,3.46],[4,628,4,8,1.36],[184,628,4,8,2.32],[360,640,8,4,4.01],[12,640,8,8,1.27],[370,648,8,8,3.95],[16,660,8,4,1.18],[376,660,8,8,3.78],[176,660,8,12,2.32],[160,660,14,16,2.38],[216,670,4,8,2.54],[16,674,8,4,1.45],[150,668,8,12,2.38],[222,674,4,6,2.93],[216,686,8,12,2.79],[22,676,22,24,1.13],[50,696,6,8,1.4],[66,698,4,8,1.92],[116,696,8,12,1.89],[160,702,4,8,2.5],[168,692,22,20,2.65],[98,696,14,16,1.71],[80,704,8,8,2.02],[94,714,8,8,2.12],[120,716,4,6,2.38],[126,720,4,4,2.41],[102,730,8,4,2.15],[246,724,8,12,3.02],[378,726,6,10,3.9],[14,734,8,8,1.5],[368,736,8,8,4.16],[354,738,4,8,3.82],[330,740,4,8,3.57],[342,740,6,8,3.74],[316,742,4,8,3.79],[104,746,8,4,2.09],[280,734,26,18,3.25],[204,750,8,8,2.85],[290,750,8,8,3.54],[214,750,10,10,2.78],[102,760,8,4,2.18],[280,758,8,8,3.32],[376,758,4,8,3.91],[22,762,8,6,1.39],[364,762,4,8,4.22],[274,768,8,6,3.58],[352,770,8,8,3.97],[72,774,4,8,2.05],[106,776,8,8,2.33],[272,782,8,4,3.18],[142,780,8,8,2.46],[152,780,4,8,2.27],[220,784,8,10,2.96],[116,786,8,8,2.23],[96,794,8,4,2.2],[348,794,8,4,4.13],[268,794,8,6,3.31],[126,794,8,8,2.13],[184,786,16,18,2.67],[140,800,6,8,2.23],[260,800,8,8,3.35],[248,804,8,8,3.2],[104,806,8,6,2.17],[346,808,8,4,3.91],[154,806,4,8,2.64],[168,808,4,8,2.54],[238,808,4,8,3.25],[222,810,8,8,2.77],[178,812,8,8,2.59],[196,812,4,8,2.84],[210,812,6,8,2.78],[326,826,4,6,3.9],[310,832,8,8,3.58],[298,842,8,4,3.48],[116,844,8,8,2.36]];

const buildSky = (): { stars: Star[]; clouds: Cloud[] } => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 46 }, (): Star => {
    const tw = rnd() < 0.45;
    return {
      x: (rnd() * 100).toFixed(2) + '%',
      y: (Math.pow(rnd(), 1.4) * 60).toFixed(2) + '%',
      size: rnd() < 0.25 ? '3px' : '2px',
      color: rnd() < 0.3 ? '#FFF2B0' : '#CBD9EC',
      anim: tw
        ? 'wmTwinkle ' +
          (1.8 + rnd() * 2.4).toFixed(2) +
          's steps(3,end) ' +
          (-rnd() * 4).toFixed(2) +
          's infinite'
        : 'none',
    };
  });
  const shapes = [
    ['..XXXX......', '.XXXXXXX.XX.', 'XXXXXXXXXXXX', '.XXXXXXXXXX.'],
    ['...XXX...', '.XXXXXXX.', 'XXXXXXXXX'],
    ['.XXX..XXX..', 'XXXXXXXXXXX', '.XXXXXXXXX.'],
  ];
  const specs: [y: number, u: number, si: number, dur: number][] = [
    [8, 5, 0, 70],
    [22, 4, 1, 95],
    [34, 6, 2, 120],
    [14, 3, 1, 85],
  ];
  const clouds = specs.map(([y, u, si, dur], k): Cloud => {
    const rows = shapes[si] ?? [];
    const sh: string[] = [];
    rows.forEach((r, ry) =>
      r.split('').forEach((ch, rx) => {
        if (ch !== 'X') return;
        const above = rows[ry - 1];
        const color =
          ry === 0 || above?.[rx] !== 'X'
            ? '#7A63B8'
            : ry === rows.length - 1
              ? '#45397A'
              : '#5B4A94';
        sh.push(rx * u + 'px ' + ry * u + 'px 0 0 ' + color);
      })
    );
    return {
      y: y + '%',
      u: u + 'px',
      shadow: sh.join(','),
      anim:
        'wmDrift ' +
        dur +
        's linear ' +
        (-dur * (0.15 + k * 0.23)).toFixed(1) +
        's infinite',
    };
  });
  return { stars, clouds };
};

const SKY = buildSky();

/** A damped spring as a CSS `linear()` easing, or an overshooting bezier
 *  where `linear()` is unsupported. */
const buildSpring = (): string => {
  const z = 0.5;
  const w = 10.5;
  const wd = w * Math.sqrt(1 - z * z);
  const pts: number[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    pts.push(
      +(
        1 -
        Math.exp(-z * w * t) *
          (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t))
      ).toFixed(4)
    );
  }
  pts[48] = 1;
  const ok =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('transition-timing-function', 'linear(0, 1)');
  return ok ? 'linear(' + pts.join(',') + ')' : 'cubic-bezier(.34,1.56,.64,1)';
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = no;
    i.src = src;
  });

const play = (
  el: HTMLElement | null | undefined,
  frames: Keyframe[],
  opts: KeyframeAnimationOptions
): void => {
  if (el && typeof el.animate === 'function') el.animate(frames, opts);
};

const MIRROR: CSSProperties = {
  position: 'absolute',
  imageRendering: 'pixelated',
  boxShadow: 'inset 0 0 0 9999px rgba(11,16,32,.4)',
  pointerEvents: 'none',
};

const NAV_ITEM: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 96,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const NAV_LABEL: CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 12,
  lineHeight: 1,
  color: '#CBD9EC',
};

export class WorldMap extends Component<WorldMapProps, WorldMapState> {
  override state: WorldMapState = {
    sel: null,
    last: LOC[0]?.id ?? 'forest',
    phase: 'map',
    sw: 430,
    sh: 900,
    pan: 0,
  };

  private readonly spring = buildSpring();
  private tiltEls: Record<string, HTMLDivElement | null> = {};
  private bandEls: Record<string, HTMLDivElement | null> = {};
  private squashEls: Record<string, HTMLDivElement | null> = {};
  private handlers: Record<string, PinHandlers> = {};
  private nx = 0;
  private ny = 0;
  private lastPtr = -1e9;
  private cur = { x: 0, y: 0, s: -1 };
  private stageEl: HTMLDivElement | null = null;
  private shakeEl: HTMLDivElement | null = null;
  private flashEl: HTMLDivElement | null = null;
  private measured = false;
  private ro: ResizeObserver | null = null;
  private raf = 0;
  private grassTimer: number | undefined;
  private timers: number[] = [];
  private moved = false;
  private drag: { y: number; pan: number } | null = null;

  override componentDidMount(): void {
    const measure = () => {
      if (!this.stageEl) return;
      const r = this.stageEl.getBoundingClientRect();
      const first = !this.measured;
      this.measured = true;
      this.setState((s) => ({
        sw: r.width,
        sh: r.height,
        pan: this.clampPan(first ? -1e9 : s.pan, r.width, r.height),
      }));
    };
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(measure);
      if (this.stageEl) this.ro.observe(this.stageEl);
    }
    measure();
  }

  override componentWillUnmount(): void {
    if (this.state.phase !== 'map') this.props.onFocusChange(false);
    clearInterval(this.grassTimer);
    this.ro?.disconnect();
    cancelAnimationFrame(this.raf);
    this.clearTimers();
  }

  private grassRef = (cv: HTMLCanvasElement | null): void => {
    clearInterval(this.grassTimer);
    this.grassTimer = undefined;
    if (
      !cv ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    )
      return;
    Promise.all([
      loadImage(FX + 'MapStill.png'),
      loadImage(FX + 'MapGrass.png'),
    ])
      .then(([still, grass]) => {
        if (!cv.isConnected) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        const frame = () => {
          if (!cv.isConnected) {
            clearInterval(this.grassTimer);
            return;
          }
          const t = performance.now() / 1000;
          ctx.drawImage(still, 0, 0);
          for (const [x, y, w, h, ph] of TUFTS) {
            const wave =
              Math.sin(t * 2.2 - ph) *
              (0.72 + 0.28 * Math.sin(t * 0.5 - x * 0.012));
            for (let r = 0; r < h; r += 2) {
              const s =
                Math.round((wave * (h - 2 - r)) / Math.max(2, h - 2)) * 2;
              ctx.drawImage(grass, x, y + r, w, 2, x + s, y + r, w, 2);
            }
          }
          cv.style.opacity = '1';
        };
        frame();
        clearInterval(this.grassTimer);
        this.grassTimer = window.setInterval(frame, 70);
      })
      .catch((e: unknown) => console.warn('grass', e));
  };

  private stageRef = (el: HTMLDivElement | null): void => {
    this.stageEl = el;
  };
  private shakeRef = (el: HTMLDivElement | null): void => {
    this.shakeEl = el;
  };
  private flashRef = (el: HTMLDivElement | null): void => {
    this.flashEl = el;
  };

  private clampPan(p: number, sw: number, sh: number): number {
    const wh = (sw / ART_W) * ART_H;
    return Math.max(Math.min(0, sh - wh), Math.min(0, p));
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private geo(sw: number): Geo[] {
    const s = sw / ART_W;
    const WW = sw;
    const WH = ART_H * s;
    return LOC.map((L) => {
      const w = L.w * s;
      const h = L.h * s;
      const left =
        L.at.left !== undefined
          ? (L.at.left / 100) * WW
          : WW - ((L.at.right ?? 0) / 100) * WW - w;
      const top =
        L.at.top !== undefined
          ? (L.at.top / 100) * WH
          : WH - ((L.at.bottom ?? 0) / 100) * WH - h;
      return { L, w, h, left, top, ax: left + w / 2, ay: top + h };
    });
  }

  private focus(id: string): void {
    this.clearTimers();
    this.setState({ sel: id, last: id, phase: 'dip' });
    this.props.onFocusChange(true);
    this.later(() => {
      this.setState({ phase: 'focus' });
      this.startLoop();
      this.later(() => this.land(), 450);
    }, 60);
  }

  private land(): void {
    play(
      this.shakeEl,
      [
        { transform: 'translate3d(3px,-2px,0)' },
        { transform: 'translate3d(-3px,2px,0)' },
        { transform: 'translate3d(2px,3px,0)' },
        { transform: 'translate3d(0,0,0)' },
      ],
      { duration: 50, easing: 'steps(1,end)' }
    );
    play(
      this.flashEl,
      [{ opacity: 0 }, { opacity: 0.6, offset: 0.2 }, { opacity: 0 }],
      { duration: 170, easing: 'ease-out' }
    );
  }

  private unfocus(): void {
    if (this.state.phase !== 'focus' && this.state.phase !== 'dip') return;
    this.clearTimers();
    const id = this.state.sel;
    this.setState({ phase: 'exit' });
    this.props.onFocusChange(false);
    this.later(() => {
      this.setState({ phase: 'map', sel: null });
      play(
        id === null ? null : this.squashEls[id],
        [
          { transform: 'scale(1.08,.9)' },
          { transform: 'scale(.97,1.04)' },
          { transform: 'scale(1,1)' },
        ],
        { duration: 220, easing: 'ease-out' }
      );
    }, 300);
  }

  private startLoop(): void {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      const ph = this.state.phase;
      const id = this.state.sel ?? this.state.last;
      const max = this.props.tiltMax ?? 10;
      const now = performance.now();
      let tx = 0;
      let ty = 0;
      let ts = -1.2;
      if (ph === 'focus') {
        if (now - this.lastPtr < 1600) {
          tx = -this.ny * max;
          ty = this.nx * max;
          ts = this.nx;
        } else {
          const t = now / 1000;
          tx = Math.sin(t * 0.9) * max * 0.2;
          ty = Math.sin(t * 0.55) * max * 0.3;
          ts = Math.sin(t * 0.55) * 0.9;
        }
      }
      const c = this.cur;
      c.x += (tx - c.x) * 0.14;
      c.y += (ty - c.y) * 0.14;
      c.s += (ts - c.s) * 0.1;
      const el = this.tiltEls[id];
      const band = this.bandEls[id];
      if (ph === 'map' && Math.abs(c.x) < 0.05 && Math.abs(c.y) < 0.05) {
        if (el) el.style.transform = '';
        c.x = c.y = 0;
        return;
      }
      if (el)
        el.style.transform =
          'rotateX(' +
          c.x.toFixed(2) +
          'deg) rotateY(' +
          c.y.toFixed(2) +
          'deg)';
      if (band)
        band.style.transform =
          'translate3d(' + (c.s * 26).toFixed(2) + '%,0,0)';
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private h(id: string): PinHandlers {
    const hit = this.handlers[id];
    if (hit) return hit;
    const made: PinHandlers = {
      tap: (e) => {
        e.stopPropagation();
        if (this.moved) return;
        const ph = this.state.phase;
        if (ph === 'map') this.focus(id);
        else if (ph === 'focus' && id !== this.state.sel) this.unfocus();
      },
      tilt: (el) => {
        this.tiltEls[id] = el;
      },
      band: (el) => {
        this.bandEls[id] = el;
      },
      squash: (el) => {
        this.squashEls[id] = el;
      },
    };
    this.handlers[id] = made;
    return made;
  }

  private onDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    this.moved = false;
    if (this.state.phase === 'map')
      this.drag = { y: e.clientY, pan: this.state.pan };
  };

  private onMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const r = this.stageEl?.getBoundingClientRect();
    if (r) {
      this.nx = Math.max(
        -1,
        Math.min(1, (e.clientX - r.left - 0.5 * r.width) / (0.5 * r.width))
      );
      this.ny = Math.max(
        -1,
        Math.min(1, (e.clientY - r.top - 0.58 * r.height) / (0.42 * r.height))
      );
      this.lastPtr = performance.now();
    }
    if (!this.drag) return;
    const d = e.clientY - this.drag.y;
    if (Math.abs(d) > 6) this.moved = true;
    if (this.moved)
      this.setState({
        pan: this.clampPan(this.drag.pan + d, this.state.sw, this.state.sh),
      });
  };

  private onUp = (): void => {
    this.drag = null;
  };

  private onWheel = (e: ReactWheelEvent<HTMLDivElement>): void => {
    if (this.state.phase === 'map') {
      const dy = e.deltaY;
      this.setState((s) => ({ pan: this.clampPan(s.pan - dy, s.sw, s.sh) }));
    }
  };

  private onStageClick = (): void => {
    if (!this.moved && this.state.phase === 'focus') this.unfocus();
  };

  private onBack = (e: ReactMouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    this.unfocus();
  };

  private onEnterClick = (e: ReactMouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    const id = this.state.sel ?? this.state.last;
    if (!this.props.lockedIds.includes(id)) this.props.onEnter(id);
  };

  override render() {
    const { sel, last, phase, sw, sh, pan } = this.state;
    const pitch = this.props.pitch ?? 58;
    const rays = this.props.showRays ?? true;
    const embedded = this.props.embedded;
    const locks = this.props.lockedIds;
    const F = phase === 'focus';
    const D = phase === 'dip';
    const E = phase === 'exit';
    const G = this.geo(sw);
    const fid = sel ?? last;
    const fg = G.find((g) => g.L.id === fid) ?? G[0];
    if (!fg) return null;
    const order = G.slice()
      .sort(
        (a, b) =>
          Math.hypot(a.ax - fg.ax, a.ay - fg.ay) -
          Math.hypot(b.ax - fg.ax, b.ay - fg.ay)
      )
      .map((g) => g.L.id);
    const b = 1 / HERO;
    const P = 2;
    const fL = fg.L;
    const fLocked = locks.includes(fL.id);
    const ww = sw;
    const wh = (ART_H * sw) / ART_W;
    const artSize = ww + 'px ' + wh + 'px';
    const outerH = embedded ? '100%' : '100dvh';
    const skyO = F ? 1 : 0;
    const skyTr = F ? 'opacity 300ms ease-out' : 'opacity 220ms ease-in';
    const dx = 0.5 * sw - fg.ax;
    const dy = 0.58 * sh - fg.ay;

    return (
      <div
        className="wm-root"
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          height: outerH,
          background: '#0B1020',
        }}
      >
        <div
          ref={this.stageRef}
          onPointerDown={this.onDown}
          onPointerMove={this.onMove}
          onPointerUp={this.onUp}
          onPointerCancel={this.onUp}
          onPointerLeave={this.onUp}
          onWheel={this.onWheel}
          onClick={this.onStageClick}
          style={{
            position: 'relative',
            margin: '0 auto',
            width: '100%',
            maxWidth: embedded ? 'none' : '460px',
            height: outerH,
            overflow: 'hidden',
            perspective: '900px',
            background: '#0B1020',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            fontFamily: 'Volter,ui-monospace,monospace',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: skyO,
              transition: skyTr,
              background:
                'linear-gradient(180deg,#060A17 0%,#0E1736 42%,#1F1C4A 78%,#35295E 100%)',
              pointerEvents: 'none',
            }}
          >
            {SKY.stars.map((s, i) => (
              <div
                key={'s' + i}
                style={{
                  position: 'absolute',
                  left: s.x,
                  top: s.y,
                  width: s.size,
                  height: s.size,
                  background: s.color,
                  animation: s.anim,
                }}
              />
            ))}
            {SKY.clouds.map((c, i) => (
              <div
                key={'c' + i}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: c.y,
                  animation: c.anim,
                  willChange: 'transform',
                }}
              >
                <div
                  style={{
                    width: c.u,
                    height: c.u,
                    boxShadow: c.shadow,
                    opacity: 0.85,
                  }}
                />
              </div>
            ))}
          </div>

          <div
            ref={this.shakeRef}
            style={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transformStyle: 'preserve-3d',
                transformOrigin: '50% 58%',
                transform: F
                  ? 'rotate(-5deg) scale(1.1)'
                  : 'rotate(0deg) scale(1)',
                transition: F
                  ? 'transform 500ms cubic-bezier(.3,1.3,.5,1)'
                  : 'transform 300ms cubic-bezier(.5,0,.3,1)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: ww + 'px',
                  height: wh + 'px',
                  transformStyle: 'preserve-3d',
                  transformOrigin: fg.ax + 'px ' + fg.ay + 'px',
                  transform: F
                    ? 'translate3d(' +
                      dx +
                      'px,' +
                      dy +
                      'px,0) rotateX(' +
                      pitch +
                      'deg)'
                    : 'translate3d(0px,' + pan + 'px,0) rotateX(0deg)',
                  transition: F
                    ? 'transform 500ms cubic-bezier(.3,1.25,.45,1)'
                    : E
                      ? 'transform 300ms cubic-bezier(.5,0,.3,1)'
                      : 'none',
                  willChange: 'transform',
                }}
              >
                <img
                  src={BASE_URL}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    imageRendering: 'pixelated',
                    pointerEvents: 'none',
                  }}
                />
                <canvas
                  ref={this.grassRef}
                  width={ART_W}
                  height={ART_H}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    imageRendering: 'pixelated',
                    pointerEvents: 'none',
                    opacity: 0,
                  }}
                />
                <div
                  style={{
                    ...MIRROR,
                    left: '-75%',
                    top: 0,
                    width: '75%',
                    height: '100%',
                    background:
                      'url(' + BASE_URL + ') 0 0/' + artSize + ' no-repeat',
                    transform: 'scale(-1,1)',
                  }}
                />
                <div
                  style={{
                    ...MIRROR,
                    left: '100%',
                    top: 0,
                    width: '75%',
                    height: '100%',
                    background:
                      'url(' + BASE_URL + ') right 0/' + artSize + ' no-repeat',
                    transform: 'scale(-1,1)',
                  }}
                />
                <div
                  style={{
                    ...MIRROR,
                    left: 0,
                    top: '100%',
                    width: '100%',
                    height: '35%',
                    background:
                      'url(' + BASE_URL + ') 0 100%/' + artSize + ' no-repeat',
                    transform: 'scale(1,-1)',
                  }}
                />
                <div
                  style={{
                    ...MIRROR,
                    left: '-75%',
                    top: '100%',
                    width: '75%',
                    height: '35%',
                    background:
                      'url(' + BASE_URL + ') 0 100%/' + artSize + ' no-repeat',
                    transform: 'scale(-1,-1)',
                  }}
                />
                <div
                  style={{
                    ...MIRROR,
                    left: '100%',
                    top: '100%',
                    width: '75%',
                    height: '35%',
                    background:
                      'url(' +
                      BASE_URL +
                      ') 100% 100%/' +
                      artSize +
                      ' no-repeat',
                    transform: 'scale(-1,-1)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '-75%',
                    top: 0,
                    width: '250%',
                    height: '20%',
                    background:
                      'linear-gradient(180deg,#35295E 0%,rgba(53,41,94,.55) 35%,rgba(53,41,94,0) 100%)',
                    opacity: skyO,
                    transition: skyTr,
                    pointerEvents: 'none',
                  }}
                />
                {G.map((g, gi) =>
                  this.renderPin(g, gi, {
                    sel,
                    F,
                    D,
                    E,
                    fg,
                    rank: order.indexOf(g.L.id),
                    b,
                    P,
                    pitch,
                    rays,
                    locked: locks.includes(g.L.id),
                    sw,
                    sh,
                  })
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '72px 20px 0',
              transform: F ? 'translate3d(0,0,0)' : 'translate3d(0,-240%,0)',
              transition: F
                ? 'transform 480ms cubic-bezier(.3,1.6,.5,1) 220ms'
                : 'transform 200ms ease-in',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: PIXEL_FONT,
                fontSize: 34,
                lineHeight: 1.1,
                color: '#FFF2B0',
                WebkitTextStroke: '7px #000000',
                paintOrder: 'stroke fill',
                textShadow: '0 5px 0 #141D2E',
                textAlign: 'center',
                letterSpacing: '.02em',
                textWrap: 'balance',
              }}
            >
              {fL.name}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                border: '2px solid #000000',
                borderRadius: '8px 2px 8px 2px',
                background: 'rgba(20,29,46,.92)',
                fontFamily: PIXEL_FONT,
                fontSize: 14,
                letterSpacing: '.06em',
              }}
            >
              <span style={{ color: '#CBD9EC' }}>{fL.waves}</span>
              <span style={{ color: '#FFC24B' }}>{fL.boss}</span>
            </div>
          </div>

          <div
            onClick={this.onBack}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #000000',
              borderRadius: '8px 2px 8px 2px',
              background: '#B5C0FF',
              boxShadow: '0 -3px 0 0 #7E84E6 inset, 0 3px 0 0 #FFF inset',
              fontFamily: PIXEL_FONT,
              fontSize: 22,
              color: '#000000',
              cursor: 'pointer',
              opacity: F ? 1 : 0,
              pointerEvents: F ? 'auto' : 'none',
              transition: 'opacity 200ms ease',
            }}
          >
            ✕
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 44,
              display: 'flex',
              justifyContent: 'center',
              transform: F ? 'scale(1)' : 'scale(0)',
              transition: F
                ? 'transform 420ms cubic-bezier(.3,1.8,.5,1) 420ms'
                : 'transform 160ms ease-in',
              pointerEvents: 'none',
            }}
          >
            <div
              className="wm-enter"
              onClick={this.onEnterClick}
              style={{
                pointerEvents: F && !fLocked ? 'auto' : 'none',
                width: 240,
                height: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #000000',
                borderRadius: '10px 2px 10px 2px',
                background: fLocked ? '#9AA3C7' : '#FCE270',
                boxShadow: fLocked
                  ? '0 -4px 0 0 #6E769C inset, 0 4px 0 0 #C9D0EE inset, 0 6px 0 0 rgba(0,0,0,.35)'
                  : '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 6px 0 0 rgba(0,0,0,.35)',
                fontFamily: PIXEL_FONT,
                fontSize: 30,
                color: '#000000',
                cursor: 'pointer',
                animation: fLocked
                  ? 'none'
                  : 'wmBreath 1.6s ease-in-out infinite',
              }}
            >
              {fLocked ? 'LOCKED' : 'ENTER'}
            </div>
          </div>

          {!embedded && this.renderNav(F)}

          <div
            ref={this.flashRef}
            style={{
              position: 'absolute',
              inset: 0,
              background: '#FFFFFF',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    );
  }

  private renderPin(
    g: Geo,
    gi: number,
    o: {
      sel: string | null;
      F: boolean;
      D: boolean;
      E: boolean;
      fg: Geo;
      rank: number;
      b: number;
      P: number;
      pitch: number;
      rays: boolean;
      locked: boolean;
      sw: number;
      sh: number;
    }
  ) {
    const { sel, F, D, E, fg, rank, b, P, pitch, rays, locked, sw, sh } = o;
    const L = g.L;
    const me = L.id === sel;
    const H = this.h(L.id);
    // Locations nearer the camera than the focused one vanish, so they never
    // cover it.
    const nearer = !me && g.ay > fg.ay + 2;
    let heroT = 'translateZ(0px) scale(' + b + ') rotate(0deg)';
    let heroTr = E
      ? 'transform 280ms cubic-bezier(.55,0,.8,.4)'
      : 'transform 180ms ease-out';
    if (me && D) {
      heroT = 'translateZ(0px) scale(' + b * 0.9 + ') rotate(0deg)';
      heroTr = 'transform 60ms ease-out';
    }
    // ~2.2x, shrunk only when a tall sprite would run into the banner or off
    // the sides.
    const fit = Math.min(
      1,
      (0.58 * sh - 170) / (g.h * HERO),
      (0.94 * sw) / (g.w * HERO)
    );
    if (me && F) {
      heroT =
        'translateZ(40px) scale(' +
        Math.max(0.4, fit).toFixed(3) +
        ') rotate(-6deg)';
      heroTr = 'transform 720ms ' + this.spring + ' 150ms';
    }
    const live = me && F;
    const hot = me && (F || D);
    const maskUrl = mapPinUrlFor(
      L.pin,
      locked ? 'Locked' : hot ? 'Active' : 'Default'
    );
    const sticker = FX + 'map-sticker/' + L.pin + '.png';
    // 8-frame sheets built from the repo art by tools/map-sprites.js.
    const sheet = locked
      ? mapPinUrlFor(L.pin, 'Locked')
      : FX + 'map-anim/' + L.pin + (hot ? '_Active.png' : '_Default.png');
    const dur = 8 * L.fms;
    const frameAnim = locked
      ? 'none'
      : 'wmFrames ' +
        dur +
        'ms steps(8) ' +
        (-(gi * 170) % dur) +
        'ms infinite';

    return (
      <div
        key={L.id}
        style={{
          position: 'absolute',
          left: g.left + 'px',
          top: g.top + 'px',
          width: g.w + 'px',
          height: g.h + 'px',
          transformStyle: 'preserve-3d',
          transform: 'translateZ(1px)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '100%',
            width: '170%',
            aspectRatio: '3/1',
            marginLeft: '-85%',
            opacity: live ? 1 : 0,
            transition: live
              ? 'opacity 300ms ease 320ms'
              : 'opacity 150ms ease',
            transform: 'translate3d(0,-50%,0)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                'radial-gradient(closest-side,rgba(6,8,20,.55),rgba(6,8,20,0))',
              animation: live
                ? 'wmShadow 2.3s ease-in-out 750ms infinite'
                : 'none',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 100%',
            transform:
              F && !nearer ? 'rotateX(' + -pitch + 'deg)' : 'rotateX(0deg)',
            transition: F
              ? nearer
                ? 'transform 200ms ease, opacity 220ms ease'
                : 'transform 520ms cubic-bezier(.3,1.6,.5,1) ' +
                  (60 + rank * 35) +
                  'ms'
              : 'transform 260ms cubic-bezier(.5,0,.5,1), opacity 200ms ease',
            opacity: F && nearer ? 0 : 1,
          }}
        >
          <div
            onClick={H.tap}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 0,
              width: '220%',
              marginLeft: '-110%',
              aspectRatio: L.w + '/' + L.h,
              transformOrigin: '50% 100%',
              transformStyle: 'preserve-3d',
              transform: heroT,
              transition: heroTr,
              willChange: 'transform',
              cursor: 'pointer',
            }}
          >
            <div
              ref={H.squash}
              style={{
                position: 'absolute',
                inset: 0,
                transformOrigin: '50% 100%',
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transformOrigin: '50% 100%',
                  transformStyle: 'preserve-3d',
                  animation: live
                    ? 'wmSway 3.1s ease-in-out 750ms infinite'
                    : 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transformStyle: 'preserve-3d',
                    animation: live
                      ? 'wmFloat 2.3s ease-in-out 750ms infinite'
                      : 'none',
                  }}
                >
                  <div
                    ref={H.tilt}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      transformOrigin: '50% 60%',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '-25%',
                        top: '50%',
                        width: '150%',
                        aspectRatio: '1/1',
                        transform: 'translate3d(0,-55%,0)',
                        opacity: live && rays ? 1 : 0,
                        transition: live
                          ? 'opacity 420ms ease 380ms'
                          : 'opacity 140ms ease',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'repeating-conic-gradient(from 0deg,rgba(255,242,176,.42) 0deg 7deg,rgba(255,242,176,0) 7deg 22.5deg)',
                          WebkitMaskImage:
                            'radial-gradient(closest-side,#000 18%,rgba(0,0,0,0) 100%)',
                          maskImage:
                            'radial-gradient(closest-side,#000 18%,rgba(0,0,0,0) 100%)',
                          animation: 'wmSpin 18s linear infinite',
                          animationPlayState: live ? 'running' : 'paused',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        left: (-P / L.w) * 100 + '%',
                        top: (-P / L.h) * 100 + '%',
                        width: ((L.w + 2 * P) / L.w) * 100 + '%',
                        height: ((L.h + 2 * P) / L.h) * 100 + '%',
                        overflow: 'hidden',
                        opacity: live ? 1 : 0,
                        transition: 'opacity 160ms ease',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '800%',
                          height: '100%',
                          background:
                            'url(' + sticker + ') 0 0/100% 100% no-repeat',
                          imageRendering: 'pixelated',
                          animation: frameAnim,
                          willChange: 'transform',
                        }}
                      />
                    </div>
                    <div
                      role="img"
                      aria-label={L.name}
                      data-pin={L.name}
                      data-location={L.id}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        overflow: 'hidden',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: locked ? '100%' : '800%',
                          height: '100%',
                          background:
                            'url(' + sheet + ') 0 0/100% 100% no-repeat',
                          imageRendering: 'pixelated',
                          animation: frameAnim,
                          willChange: 'transform',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        overflow: 'hidden',
                        WebkitMaskImage: 'url(' + maskUrl + ')',
                        maskImage: 'url(' + maskUrl + ')',
                        WebkitMaskSize: '100% 100%',
                        maskSize: '100% 100%',
                        opacity: live ? 1 : 0,
                        transition: 'opacity 200ms ease',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        ref={H.band}
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: '-100%',
                          width: '300%',
                          background:
                            'linear-gradient(115deg,rgba(255,255,255,0) 42%,rgba(255,255,255,.6) 50%,rgba(255,255,255,0) 58%)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /** Stand-alone (non-embedded) only: the design's own bottom nav. Its
   *  buttons are decorative in the design, as they are here. */
  private renderNav(F: boolean) {
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          display: 'flex',
          justifyContent: 'center',
          transform: F ? 'translate3d(0,160%,0)' : 'translate3d(0,0,0)',
          transition: F
            ? 'transform 240ms cubic-bezier(.6,0,.9,.4)'
            : 'transform 380ms cubic-bezier(.3,1.5,.5,1) 80ms',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 400,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(40,42,60,.9)',
            border: '2px solid #1D1C24',
            borderRadius: 6,
          }}
        >
          {this.navIcon('/art/NeuraKnights/gui/Shop_V2.png', 'SHOP', 44, 0)}
          {this.navIcon('/art/NeuraKnights/gui/Quest_V2.png', 'QUESTS', 44, -2)}
          <div style={{ ...NAV_ITEM, marginLeft: -2, zIndex: 2 }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                border: '2px solid #1D1C24',
                borderRadius: 6,
                background: '#428FFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 6,
                  background:
                    'url(/art/PocketKnights/Pattern/MenuButtonPatten.svg) center/cover',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: -17,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontFamily: PIXEL_FONT,
                  fontSize: 19,
                  color: '#FFFFFF',
                  WebkitTextStroke: '5px #000000',
                  paintOrder: 'stroke fill',
                }}
              >
                FIGHT
              </div>
              <div
                style={{
                  position: 'relative',
                  width: 49,
                  height: 49,
                  background:
                    'url(/icons/NameChangeIcon.svg) center/contain no-repeat',
                  imageRendering: 'pixelated',
                }}
              />
            </div>
          </div>
          {this.navIcon('/icons/BattlePassIcon.svg', 'DUEL', 41, -2)}
          {this.navIcon('/art/NeuraKnights/gui/Bag_V2.png', 'BAG', 44, -2)}
        </div>
      </div>
    );
  }

  private navIcon(src: string, label: string, size: number, ml: number) {
    return (
      <div style={{ ...NAV_ITEM, marginLeft: ml }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <div
            style={{
              width: size,
              height: size,
              background: 'url(' + src + ') center/contain no-repeat',
              imageRendering: 'pixelated',
            }}
          />
          <div style={NAV_LABEL}>{label}</div>
        </div>
      </div>
    );
  }
}
