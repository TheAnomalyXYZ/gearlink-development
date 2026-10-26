/**
 * Victory / defeat sequence (Victory, Level & Booster Flow brief).
 *
 * Beats: 0 kill, 1 title stamp, 2 tally, 3 loot, 4 XP (level-ups play inside),
 * 6 settle. The server has already saved every reward; this only animates from
 * the result. A tap fast-forwards the playing beat (the next tap, or a short
 * pause, moves on); Skip makes everything final - except level-ups and book
 * grants, which always play a 300ms version so they can't be missed.
 */
import * as fx from './fx.js';
import type { FxHelpers } from './fx.js';
import type { SubmitRunResponse } from '../../shared/api.js';
import {
  bookFor,
  xpToNext,
  type LevelUp,
  type XpResult,
} from '../../shared/engine/level.js';

const FT = "VolterTitle,'Yoster Island',Volter,monospace";
const FB = 'Volter,ui-monospace,monospace';
type BtnStyle = readonly [bg: string, shadow: string, fg: string];
const BTN: Record<'primary' | 'home' | 'quiet', BtnStyle> = {
  primary: [
    '#FCE270',
    '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
    '#000000',
  ],
  home: [
    '#8FE07A',
    '0 -4px 0 0 #3F9A44 inset, 0 4px 0 0 #E4FFD9 inset, 0 2px 0 0 rgba(0,0,0,.25)',
    '#000000',
  ],
  quiet: [
    '#1D2956',
    '0 -4px 0 0 #101836 inset, 0 3px 0 0 #3A4C74 inset, 0 2px 0 0 rgba(0,0,0,.25)',
    '#CBD9EC',
  ],
};
const STAT = {
  waves: '#7FA6FF',
  link: '#C29BFF',
  turns: '#CBD9EC',
  score: '#9CF08F',
  hearts: '#FF8A94',
  coins: '#FCE370',
};
const FLAVOR: Record<string, string> = {
  won: 'The elite fell and the road ahead is open. The next location fields more waves and a bigger guard.',
  ascended:
    'The King is down. The map opens again from Greenwood, and everything on it hits harder from here.',
  dead: 'The guard hits hard. A stronger shield might hold.',
  stuck:
    'No legal link left and no bomb to break the board open. Keep a playable colour in reserve.',
  unsaved: 'This battle could not be saved, so it paid out nothing.',
};

export type EndReason = 'won' | 'dead' | 'stuck';

/** What the sequence needs from the server's answer for the run. */
export type VictoryResult = Pick<
  SubmitRunResponse,
  | 'waves'
  | 'waveCount'
  | 'chain'
  | 'score'
  | 'coinsEarned'
  | 'heartPiecesEarned'
> & { xp: XpResult | null; isBestLink: boolean; ascended: boolean };

/** The app members the victory screen drives. */
export type VictoryApp = {
  state: {
    phase: string;
    profile: { coins: number; heartPieces: number };
    bs: { wavesCleared: number; maxChain: number; turnsUsed: number } | null;
  };
  postMode: boolean;
  /** Resolves with the server's answer for this run (null if it never banked). */
  runDone: Promise<VictoryResult | null> | null;
  enterEnd: () => void;
  goMap: () => void;
  goHome: () => void;
  retryRun: () => void;
  replayDaily: () => void;
  /** Set on a Daily Battle post: back to its poster and ladder. */
  dailyDone: (() => void) | null;
  openBooks: (ids: string[], from: 'victory') => void;
  openFullGame: (e: MouseEvent, go?: string) => void;
  afterBooks: (() => void) | null;
};

export type VictoryHelpers = FxHelpers & { heartIcon: string };

/** Named events: the audio layer maps these to sounds later; for now they fire
 *  the synth kit and haptics, and are re-dispatched as `gl:fx` for listeners. */
const vib = (p: number): void => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* blocked in some frames */
  }
};
let lastCoinBuzz = 0;
const emit = (name: string, step = 0): void => {
  const S = fx.sfx;
  if (name === 'kill') {
    S.thud();
    vib(24);
  } else if (name === 'stamp') {
    S.thud();
    vib(10);
  } else if (name === 'tick') S.tick(Math.min(14, step));
  else if (name === 'coin_land') {
    S.tick(Math.min(14, step));
    if (performance.now() - lastCoinBuzz > 90) {
      vib(6);
      lastCoinBuzz = performance.now();
    }
  } else if (name === 'xp_orb') S.pop(Math.min(10, step));
  else if (name === 'level_up') {
    S.fanfare();
    vib(24);
  } else if (name === 'book_grant') {
    S.chime(2);
    vib(10);
  }
  try {
    window.dispatchEvent(new CustomEvent('gl:fx', { detail: { name, step } }));
  } catch {
    /* no window */
  }
};

const mk = (
  parent: HTMLElement | null,
  css: string,
  text?: string | null,
  attrs?: Record<string, string>
): HTMLDivElement => {
  const e = document.createElement('div');
  e.style.cssText = css;
  if (text != null) e.textContent = text;
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k] ?? '');
  if (parent) parent.appendChild(e);
  return e;
};
const num = (v: number): string => Math.round(v).toLocaleString();
let orbIcon: string | null = null;
const orb = (): string => {
  if (orbIcon) return orbIcon;
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#4FB7E8';
    g.fillRect(0, 0, 4, 4);
    g.fillStyle = '#E6FBFF';
    g.fillRect(1, 1, 2, 2);
  }
  return (orbIcon = c.toDataURL());
};

type Tween = { done: boolean; fin: () => void };

/* ---------- a beat's clock: waits, tweens and animations that can be
   fast-forwarded to their end state at any moment ---------- */
class Ctx {
  fast: boolean;
  done = false;
  readonly k: number;
  private waits: Array<[ReturnType<typeof setTimeout>, () => void]> = [];
  private anims: Animation[] = [];
  private tweens: Tween[] = [];
  constructor(fast = false, k = 1) {
    this.fast = fast;
    this.k = k;
  }
  ms(v: number): number {
    return this.fast ? 0 : v * this.k * (fx.reduced() ? 0.6 : 1);
  }
  wait(v: number): Promise<void> {
    return new Promise((res) => {
      if (this.fast) return res();
      const t = setTimeout(res, this.ms(v));
      this.waits.push([t, res]);
    });
  }
  anim(
    node: HTMLElement | null,
    frames: Keyframe[],
    dur: number,
    easing = 'cubic-bezier(.2,.9,.3,1.25)',
    delay = 0
  ): Promise<void> {
    if (!node) return Promise.resolve();
    const a = node.animate(frames, {
      duration: Math.max(1, this.ms(dur)),
      delay: this.ms(delay),
      easing,
      fill: 'forwards',
    });
    this.anims.push(a);
    if (this.fast) a.finish();
    return a.finished.then(
      () => undefined,
      () => undefined
    );
  }
  tween(dur: number, fn: (u: number) => void): Promise<void> {
    return new Promise((res) => {
      const d = this.ms(dur);
      if (this.fast || !d || fx.reduced()) {
        fn(1);
        return res();
      }
      const t0 = performance.now();
      const tw: Tween = {
        done: false,
        fin: () => {
          if (tw.done) return;
          fn(1);
          tw.done = true;
          res();
        },
      };
      this.tweens.push(tw);
      const step = (): void => {
        if (tw.done) return;
        const u = Math.min(1, (performance.now() - t0) / d);
        fn(u);
        if (u >= 1) tw.fin();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  ffwd(): void {
    if (this.fast) return;
    this.fast = true;
    this.waits.forEach(([t, r]) => {
      clearTimeout(t);
      r();
    });
    this.waits = [];
    this.anims.forEach((a) => {
      try {
        a.finish();
      } catch {
        /* gone */
      }
    });
    this.tweens.forEach((t) => t.fin());
  }
}

let H: VictoryHelpers | null = null;
let cur: Victory | null = null;

/** Called every render from buildView: keeps view helpers, tears the overlay
 *  down if the app has left the battle / end screens. */
export const syncVictory = (app: VictoryApp, helpers: VictoryHelpers): void => {
  H = helpers;
  const ph = app.state.phase;
  if (
    cur &&
    ph !== 'battle' &&
    ph !== 'end' &&
    !(cur.suspended && ph === 'opening')
  ) {
    cur.destroy();
    cur = null;
  }
};

/** Start the sequence; false if it could not (no document, or no view
 *  helpers yet), so the caller can go straight to the end screen. */
export const start = (
  app: VictoryApp,
  opts: { reason: EndReason; locationName: string }
): boolean => {
  if (typeof document === 'undefined' || !H) return false;
  if (cur) cur.destroy();
  cur = new Victory(app, H, opts);
  return true;
};

type Chip = { c: HTMLDivElement; i: HTMLDivElement; n: HTMLDivElement };

class Victory {
  readonly app: VictoryApp;
  readonly h: VictoryHelpers;
  readonly reason: EndReason;
  readonly won: boolean;
  readonly before: { coins: number; hearts: number };
  readonly bs: VictoryApp['state']['bs'];
  readonly locName: string;
  books: string[] = [];
  suspended = false;
  dead = false;
  private stageBg: string;
  private res: VictoryResult | null = null;
  private ctx: Ctx | null = null;
  private tapped = false;
  private skipAll = false;
  private gateRes: (() => void) | null = null;
  private flyFinish: (() => void) | null = null;
  private statEls: Record<string, HTMLDivElement> = {};
  private wideLayout = false;
  private short: boolean | null = null;
  private placer: ReturnType<typeof setInterval> | null = null;
  private onResize = (): void => this.place();

  // layout nodes, built in the constructor
  private root!: HTMLDivElement;
  private scrim!: HTMLDivElement;
  private panel!: HTMLDivElement;
  private rays!: HTMLDivElement;
  private col!: HTMLDivElement;
  private top!: HTMLDivElement;
  private wallet!: Chip;
  private heart!: Chip;
  private tb!: HTMLDivElement;
  private title!: HTMLDivElement;
  private sub!: HTMLDivElement;
  private lvBlock!: HTMLDivElement;
  private badge!: HTMLDivElement;
  private badgeNumBox!: HTMLDivElement;
  private badgeNum!: HTMLDivElement;
  private fill!: HTMLDivElement;
  private edge!: HTMLDivElement;
  private barText!: HTMLDivElement;
  private next!: HTMLDivElement;
  private lines!: HTMLDivElement;
  private card!: HTMLDivElement;
  private cardInner!: HTMLDivElement;
  private flavor!: HTMLDivElement;
  private grid!: HTMLDivElement;
  private tray!: HTMLDivElement;
  private slots!: HTMLDivElement;
  private btns!: HTMLDivElement;
  private skipBtn!: HTMLDivElement;

  constructor(
    app: VictoryApp,
    h: VictoryHelpers,
    opts: { reason: EndReason; locationName: string }
  ) {
    this.app = app;
    this.h = h;
    this.reason = opts.reason;
    this.won = opts.reason === 'won';
    this.locName = opts.locationName;
    this.before = {
      coins: app.state.profile.coins,
      hearts: app.state.profile.heartPieces || 0,
    };
    this.bs = app.state.bs;
    this.stageBg = findStageBg();
    this.build();
    void this.run();
  }

  /* ---------- layout ---------- */
  private build(): void {
    const R = (this.root = mk(
      document.body,
      `position:fixed;z-index:9400;overflow:hidden;font-family:${FB};user-select:none;-webkit-tap-highlight-color:transparent`
    ));
    R.addEventListener('click', (e) => {
      const t = e.target;
      if (t instanceof Element && t.closest('[data-v-btn]')) return;
      this.tap();
    });
    this.scrim = mk(
      R,
      `position:absolute;inset:0;background:${this.won ? '#0B1020' : '#16181F'};opacity:0`
    );
    this.panel = mk(
      R,
      'position:absolute;inset:0;opacity:0;background-color:#141D2E;background-size:cover;background-position:center;image-rendering:pixelated'
    );
    this.panel.style.backgroundImage = this.stageBg
      ? 'linear-gradient(180deg,rgba(11,16,32,.35) 0%,rgba(11,16,32,.55) 45%,rgba(11,16,32,.85) 100%),' +
        this.stageBg
      : 'linear-gradient(180deg,#141D2E,#0F1626)';
    this.rays = mk(
      R,
      'position:absolute;left:50%;top:0;width:150%;aspect-ratio:1/1;transform:translate(-50%,-50%);opacity:0;pointer-events:none;-webkit-mask-image:radial-gradient(closest-side,#000 10%,transparent 100%);mask-image:radial-gradient(closest-side,#000 10%,transparent 100%)'
    );
    mk(
      this.rays,
      'position:absolute;inset:0;background:repeating-conic-gradient(from 0deg,rgba(255,242,176,.55) 0deg 7deg,transparent 7deg 22.5deg);animation:glRaysSpin 18s linear infinite'
    );
    const col = (this.col = mk(
      R,
      'position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;padding:12px 14px 16px;overflow-y:auto;overflow-x:hidden;scrollbar-width:none',
      null,
      { 'data-v-col': '' }
    ));
    if (!document.getElementById('gl-v-col')) {
      const st = document.createElement('style');
      st.id = 'gl-v-col';
      st.textContent = '[data-v-col]::-webkit-scrollbar{display:none}';
      document.head.appendChild(st);
    }
    // top bar: wallet + heart meter (destinations for flying loot)
    this.top = mk(
      col,
      'display:flex;justify-content:space-between;align-items:center;min-height:28px;opacity:0'
    );
    const chip = (icon: string, color: string): Chip => {
      const c = mk(
        this.top,
        'display:flex;align-items:center;gap:6px;height:28px;padding:0 9px 0 6px;border:1px solid #3A4C74;border-radius:4px;background:rgba(20,29,46,.92)'
      );
      const i = mk(
        c,
        `width:18px;height:18px;background:url("${icon}") center/contain no-repeat;image-rendering:pixelated`
      );
      const n = mk(
        c,
        `font-family:${FT};font-size:15px;color:${color};font-variant-numeric:tabular-nums;min-width:3ch`
      );
      return { c, i, n };
    };
    this.wallet = chip(this.h.coinIcon, '#FCE370');
    this.heart = chip(this.h.heartIcon, '#FF8A94');
    if (this.app.postMode) {
      this.top.style.gap = '8px';
      this.heart.c.style.marginLeft = 'auto';
      const x = mk(
        this.top,
        `display:flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:2px solid #000000;border-radius:6px 2px 6px 2px;background:#B5C0FF;box-shadow:inset 0 -3px 0 #7E84E6,inset 0 2px 0 #FFFFFF;font-family:${FT};font-size:12px;color:#000000;white-space:nowrap;cursor:pointer`,
        '⤢ OPEN IN EXPANDED MODE',
        { 'data-v-btn': '' }
      );
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        this.leave(() => this.app.openFullGame(e));
      });
    }
    this.wallet.n.textContent = num(this.before.coins);
    this.heart.n.textContent = String(this.before.hearts);
    // title block
    this.tb = mk(
      col,
      'display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:4px'
    );
    this.title = mk(
      this.tb,
      `font-family:${FT};font-size:30px;line-height:1;color:${this.won ? '#FFF2B0' : '#C9CEDA'};-webkit-text-stroke:6px #000000;paint-order:stroke fill;text-shadow:0 4px 0 #0B1020;text-align:center;opacity:0`,
      this.won
        ? 'LOCATION TAKEN'
        : this.reason === 'stuck'
          ? 'BOARD LOCKED'
          : 'DRIVEN BACK'
    );
    this.sub = mk(this.tb, 'display:flex;align-items:center;gap:8px;opacity:0');
    mk(
      this.sub,
      `font-family:${FT};font-size:16px;color:#CBD9EC;letter-spacing:.06em`,
      this.locName.toUpperCase()
    );
    if (this.won)
      mk(
        this.sub,
        `padding:2px 7px 3px;border:2px solid #FF6B5B;border-radius:4px;background:rgba(178,58,72,.25);font-family:${FT};font-size:12px;color:#FFB0A8;transform:rotate(-6deg)`,
        'TAKEN'
      );
    // level strip + xp lines
    this.lvBlock = mk(
      col,
      'display:flex;flex-direction:column;gap:6px;visibility:hidden'
    );
    const strip = mk(this.lvBlock, 'display:flex;align-items:center;gap:8px');
    this.badge = mk(
      strip,
      'position:relative;width:46px;height:46px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid #000000;border-radius:8px 8px 14px 14px;background:#3459C2;box-shadow:inset 0 -4px 0 #142663,inset 0 3px 0 #6F93F2;overflow:hidden'
    );
    mk(
      this.badge,
      `font-family:${FT};font-size:9px;line-height:1;color:#BFD3FF`,
      'LV'
    );
    this.badgeNumBox = mk(
      this.badge,
      'position:relative;width:100%;height:20px;overflow:hidden'
    );
    this.badgeNum = mk(
      this.badgeNumBox,
      `position:absolute;inset:0;text-align:center;font-family:${FT};font-size:19px;line-height:20px;color:#FFFFFF`
    );
    const bar = mk(
      strip,
      'position:relative;flex:1;min-width:0;height:18px;border:2px solid #000000;border-radius:3px;background:#0B1020;overflow:hidden'
    );
    this.fill = mk(
      bar,
      'position:absolute;inset:0;background:linear-gradient(#8FE3FF 0 45%,#4FB7E8 45%);transform-origin:0 50%;transform:scaleX(0)'
    );
    this.edge = mk(
      bar,
      'position:absolute;top:0;bottom:0;left:0;width:3px;margin-left:-3px;background:#FFFFFF;box-shadow:0 0 6px #BFF3FF'
    );
    this.barText = mk(
      bar,
      `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:${FT};font-size:11px;color:#FFFFFF;-webkit-text-stroke:3px #0B1020;paint-order:stroke fill;font-variant-numeric:tabular-nums`
    );
    this.next = mk(
      strip,
      'width:34px;height:40px;flex-shrink:0;background-position:center;background-size:contain;background-repeat:no-repeat;image-rendering:pixelated;filter:drop-shadow(0 2px 0 rgba(0,0,0,.45))'
    );
    this.lines = mk(
      this.lvBlock,
      'display:flex;flex-wrap:wrap;gap:5px;min-height:22px'
    );
    // results: a navy flavour strip over a 2x3 grid of chunky stat tiles
    this.card = mk(
      col,
      'width:100%;opacity:0;border-radius:14px;background:radial-gradient(120% 95% at 50% 50%,rgba(5,8,18,.78) 0%,rgba(5,8,18,.6) 60%,rgba(5,8,18,.18) 100%)'
    );
    this.cardInner = mk(
      this.card,
      'display:flex;flex-direction:column;gap:12px;padding:14px 16px 16px'
    );
    this.flavor = mk(
      this.cardInner,
      'font-size:12px;color:#E6EEFA;text-align:center;line-height:1.55;text-wrap:pretty;text-shadow:0 2px 0 #05080F'
    );
    this.grid = mk(
      this.cardInner,
      'width:100%;display:grid;grid-template-columns:1fr 1fr;gap:12px 18px'
    );
    // reward tray
    this.tray = mk(
      col,
      'display:none;align-items:center;gap:10px;min-height:56px;padding:6px 10px;border:2px solid #213854;border-radius:8px 2px 8px 2px;background:rgba(11,16,32,.6)'
    );
    mk(
      this.tray,
      `font-family:${FT};font-size:12px;color:#9DB4D4;letter-spacing:.08em`,
      'BOOKS'
    );
    this.slots = mk(this.tray, 'display:flex;gap:8px;align-items:center');
    // buttons
    this.btns = mk(
      col,
      'display:flex;flex-direction:column;gap:8px;margin-top:auto'
    );
    this.skipBtn = mk(
      R,
      `position:absolute;bottom:14px;right:14px;z-index:3;padding:5px 10px 6px;border:2px solid #3A4C74;border-radius:4px;background:rgba(11,16,32,.85);font-family:${FT};font-size:12px;color:#CBD9EC;cursor:pointer;opacity:0`,
      'SKIP ›',
      { 'data-v-btn': '' }
    );
    this.skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.skip();
    });
    this.place();
    window.addEventListener('resize', this.onResize);
    this.placer = setInterval(this.onResize, 400);
  }

  /** Cover the game's frame, and switch to a two-column layout when the frame
   *  is wide and short (the inline post). */
  private place(): void {
    const f = document.querySelector('.gl-frame');
    const r = f
      ? f.getBoundingClientRect()
      : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    Object.assign(this.root.style, {
      left: r.left + 'px',
      top: r.top + 'px',
      width: r.width + 'px',
      height: r.height + 'px',
    });
    const wide = r.width > r.height * 1.2 && r.width >= 560;
    if (wide !== this.wideLayout) {
      this.wideLayout = wide;
      const C = this.col.style;
      C.display = wide ? 'grid' : 'flex';
      C.gridTemplateColumns = wide ? 'minmax(0,1.15fr) minmax(0,1fr)' : '';
      C.gridAutoRows = wide ? 'min-content' : '';
      C.alignContent = wide ? 'start' : '';
      C.columnGap = wide ? '16px' : '';
      const at = (el: HTMLElement, column: string, row: string): void => {
        el.style.gridColumn = wide ? column : '';
        el.style.gridRow = wide ? row : '';
      };
      at(this.top, '1 / -1', '1');
      at(this.tb, '1 / -1', '2');
      at(this.card, '1', '3 / span 3');
      at(this.lvBlock, '2', '3');
      at(this.tray, '2', '4');
      at(this.btns, '2', '5');
      this.btns.style.marginTop = wide ? '0' : 'auto';
    }
    const short = r.height < 720;
    if (short !== this.short) {
      this.short = short;
      this.col.style.gap = short ? '7px' : '10px';
      this.col.style.paddingTop = short ? '8px' : '12px';
      this.title.style.fontSize = short ? '24px' : '30px';
      this.flavor.style.display = short ? 'none' : 'block';
      this.grid.style.gap = short ? '8px 18px' : '12px 18px';
      this.cardInner.style.padding = short
        ? '10px 14px 12px'
        : '14px 16px 16px';
      this.lines.style.minHeight = short ? '0' : '22px';
    }
  }

  /** Smooth-scroll the column so an element is fully in view. */
  private reveal(el: HTMLElement, ctx: Ctx | null): void {
    const c = this.col.getBoundingClientRect(),
      r = el.getBoundingClientRect();
    const d =
      r.bottom > c.bottom - 8
        ? r.bottom - c.bottom + 12
        : r.top < c.top
          ? r.top - c.top - 12
          : 0;
    if (d)
      this.col.scrollBy({
        top: d,
        behavior: ctx && ctx.fast ? 'auto' : 'smooth',
      });
  }

  private shake(ctx: Ctx, px = 3, ms = 200): void {
    if (fx.reduced() || ctx.fast) return;
    const f: Keyframe[] = [];
    for (let i = 0; i < 6; i++)
      f.push({
        transform: `translate(${i % 2 ? px : -px}px,${i % 3 ? 1 : -1}px)`,
      });
    f.push({ transform: 'none' });
    this.col.animate(f, { duration: ms, easing: 'steps(6,end)' });
  }

  /* ---------- sequencer ---------- */
  private tap(): void {
    if (this.ctx && !this.ctx.fast && !this.ctx.done) {
      this.tapped = true;
      this.ctx.ffwd();
    } else if (this.gateRes) this.gateRes();
  }
  private skip(): void {
    this.skipAll = true;
    this.skipBtn.style.display = 'none';
    this.ctx?.ffwd();
    this.gateRes?.();
  }
  private gate(ms: number): Promise<void> {
    return new Promise((res) => {
      const t = setTimeout(() => {
        this.gateRes = null;
        res();
      }, ms);
      this.gateRes = () => {
        clearTimeout(t);
        this.gateRes = null;
        res();
      };
    });
  }
  private async run(): Promise<void> {
    const beats: Array<[string, () => Promise<void>, (() => boolean)?]> = [
      ['kill', () => this.kill()],
      ['stamp', () => this.stamp()],
      ['tally', () => this.tally()],
      [
        'loot',
        () => this.loot(),
        () =>
          !this.res || (!this.res.coinsEarned && !this.res.heartPiecesEarned),
      ],
      ['xp', () => this.xp(), () => !this.res || !this.res.xp],
      ['settle', () => this.settle()],
    ];
    for (const [id, play, skipIf] of beats) {
      if (this.dead) return;
      if (skipIf && skipIf()) continue;
      const ctx = (this.ctx = new Ctx(this.skipAll && id !== 'settle'));
      this.tapped = false;
      await play();
      ctx.done = true;
      if (this.dead) return;
      if (this.tapped && !this.skipAll && id !== 'settle' && id !== 'stamp')
        await this.gate(700);
    }
  }
  private get c(): Ctx {
    return this.ctx ?? new Ctx(true);
  }

  /* ---------- 0: kill ---------- */
  private async kill(): Promise<void> {
    const c = this.c;
    const m = fx.visible('[data-juice="monster"]');
    if (this.won && m) {
      const r = m.getBoundingClientRect();
      const colors = sampleColors(m);
      fx.hitStop(c.fast ? 0 : 120);
      m.style.animation = 'none';
      m.style.filter = 'brightness(0) invert(1)';
      emit('kill');
      await c.wait(34);
      m.style.visibility = 'hidden';
      if (!c.fast && !fx.reduced())
        for (let gy = 0; gy < 3; gy++)
          for (let gx = 0; gx < 3; gx++)
            fx.burst(
              r.left + r.width * (0.25 + gx * 0.25),
              r.top + r.height * (0.25 + gy * 0.25),
              { colors, count: 6, speed: 220, life: 560 }
            );
    } else if (!this.won) {
      emit('stamp');
      if (!c.fast) fx.flash('#FF3B3B', 140, 0.28);
    }
    const board = document.querySelector('[data-juice-board="main"]');
    const cells = board
      ? [...board.querySelectorAll<HTMLElement>('[data-cell]')]
      : [];
    const jobs = cells.map((el) => {
      const row = Math.floor(Number(el.getAttribute('data-cell') || 0) / 6);
      return this.won
        ? c.anim(
            el,
            [
              { translate: '0 0', opacity: 1 },
              { translate: '0 160%', opacity: 0 },
            ],
            260,
            'cubic-bezier(.55,0,.9,.4)',
            (4 - row) * 40
          )
        : c.anim(
            el,
            [{ opacity: 1 }, { opacity: 0 }],
            260,
            'ease-out',
            (4 - row) * 40
          );
    });
    await Promise.all([...jobs, c.wait(700)]);
  }

  /* ---------- 1: title stamp ---------- */
  private async stamp(): Promise<void> {
    const c = this.c;
    this.skipBtn.style.opacity = '1';
    void c.anim(
      this.scrim,
      [{ opacity: 0 }, { opacity: this.won ? 0.6 : 0.72 }],
      220,
      'ease-out'
    );
    await c.anim(
      this.title,
      [
        { transform: 'scale(1.6)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      200,
      'cubic-bezier(.5,0,.75,0)'
    );
    emit('stamp');
    if (this.won) {
      this.shake(c, 3, 200);
      const r = this.title.getBoundingClientRect();
      if (!c.fast && !fx.reduced())
        fx.burst(r.left + r.width / 2, r.bottom, {
          colors: ['#C9B79C', '#8A7A66', '#E6D7BF'],
          count: 14,
          speed: 160,
          gravity: 520,
        });
    }
    await c.wait(150);
    await c.anim(
      this.sub,
      [
        { transform: 'scale(1.5)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      170,
      'cubic-bezier(.5,0,.75,0)'
    );
    if (this.won) emit('stamp');
    await c.wait(330);
  }

  /* ---------- 2: run tally ---------- */
  private async tally(): Promise<void> {
    const c = this.c;
    // Only the server's own answer is shown: the tally waits for it. It
    // resolves null if the run never banked, never with stand-in numbers.
    this.res = await (this.app.runDone ?? Promise.resolve(null));
    if (this.dead) return;
    this.app.enterEnd();
    void c.anim(this.panel, [{ opacity: 0 }, { opacity: 1 }], 240, 'ease-out');
    void c.anim(this.top, [{ opacity: 0 }, { opacity: 1 }], 200, 'ease-out');
    const res = this.res;
    if (res?.ascended) this.title.textContent = 'ASCENDED';
    this.flavor.textContent = res
      ? (FLAVOR[res.ascended ? 'ascended' : this.reason] ??
        FLAVOR['dead'] ??
        '')
      : FLAVOR['unsaved']!;
    const bs = this.bs;
    const waves = res?.waves ?? bs?.wavesCleared ?? 0;
    const total = res?.waveCount ?? null;
    type Stat = {
      label: string;
      value: number;
      color: string;
      fmt: (v: number) => string;
      ribbon?: boolean;
      icon?: string;
      key?: string;
    };
    const stats: Stat[] = [
      {
        label: 'WAVES CLEARED',
        value: waves,
        color: STAT.waves,
        fmt: (v) =>
          this.won || total == null ? num(v) : num(v) + ' / ' + total,
      },
      {
        label: 'BEST LINK',
        value: res?.chain ?? bs?.maxChain ?? 0,
        color: STAT.link,
        fmt: num,
        ribbon: !!res?.isBestLink,
      },
      {
        label: 'TURNS',
        value: bs?.turnsUsed ?? 0,
        color: STAT.turns,
        fmt: num,
      },
    ];
    // Score and loot are the server's to give: with no answer there is no row,
    // rather than a zero that reads as if the battle paid nothing.
    if (res)
      stats.push(
        { label: 'SCORE', value: res.score, color: STAT.score, fmt: num },
        {
          label: 'HEART PIECES',
          value: res.heartPiecesEarned,
          color: STAT.hearts,
          fmt: (v) => '+' + num(v),
          icon: this.h.heartIcon,
          key: 'hearts',
        },
        {
          label: 'COINS',
          value: res.coinsEarned,
          color: STAT.coins,
          fmt: (v) => '+' + num(v),
          icon: this.h.coinIcon,
          key: 'coins',
        }
      );
    this.statEls = {};
    await c.anim(
      this.card,
      [
        { transform: 'translateY(60%)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      260,
      'cubic-bezier(.2,.9,.3,1.1)'
    );
    let k = 0;
    for (const s of stats) {
      const cell = mk(
        this.grid,
        'position:relative;display:flex;flex-direction:column;gap:4px;opacity:0'
      );
      mk(
        cell,
        'font-size:11px;color:#C9D6EC;letter-spacing:.1em;text-shadow:0 2px 0 #05080F',
        s.label
      );
      const row = mk(
        cell,
        `display:flex;align-items:center;gap:6px;font-family:${FT};font-size:26px;line-height:1;color:${s.color};-webkit-text-stroke:4px #05080F;paint-order:stroke fill;text-shadow:0 3px 0 #05080F;font-variant-numeric:tabular-nums`
      );
      if (s.icon)
        mk(
          row,
          `width:20px;height:20px;flex-shrink:0;background:url("${s.icon}") center/contain no-repeat;image-rendering:pixelated`,
          null,
          { 'data-v-icon': '' }
        );
      const n = mk(row, '', s.fmt(0));
      if (s.key) this.statEls[s.key] = row;
      void c.anim(
        cell,
        [
          { transform: 'translateY(6px)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        160,
        'ease-out'
      );
      let last = -1;
      await c.tween(300, (u) => {
        const v = Math.round(s.value * u);
        n.textContent = s.fmt(v);
        if (v !== last && !c.fast) {
          emit('tick', k * 2 + Math.round(u * 4));
          last = v;
        }
      });
      if (s.ribbon) {
        const rb = mk(
          cell,
          `position:absolute;top:-6px;right:-4px;padding:2px 6px 3px;background:#D8323C;border:2px solid #000000;border-radius:4px 1px 4px 1px;color:#FFFFFF;font-family:${FT};font-size:10px;transform:rotate(6deg)`,
          'NEW BEST'
        );
        void c.anim(
          rb,
          [
            { transform: 'rotate(6deg) scale(1.8)', opacity: 0 },
            { transform: 'rotate(6deg) scale(1)', opacity: 1 },
          ],
          160,
          'cubic-bezier(.5,0,.75,0)'
        );
        emit('stamp');
      }
      k++;
      await c.wait(120);
    }
  }

  /* ---------- 3: loot ---------- */
  private async loot(): Promise<void> {
    const c = this.c,
      res = this.res;
    if (!res) return;
    const fly = (
      amount: number,
      from: HTMLElement | undefined,
      chip: Chip,
      icon: string,
      start: number,
      kind: 'coins' | 'hearts'
    ): Promise<void> =>
      new Promise((done) => {
        const show = (v: number): string =>
          kind === 'coins' ? num(v) : String(v);
        if (!amount) return done();
        const count = Math.max(5, Math.min(12, Math.round(amount / 10)));
        if (c.fast || fx.reduced()) {
          chip.n.textContent = show(start + amount);
          return done();
        }
        let landed = 0;
        const src = from?.querySelector('[data-v-icon]') ?? from;
        fx.flyTo(src, chip.i, {
          icon,
          count,
          stagger: 45,
          size: 16,
          arcHeight: 90,
          duration: 560,
          onArrive: () => {
            landed++;
            chip.n.textContent = show(
              start + Math.round((amount * landed) / count)
            );
            emit('coin_land', landed);
            chip.c.animate(
              [{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
              { duration: 120 }
            );
          },
          onDone: done,
        });
        this.flyFinish = () => (chip.n.textContent = show(start + amount));
      });
    await Promise.all([
      fly(
        res.coinsEarned || 0,
        this.statEls['coins'],
        this.wallet,
        this.h.coinIcon,
        this.before.coins,
        'coins'
      ),
      fly(
        res.heartPiecesEarned || 0,
        this.statEls['hearts'],
        this.heart,
        this.h.heartIcon,
        this.before.hearts,
        'hearts'
      ),
      c.wait(1000),
    ]);
    this.flyFinish?.();
    this.wallet.n.textContent = num(this.before.coins + (res.coinsEarned || 0));
    this.heart.n.textContent = String(
      this.before.hearts + (res.heartPiecesEarned || 0)
    );
  }

  /* ---------- 4: XP, with 5: level-ups inside ---------- */
  private setBar(level: number, xp: number, need: number): void {
    const u = Math.max(0, Math.min(1, xp / Math.max(1, need)));
    this.fill.style.transform = `scaleX(${u.toFixed(4)})`;
    this.edge.style.left = (u * 100).toFixed(2) + '%';
    this.edge.style.opacity = u > 0 ? '1' : '0';
    this.barText.textContent = Math.round(xp) + ' / ' + need + ' XP';
    this.badgeNum.textContent = String(level);
  }
  private setNext(level: number): void {
    const img = this.h.packImg(bookFor(level + 1));
    this.next.style.backgroundImage = img ? `url("${img}")` : 'none';
  }
  private async xp(): Promise<void> {
    const c = this.c,
      X = this.res?.xp;
    if (!X) return;
    let level = X.before.level,
      xp = X.before.xpInLevel,
      need = X.before.xpToNext,
      ups = 0;
    this.setBar(level, xp, need);
    this.setNext(level);
    this.lvBlock.style.visibility = 'visible';
    await c.anim(
      this.lvBlock,
      [
        { transform: 'translateY(10px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      220,
      'ease-out'
    );
    let step = 0;
    for (const line of X.lines) {
      if (this.dead) return;
      const chip = mk(
        this.lines,
        `display:flex;flex-shrink:0;white-space:nowrap;gap:5px;align-items:center;padding:2px 7px 3px;border:1px solid #3A4C74;border-radius:4px;background:rgba(20,29,46,.92);font-family:${FT};font-size:12px;color:#CBD9EC;opacity:0`
      );
      mk(chip, '', line.label);
      mk(chip, 'color:#8FE3FF', '+' + line.amount);
      await c.anim(
        chip,
        [
          { transform: 'scale(1.4)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        150,
        'cubic-bezier(.5,0,.75,0)'
      );
      let left = line.amount;
      while (left > 0 && !this.dead) {
        const take = Math.min(left, need - xp);
        const from = xp,
          lv = level,
          nd = need;
        if (!c.fast && !fx.reduced())
          fx.flyTo(chip, this.edge, {
            icon: orb(),
            count: Math.max(3, Math.min(8, Math.round(take / 8))),
            stagger: 30,
            size: 6,
            arcHeight: 26,
            duration: 300,
            onArrive: () => emit('xp_orb', step++),
          });
        await c.tween(Math.max(220, take * 5), (u) =>
          this.setBar(lv, from + take * u, nd)
        );
        xp += take;
        left -= take;
        const up = X.levelUps[ups];
        if (xp >= need && up) {
          await this.levelUp(up, ups, c.fast || this.skipAll);
          ups++;
          level = up.level;
          xp = 0;
          need = xpToNext(up.level);
          this.setBar(level, xp, need);
          this.setNext(level);
        } else if (xp >= need) break;
      }
      await c.wait(140);
    }
    this.setBar(X.after.level, X.after.xpInLevel, X.after.xpToNext);
    this.setNext(X.after.level);
  }

  /** One level-up: freeze, badge rollover, LEVEL UP banner with rays, the
   *  next-book icon pops off the bar and drops into the tray. Never skipped:
   *  under a skip / tap it plays a compressed ~300ms version. */
  private async levelUp(
    up: LevelUp,
    i: number,
    compressed: boolean
  ): Promise<void> {
    const s = new Ctx(false, compressed ? 0.25 : i > 0 ? 0.6 : 1);
    if (!compressed) fx.hitStop(150);
    await s.wait(150);
    emit('level_up');
    void s.anim(
      this.badge,
      [
        { filter: 'brightness(3)' },
        { filter: 'brightness(3)', offset: 0.3 },
        { filter: 'none' },
      ],
      120,
      'steps(1,end)'
    );
    const old = this.badgeNum,
      nu = mk(this.badgeNumBox, old.style.cssText, String(up.level));
    nu.style.transform = 'translateY(100%)';
    void s
      .anim(
        old,
        [{ transform: 'none' }, { transform: 'translateY(-100%)' }],
        160,
        'ease-in'
      )
      .then(() => old.remove());
    await s.anim(
      nu,
      [{ transform: 'translateY(100%)' }, { transform: 'none' }],
      180
    );
    this.badgeNum = nu;
    // banner + rays behind the badge
    const br = this.badge.getBoundingClientRect(),
      rr = this.root.getBoundingClientRect();
    if (!fx.reduced()) {
      this.rays.style.left = br.left - rr.left + br.width / 2 + 'px';
      this.rays.style.top = br.top - rr.top + br.height / 2 + 'px';
      this.rays.style.width = '180px';
      void s.anim(
        this.rays,
        [{ opacity: 0 }, { opacity: 0.85, offset: 0.25 }, { opacity: 0 }],
        1000,
        'ease-out'
      );
    }
    const ban = fx.wobble('LEVEL UP', { size: 26, color: '#FFF2B0' });
    ban.style.position = 'absolute';
    ban.style.left = '50%';
    ban.style.top = br.top - rr.top - 34 + 'px';
    ban.style.transform = 'translateX(-50%)';
    ban.style.pointerEvents = 'none';
    this.root.appendChild(ban);
    void s
      .anim(
        ban,
        [
          { translate: '0 -30px', opacity: 0 },
          { translate: '0 0', opacity: 1, offset: 0.2 },
          { translate: '0 0', opacity: 1, offset: 0.8 },
          { translate: '0 0', opacity: 0 },
        ],
        1100,
        'ease-out'
      )
      .then(() => ban.remove());
    this.shake(s, 3, 180);
    // the book pops off the end of the bar and drops into the tray
    const img = this.h.packImg(up.book);
    if (this.tray.style.display === 'none') {
      this.tray.style.display = 'flex';
      void s.anim(
        this.tray,
        [
          { transform: 'translateY(8px)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        200,
        'ease-out'
      );
    }
    this.reveal(this.tray, s);
    await s.wait(this.col.scrollHeight > this.col.clientHeight ? 220 : 0);
    const slot = mk(
      this.slots,
      `width:34px;height:40px;background:url("${img}") center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(0 2px 0 rgba(0,0,0,.45));opacity:0`
    );
    const nr = this.next.getBoundingClientRect(),
      sr = slot.getBoundingClientRect();
    const fly = mk(
      this.root,
      `position:absolute;left:${nr.left - rr.left}px;top:${nr.top - rr.top}px;width:${nr.width}px;height:${nr.height}px;background:url("${img}") center/contain no-repeat;image-rendering:pixelated;z-index:2`
    );
    const dx = Math.round(sr.left - nr.left),
      dy = Math.round(sr.top - nr.top);
    await s.anim(
      fly,
      [
        { transform: 'none' },
        {
          transform: 'translate(-10px,-34px) scale(1.7) rotate(0deg)',
          offset: 0.35,
        },
        {
          transform: `translate(${dx * 0.6}px,${dy * 0.4 - 30}px) scale(1.4) rotate(360deg)`,
          offset: 0.7,
        },
        { transform: `translate(${dx}px,${dy}px) scale(1) rotate(360deg)` },
      ],
      700,
      'ease-in-out'
    );
    fly.remove();
    slot.style.opacity = '1';
    void s.anim(
      slot,
      [
        { transform: 'translateY(-6px) scale(1.15,.85)' },
        { transform: 'none' },
      ],
      160,
      'ease-out'
    );
    emit('book_grant');
    this.books.push(up.book);
    await s.wait(120);
  }

  /* ---------- 6: settle ---------- */
  private async settle(): Promise<void> {
    const c = this.c;
    this.skipBtn.style.display = 'none';
    const n = this.books.length;
    const button = (
      label: string,
      [bg, sh, fg]: BtnStyle,
      run: () => void,
      big = false,
      stays = false
    ): HTMLDivElement => {
      const b = mk(
        this.btns,
        `display:flex;align-items:center;justify-content:center;flex:none;height:${big ? 52 : 44}px;border:3px solid #000000;border-radius:8px 2px 8px 2px;background:${bg};box-shadow:${sh};color:${fg};font-family:${FT};font-size:${big ? 21 : 17}px;cursor:pointer;opacity:0`,
        label,
        { 'data-v-btn': '' }
      );
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        b.animate(
          [
            { transform: 'scale(1,1)' },
            { transform: 'scale(1.06,.86)', offset: 0.4 },
            { transform: 'none' },
          ],
          { duration: 140 }
        );
        setTimeout(() => (stays ? run() : this.leave(run)), 90);
      });
      return b;
    };
    const A = this.app,
      list: HTMLDivElement[] = [];
    const openBooks = (): void => this.openBooks();
    const label = n > 1 ? 'OPEN ' + n + ' BOOKS' : 'OPEN BOOK';
    const daily = A.dailyDone;
    if (daily) {
      // A Daily Battle post: the battle ends on its ladder, not the map.
      if (n) list.push(button(label, BTN.primary, openBooks, true, true));
      list.push(
        button('SEE THE LEADERBOARD', n ? BTN.quiet : BTN.primary, daily, !n)
      );
      list.push(button('PLAY AGAIN', BTN.home, () => A.replayDaily()));
    } else if (!this.won) {
      list.push(button('TRY AGAIN', BTN.primary, () => A.retryRun(), true));
      list.push(button('BACK TO THE MAP', BTN.quiet, () => A.goMap()));
      if (n) list.unshift(button(label, BTN.primary, openBooks, true, true));
    } else {
      if (n) list.push(button(label, BTN.primary, openBooks, true, true));
      list.push(
        button(
          'BACK TO THE MAP',
          n ? BTN.quiet : BTN.primary,
          () => A.goMap(),
          !n
        )
      );
      list.push(button('HOME', BTN.home, () => A.goHome()));
    }
    const first = list[0];
    if (n && first)
      first.style.animation = 'glOpenPulse 1.6s ease-in-out 600ms infinite';
    requestAnimationFrame(() => this.reveal(this.btns, c));
    list.forEach(
      (b, i) =>
        void c.anim(
          b,
          [
            { transform: 'translateY(16px)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          220,
          'cubic-bezier(.2,.9,.3,1.2)',
          i * 70
        )
    );
  }

  /** OPEN BOOK: the books open one after another, then the victory screen comes
   *  back with the tray emptied and the map as the way on. */
  private openBooks(): void {
    this.suspended = true;
    this.root.style.display = 'none';
    this.app.afterBooks = () => this.resume();
    this.app.openBooks(this.books, 'victory');
  }
  private resume(): void {
    if (this.dead) return;
    this.app.afterBooks = null;
    this.suspended = false;
    this.books = [];
    this.slots.innerHTML = '';
    this.tray.style.display = 'none';
    this.btns.innerHTML = '';
    this.root.style.display = '';
    this.place();
    this.ctx = new Ctx(false);
    void this.settle();
  }

  private leave(run: () => void): void {
    const R = this.root;
    this.destroy(true);
    run();
    const a = R.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 160,
      fill: 'forwards',
    });
    a.onfinish = () => R.remove();
  }
  destroy(keepRoot = false): void {
    if (this.dead) return;
    this.dead = true;
    this.ctx?.ffwd();
    if (this.placer) clearInterval(this.placer);
    window.removeEventListener('resize', this.onResize);
    if (!keepRoot) this.root.remove();
    if (cur === this) cur = null;
  }
}

/** The location's art behind the fight (the full game's stage, or the post's
 *  wider copy of it) - never the page's sky further up. */
const findStageBg = (): string => {
  const isArt = (n: Element): n is HTMLElement =>
    n instanceof HTMLElement &&
    /Background\/|bg-wide\//.test(n.style.backgroundImage || '');
  let e: Element | null = document.querySelector('[data-juice="monster"]');
  while (e && !isArt(e)) e = e.parentElement;
  const hit =
    e && isArt(e)
      ? e
      : [...document.querySelectorAll('[style*="background-image"]')].find(
          isArt
        );
  return hit
    ? (hit.style.backgroundImage.split(/,(?=\s*url\()/).pop() ?? '').trim()
    : '';
};

/** The kill shatters into the sprite's own colours. */
const sampleColors = (m: HTMLElement): string[] => {
  try {
    const inner = m.querySelector('[data-sprite]') ?? m;
    const u = (/url\("?([^")]+)/.exec(
      getComputedStyle(inner).backgroundImage
    ) ?? [])[1];
    if (!u) return ['#FFFFFF', '#CBD9EC', '#9FB3D1'];
    const img = new Image();
    img.src = u;
    if (!img.complete || !img.naturalWidth)
      return ['#FFFFFF', '#CBD9EC', '#9FB3D1'];
    const fw = img.naturalHeight,
      c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    if (!g) return ['#FFFFFF'];
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, fw, fw, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data,
      n: Record<string, number> = {};
    for (let i = 0; i < d.length; i += 4)
      if ((d[i + 3] ?? 0) > 200) {
        const k =
          '#' +
          [d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('');
        n[k] = (n[k] ?? 0) + 1;
      }
    const top = Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((e) => e[0]);
    return top.length ? top.concat('#FFFFFF') : ['#FFFFFF'];
  } catch {
    return ['#FFFFFF', '#CBD9EC'];
  }
};
