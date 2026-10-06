/* Pack opening as a phased, rarity-driven sequence:
 *   enter -> idle -> charge -> burst -> card(s) -> result -> collect.
 * The server rolls the pack before the reveal, so the anticipation is truthful:
 * glow tiers climb only up to the real best rarity and stop there - no fake-outs.
 * Taps: idle starts the charge; during the charge a tap jumps to the burst;
 * any other time a tap collapses what is playing to its end state. */
import * as fx from './fx.js';
import type { FxHelpers, FxRect } from './fx.js';

type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

/** One pulled card, as the app's open-pack state holds it. */
export type StageCard = {
  gear: { id: string; rarity: string; name: string };
  isNew: boolean;
  refund: number;
};
/** The app's open-pack state, as far as the stage reads it. `fromRect` is the
 *  shop card the pack was bought from (shared-element entry), when known. */
export type StageOpen = {
  id: string;
  token: string;
  cards: readonly StageCard[];
  fromRect?: FxRect | null;
};
/** What COLLECT hands the app: `before` runs once the server answers (before
 *  the state swap), `after` once the screen has gone back. */
export type CollectHooks = {
  before: (r?: { profile?: { coins: number } } | null) => void;
  after: () => void;
};
/** The app members the pack stage drives. */
export type PackStageApp = {
  state: {
    phase: string;
    openPack: StageOpen | null;
    profile: { coins: number };
  };
  tearPack: () => void;
  revealNext: () => void;
  revealAll: () => void;
  collectPack: (hooks: CollectHooks) => void;
};

type Esc = {
  charge: number;
  shake: number;
  stop: number;
  parts: number;
  foil?: boolean;
  banner?: boolean;
  rays?: boolean;
};

const ORDER: readonly Rarity[] = ['Common', 'Rare', 'Epic', 'Legendary'];
const OUT: Record<Rarity, string> = {
  Common: '#9FB3D1',
  Rare: '#4F92F0',
  Epic: '#A46BE8',
  Legendary: '#F4B740',
};
const GLOW: Record<Rarity, string> = {
  Common: '#FFFFFF',
  Rare: OUT.Rare,
  Epic: OUT.Epic,
  Legendary: OUT.Legendary,
};
const ESC: Record<Rarity, Esc> = {
  Common: { charge: 500, shake: 0.15, stop: 0, parts: 12 },
  Rare: { charge: 800, shake: 0.25, stop: 60, parts: 24 },
  Epic: { charge: 1100, shake: 0.4, stop: 90, parts: 40, foil: true },
  Legendary: {
    charge: 1500,
    shake: 0.6,
    stop: 140,
    parts: 70,
    foil: true,
    banner: true,
    rays: true,
  },
};
// Pixel-art crack overlays authored on the pack's own 112x132 grid (public/fx/pack-cracks).
const CRACKS = '/fx/pack-cracks/';
const BTN = {
  primary: [
    '#FCE270',
    '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 3px 0 0 rgba(0,0,0,.35)',
  ],
  secondary: [
    '#B5C0FF',
    '0 -4px 0 0 #7E84E6 inset, 0 4px 0 0 #FFF inset, 0 3px 0 0 rgba(0,0,0,.35)',
  ],
} satisfies Record<string, readonly [string, string]>;

const isRarity = (r: string): r is Rarity => r in OUT;
const outOf = (r: string): string => (isRarity(r) ? OUT[r] : OUT.Common);
const tierAt = (i: number): Rarity => ORDER[i] ?? 'Common';

const anim = (
  el: Element | null | undefined,
  frames: Keyframe[],
  dur: number,
  easing = 'ease-out',
  delay = 0
): Promise<void> =>
  new Promise<void>((res) => {
    if (!el || !el.isConnected) return res();
    const a = fx.track(
      el.animate(frames, {
        duration: Math.max(1, fx.ms(dur)),
        delay: fx.ms(delay),
        easing,
        fill: 'forwards',
      })
    );
    a.onfinish = () => res();
    a.oncancel = () => res();
  });
const rank = (r: string): number =>
  Math.max(0, isRarity(r) ? ORDER.indexOf(r) : -1);
const make = (
  parent: Element | null,
  css: string,
  attrs?: Record<string, string> | null,
  text?: string | null
): HTMLDivElement => {
  const e = document.createElement('div');
  e.style.cssText = css;
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k] ?? '');
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
};

let cur: Stage | null = null;
/** Called on every render: starts a stage for a fresh open, tears it down when
 *  the opening screen goes away. `h` carries view helpers from buildView. */
export const syncPackStage = (app: PackStageApp, h: FxHelpers): void => {
  // The stage is DOM-only; a render with no document (tests, SSR) skips it.
  if (typeof document === 'undefined') return;
  const st = app.state,
    op = st.openPack;
  if (st.phase === 'opening' && op) {
    if (!cur || cur.token !== op.token) {
      if (cur) cur.destroy();
      cur = new Stage(app, op, h);
    }
  } else if (cur) {
    const was = cur;
    cur = null;
    was.destroy();
  }
};

type CardEl = {
  c: StageCard;
  wrap: HTMLDivElement;
  host: HTMLDivElement;
  inner: HTMLDivElement;
  flipper: HTMLDivElement;
  front: HTMLDivElement;
  foil: HTMLDivElement | null;
  x: number;
  y: number;
  rot: number;
  w: number;
  h: number;
  done: boolean;
};

/** Every element the stage animates. Built detached in the constructor and
 *  attached to the [data-fx-stage] host once it renders. */
type StageUI = {
  root: HTMLDivElement;
  bg: HTMLDivElement;
  rays: HTMLDivElement;
  wallet: HTMLDivElement;
  walletNum: HTMLDivElement;
  packWrap: HTMLDivElement;
  glow: HTMLDivElement;
  bob: HTMLDivElement;
  tiltHost: HTMLDivElement;
  tiltInner: HTMLDivElement;
  packImg: HTMLDivElement;
  starLayer: HTMLDivElement;
  lipsLayer: HTMLDivElement;
  coreLayer: HTMLDivElement;
  shine: HTMLDivElement;
  cardLayer: HTMLDivElement;
  banner: HTMLDivElement;
  label: HTMLDivElement;
  btns: HTMLDivElement;
  revealAllBtn: HTMLDivElement;
  collectBtn: HTMLDivElement;
};

type StagePhase = 'mount' | 'enter' | 'idle' | 'charge' | 'burst' | 'card' | 'pick' | 'done';

class Stage {
  readonly app: PackStageApp;
  readonly op: StageOpen;
  readonly h: FxHelpers;
  readonly token: string;
  readonly cards: readonly StageCard[];
  readonly best: Rarity;
  readonly esc: Esc;
  readonly pack: { tint?: string; img?: string };
  readonly ui: StageUI;
  phase: StagePhase = 'mount';
  revealed = 0;
  refunded = 0;
  stops: (() => void)[] = [];
  tries = 0;
  cardEls: CardEl[] = [];
  dead = false;
  toBurst = false;
  bannerShown = false;
  collecting = false;
  starPulse: Animation | null = null;

  constructor(app: PackStageApp, op: StageOpen, h: FxHelpers) {
    this.app = app;
    this.op = op;
    this.h = h;
    this.token = op.token;
    this.cards = op.cards;
    this.best = this.cards.reduce<Rarity>(
      (b, c) =>
        rank(c.gear.rarity) > rank(b) && isRarity(c.gear.rarity)
          ? c.gear.rarity
          : b,
      'Common'
    );
    this.esc = ESC[this.best];
    this.pack = h.packById(op.id) || {};
    fx.resetSpeed();
    fx.initTilt();
    this.ui = this.build();
    this.mount();
  }

  mount(): void {
    if (this.dead) return;
    const host = document.querySelector('[data-fx-stage]');
    if (!host) {
      if (this.tries++ < 90) setTimeout(() => this.mount(), 16);
      return;
    }
    this.ui.walletNum.textContent = String(this.app.state.profile.coins);
    host.appendChild(this.ui.root);
    void this.run();
  }

  build(): StageUI {
    const P = this.pack,
      tint = P.tint || '#9FB3D1',
      img = P.img || '';
    const R = make(
      null,
      "position:absolute;inset:0;overflow:hidden;z-index:30;background:#0B1020;font-family:VolterTitle,'Yoster Island',Volter,monospace;-webkit-tap-highlight-color:transparent;user-select:none"
    );
    R.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onTap(e);
    });
    const bg = make(
      R,
      `position:absolute;inset:0;background:radial-gradient(120% 85% at 50% 42%, ${tint}55 0%, #141D2E 55%, #0B1020 100%), #0B1020;opacity:0`
    );
    const rays = make(
      R,
      'position:absolute;left:50%;top:42%;width:190%;aspect-ratio:1/1;transform:translate(-50%,-50%);opacity:0;pointer-events:none;-webkit-mask-image:radial-gradient(closest-side,#000 12%,transparent 100%);mask-image:radial-gradient(closest-side,#000 12%,transparent 100%)'
    );
    make(
      rays,
      `position:absolute;inset:0;background:repeating-conic-gradient(from 0deg, ${tint}88 0deg 7deg, transparent 7deg 22.5deg);animation:glRaysSpin 26s linear infinite`
    );
    const wallet = make(
      R,
      'position:absolute;top:14px;right:14px;display:flex;align-items:center;gap:6px;padding:4px 9px;border:1px solid #213854;border-radius:4px;background:rgba(20,29,46,.9);opacity:0'
    );
    make(
      wallet,
      `width:16px;height:16px;background:url("${this.h.coinIcon}") center/contain no-repeat;image-rendering:pixelated`
    );
    const walletNum = make(
      wallet,
      'font-size:15px;color:#FCE370',
      null,
      String(this.app.state.profile.coins)
    );
    // the pack: glow behind, bob + tilt wrappers, art, shine sweep, tilt specular, cracks
    const packWrap = make(
      R,
      'position:absolute;left:50%;top:42%;width:150px;height:180px;margin:-90px 0 0 -75px;will-change:transform'
    );
    const glow = make(
      packWrap,
      'position:absolute;inset:-55%;border-radius:50%;opacity:0;pointer-events:none'
    );
    const bob = make(
      packWrap,
      'position:absolute;inset:0;animation:glStageBob 2.4s ease-in-out infinite'
    );
    const tiltHost = make(bob, 'position:absolute;inset:-12px', {
      'data-tilt': '',
    });
    const tiltInner = make(
      tiltHost,
      'position:absolute;inset:12px;transform:perspective(600px)',
      { 'data-tilt-inner': '' }
    );
    const mask = `-webkit-mask:url("${img}") center/contain no-repeat;mask:url("${img}") center/contain no-repeat;`;
    const packImg = make(
      tiltInner,
      `position:absolute;inset:0;background:url("${img}") center/contain no-repeat;image-rendering:pixelated`
    );
    const layer = (extra: string): HTMLDivElement =>
      make(
        tiltInner,
        `position:absolute;inset:0;background-position:center;background-size:contain;background-repeat:no-repeat;image-rendering:pixelated;pointer-events:none;opacity:0;${extra}`
      );
    const starLayer = layer(
      `background-image:url("${CRACKS}star_glow.png");transition:opacity 120ms ease-out`
    );
    const lipsLayer = layer('');
    const coreLayer = layer('');
    const shine = make(
      tiltInner,
      `position:absolute;inset:0;${mask}background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.7) 50%,transparent 58%);background-size:260% 100%;animation:glShineSweep 2.5s ease-in-out infinite;pointer-events:none`
    );
    make(
      tiltInner,
      `position:absolute;inset:0;${mask}background:radial-gradient(circle at calc(50% + var(--tilt-x,0) * 45%) calc(45% + var(--tilt-y,0) * 45%), rgba(255,255,255,.45), transparent 55%);opacity:var(--tilt-on,0);pointer-events:none`
    );
    const cardLayer = make(
      R,
      'position:absolute;left:50%;top:42%;width:0;height:0'
    );
    const banner = make(
      R,
      'position:absolute;left:0;right:0;top:9%;display:flex;justify-content:center;pointer-events:none'
    );
    const label = make(
      R,
      'position:absolute;left:0;right:0;bottom:150px;text-align:center;font-size:16px;color:#CBD9EC;opacity:0;pointer-events:none'
    );
    const btns = make(
      R,
      'position:absolute;left:16px;right:16px;bottom:30px;display:flex;flex-direction:column;gap:8px'
    );
    const button = (
      text: string,
      [bgc, sh]: readonly [string, string],
      run: () => void
    ): HTMLDivElement => {
      const b = make(
        btns,
        `display:none;align-items:center;justify-content:center;height:52px;border:3px solid #000000;border-radius:8px 2px 8px 2px;background:${bgc};box-shadow:${sh};color:#000000;font-size:21px;cursor:pointer`,
        { 'data-stage-btn': '' },
        text
      );
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        run();
      });
      return b;
    };
    const revealAllBtn = button('REVEAL ALL', BTN.secondary, () => {
      void this.revealAll();
    });
    const collectBtn = button('COLLECT', BTN.primary, () => {
      void this.collect();
    });
    return {
      root: R,
      bg,
      rays,
      wallet,
      walletNum,
      packWrap,
      glow,
      bob,
      tiltHost,
      tiltInner,
      packImg,
      starLayer,
      lipsLayer,
      coreLayer,
      shine,
      cardLayer,
      banner,
      label,
      btns,
      revealAllBtn,
      collectBtn,
    };
  }

  say(text: string): void {
    this.ui.label.textContent = text;
    void anim(
      this.ui.label,
      [{ opacity: text ? 0 : 1 }, { opacity: text ? 1 : 0 }],
      200
    );
  }

  onTap(e: MouseEvent): void {
    if (e.target instanceof Element && e.target.closest('[data-stage-btn]'))
      return;
    if (this.phase === 'idle') void this.charge();
    else if (this.phase === 'charge') this.toBurst = true;
    else if (this.phase === 'pick') void this.revealNext();
    else if (this.phase !== 'done') fx.skip();
  }

  async run(): Promise<void> {
    await this.enter();
    if (this.dead) return;
    this.phase = 'idle';
    this.say('Tap to open');
  }

  async enter(): Promise<void> {
    const u = this.ui;
    this.phase = 'enter';
    void anim(u.bg, [{ opacity: 0 }, { opacity: 1 }], 280);
    if (!fx.reduced())
      void anim(u.rays, [{ opacity: 0 }, { opacity: 0.22 }], 500);
    const from = this.op.fromRect,
      to = u.packWrap.getBoundingClientRect();
    fx.sfx.whoosh();
    if (from && to.width) {
      // shared element: the pack flies over from the shop card it was bought from
      const dx = from.left + from.width / 2 - (to.left + to.width / 2),
        dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const s = Math.max(0.2, from.height / to.height);
      await anim(
        u.packWrap,
        [
          { transform: `translate(${dx}px,${dy}px) scale(${s})` },
          { transform: 'translate(0,-14px) scale(1.06)', offset: 0.78 },
          { transform: 'none' },
        ],
        560,
        'cubic-bezier(.3,1.1,.4,1)'
      );
    } else {
      await anim(
        u.packWrap,
        [
          {
            transform: 'translateY(-150%)',
            easing: 'cubic-bezier(.55,0,.9,.5)',
          },
          { transform: 'translateY(0) scale(1,1)', offset: 0.68 },
          { transform: 'translateY(0) scale(1.14,.84)', offset: 0.8 },
          { transform: 'translateY(-8px) scale(.96,1.05)', offset: 0.9 },
          { transform: 'none' },
        ],
        520,
        'linear'
      );
    }
    const r = u.packWrap.getBoundingClientRect();
    fx.sfx.thud();
    fx.burst(r.left + r.width / 2, r.bottom - 10, {
      colors: ['#C9B79C', '#8A7A66', '#E6D7BF'],
      count: 14,
      speed: 170,
      gravity: 520,
    });
  }

  setGlow(tier: Rarity, step: number): void {
    const c = GLOW[tier];
    this.ui.glow.style.background = `radial-gradient(closest-side, ${c}, ${c}55 45%, transparent 72%)`;
    void anim(
      this.ui.glow,
      [
        { opacity: 0.35, transform: 'scale(.85)' },
        { opacity: 1, transform: 'scale(1.12)', offset: 0.35 },
        { opacity: 0.7, transform: 'scale(1)' },
      ],
      380
    );
    fx.sfx.chime(step);
  }

  /** One crack stage: core + lips overlays, star glow, a jolt, a crack one
   *  pitch higher, chips from the star; a chime only when the tier climbs. */
  stage(s: number, tier: Rarity, climbed: boolean): void {
    const u = this.ui;
    const n = s + 1,
      col = OUT[tier];
    u.coreLayer.style.backgroundImage = `url("${CRACKS}crack_core_${tier.toLowerCase()}_${n}.png")`;
    u.coreLayer.style.filter = `drop-shadow(0 0 3px ${col}) drop-shadow(0 0 10px ${col})`;
    u.coreLayer.style.opacity = '1';
    if (n >= 2) {
      u.lipsLayer.style.backgroundImage = `url("${CRACKS}crack_lips_${n}.png")`;
      u.lipsLayer.style.opacity = '1';
    }
    u.starLayer.style.opacity = String([0.3, 0.6, 0.9][s] ?? 0.9);
    if (n === 3 && !this.starPulse)
      this.starPulse = fx.track(
        u.starLayer.animate(
          [{ opacity: 0.9 }, { opacity: 1 }, { opacity: 0.85 }, { opacity: 0.9 }],
          { duration: 420, iterations: Infinity, easing: 'ease-in-out' }
        )
      );
    const sign = s % 2 ? 1 : -1;
    fx.track(
      u.bob.animate(
        [
          { transform: 'none' },
          {
            transform: `translate(${sign * 3}px,-2px) rotate(${sign * 2}deg)`,
            offset: 0.4,
          },
          { transform: 'none' },
        ],
        { duration: 80, easing: 'ease-out' }
      )
    );
    fx.sfx.crack(s);
    if (climbed) this.setGlow(tier, rank(tier));
    const r = u.packWrap.getBoundingClientRect();
    fx.burst(r.left + r.width / 2, r.top + r.height * 0.46, {
      colors: [col, '#FFFFFF', '#CBD9EC'],
      count: 6 + s * 3,
      speed: 150,
      life: 360,
    });
  }

  async charge(): Promise<void> {
    this.phase = 'charge';
    this.say('');
    const t = rank(this.best),
      tiers = [tierAt(Math.min(t, 1)), tierAt(Math.min(t, 2)), tierAt(t)];
    const at = [0, 0.4, 0.75, 1],
      t0 = performance.now(),
      total = fx.ms(this.esc.charge);
    const inner = this.ui.tiltInner;
    const jitter = (): void => {
      if (this.dead) return;
      if (this.phase !== 'charge') {
        inner.style.translate = '';
        inner.style.rotate = '';
        return;
      }
      const u = Math.min(1, (performance.now() - t0) / total),
        a = fx.reduced() ? 0 : 0.5 + 2 * u;
      inner.style.translate = `${((Math.random() * 2 - 1) * a).toFixed(1)}px ${((Math.random() * 2 - 1) * a).toFixed(1)}px`;
      inner.style.rotate = `${((Math.random() * 2 - 1) * a * 0.6).toFixed(2)}deg`;
      requestAnimationFrame(jitter);
    };
    requestAnimationFrame(jitter);
    const tierOf = (i: number): Rarity => tiers[i] ?? 'Common';
    const atOf = (i: number): number => at[i] ?? 1;
    for (let s = 0; s < 3 && !this.toBurst && !this.dead; s++) {
      this.stage(s, tierOf(s), s === 0 || tierOf(s) !== tierOf(s - 1));
      await this.until(this.esc.charge * (atOf(s + 1) - atOf(s)));
    }
    if (this.dead) return;
    if (this.toBurst) this.stage(2, tierOf(2), tierOf(2) !== tierOf(1));
    this.phase = 'burst';
    await this.burst();
  }

  until(dur: number): Promise<void> {
    return new Promise<void>((res) => {
      const end = performance.now() + fx.ms(dur);
      const tick = (): void => {
        if (this.toBurst || this.dead || performance.now() >= end) res();
        else setTimeout(tick, 16);
      };
      tick();
    });
  }

  async burst(): Promise<void> {
    const u = this.ui;
    const e = this.esc,
      color = GLOW[this.best],
      img = this.pack.img || '';
    const r = u.packWrap.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    fx.flash('#FFFFFF', 50);
    fx.sfx.tear();
    u.tiltHost.style.visibility = 'hidden';
    for (const side of [-1, 1]) {
      const half = make(
        u.packWrap,
        `position:absolute;inset:0;background:url("${img}") center/contain no-repeat;image-rendering:pixelated;clip-path:${side < 0 ? 'polygon(0 0,53% 0,46% 28%,55% 52%,47% 76%,52% 100%,0 100%)' : 'polygon(53% 0,100% 0,100% 100%,52% 100%,47% 76%,55% 52%,46% 28%)'}`
      );
      void anim(
        half,
        [
          { transform: 'none', opacity: 1 },
          {
            transform: `translate(${side * 150}px,-70px) rotate(${side * 40}deg)`,
            opacity: 0,
          },
        ],
        640,
        'cubic-bezier(.2,.7,.4,1)'
      ).then(() => half.remove());
    }
    const ring = make(
      u.packWrap,
      `position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:4px solid ${color};box-shadow:0 0 18px ${color}`
    );
    void anim(
      ring,
      [
        { transform: 'scale(.2)', opacity: 1 },
        { transform: 'scale(3.4)', opacity: 0 },
      ],
      540
    ).then(() => ring.remove());
    fx.burst(cx, cy, {
      colors: [color, '#FFFFFF', this.pack.tint || color],
      count: e.parts,
      speed: 320,
    });
    fx.hitStop(e.stop);
    fx.shake(e.shake);
    if (!(e.rays && !fx.reduced()))
      void anim(u.rays, [{ opacity: 0.22 }, { opacity: 0 }], 400);
    else void anim(u.rays, [{ opacity: 0.22 }, { opacity: 0.5 }], 300);
    void anim(u.glow, [{ opacity: 1 }, { opacity: 0.35 }], 500);
    this.app.tearPack();
    await fx.wait(60);
    await this.deal();
  }

  makeCard(c: StageCard, i: number, n: number): CardEl {
    const rar = c.gear.rarity,
      col = outOf(rar);
    const w = n > 1 ? 92 : 150,
      h = n > 1 ? 124 : 200;
    const off = i - (n - 1) / 2;
    const x = Math.round(off * w * 0.82),
      y = Math.round(Math.abs(off) * 10),
      rot = +(off * 6).toFixed(1);
    const wrap = make(
      this.ui.cardLayer,
      `position:absolute;left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;opacity:0`
    );
    const host = make(wrap, 'position:absolute;inset:-10px', {
      'data-tilt': '',
    });
    const inner = make(
      host,
      'position:absolute;inset:10px;transform:perspective(600px);transform-style:preserve-3d',
      { 'data-tilt-inner': '' }
    );
    const flipper = make(
      inner,
      'position:absolute;inset:0;transform-style:preserve-3d'
    );
    const face =
      'position:absolute;inset:0;border:3px solid #000000;border-radius:8px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;';
    const back = make(
      flipper,
      face +
        `background:linear-gradient(160deg, ${this.pack.tint || '#9FB3D1'}, #141D2E)`
    );
    make(
      back,
      'position:absolute;inset:6px;border-radius:4px;border:2px solid rgba(255,255,255,.18);background:repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 6px,transparent 6px 12px)'
    );
    make(
      back,
      `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${n > 1 ? 34 : 56}px;color:#FFF2B0;-webkit-text-stroke:5px #0B1020;paint-order:stroke fill`,
      null,
      '?'
    );
    const front = make(
      flipper,
      face +
        `transform:rotateY(180deg);background:#1D2956;box-shadow:inset 0 0 0 3px ${col}`
    );
    make(
      front,
      `position:absolute;left:0;right:0;top:6px;text-align:center;font-size:${n > 1 ? 9 : 12}px;color:${col};-webkit-text-stroke:3px #0B1020;paint-order:stroke fill`,
      null,
      rar.toUpperCase()
    );
    const art = this.h.gearImage(c.gear.id);
    make(
      front,
      `position:absolute;left:14%;right:14%;top:16%;bottom:${n > 1 ? 30 : 26}%;background:url("${this.h.crisp(art)}") center/contain no-repeat;filter:drop-shadow(0 3px 0 rgba(0,0,0,.45))`
    );
    make(
      front,
      `position:absolute;left:0;right:0;bottom:0;min-height:${n > 1 ? 26 : 34}px;display:flex;align-items:center;justify-content:center;padding:2px 6px;background:${col};color:#141212;font-size:${n > 1 ? 9 : 13}px;line-height:1.1;text-align:center`,
      null,
      c.gear.name || ''
    );
    make(
      front,
      `position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at calc(50% + var(--tilt-x,0) * 45%) calc(40% + var(--tilt-y,0) * 45%), rgba(255,255,255,.3), transparent 50%);opacity:var(--tilt-on,0)`
    );
    let foil: HTMLDivElement | null = null;
    if (isRarity(rar) && ESC[rar].foil)
      foil = make(
        front,
        'position:absolute;inset:0;pointer-events:none;opacity:0;mix-blend-mode:color-dodge;background:repeating-linear-gradient(115deg,#ff5f6d 0%,#ffc371 7%,#47f0a3 14%,#4fa8ff 21%,#c86bff 28%,#ff5f6d 35%);background-size:240% 240%;background-position:calc(50% + var(--tilt-x,0) * 70%) calc(50% + var(--tilt-y,0) * 70%)'
      );
    return {
      c,
      wrap,
      host,
      inner,
      flipper,
      front,
      foil,
      x,
      y,
      rot,
      w,
      h,
      done: false,
    };
  }

  async deal(): Promise<void> {
    this.phase = 'card';
    const n = this.cards.length;
    this.cardEls = this.cards.map((c, i) => this.makeCard(c, i, n));
    await Promise.all(
      this.cardEls.map((ce, i) =>
        anim(
          ce.wrap,
          [
            { transform: 'translate(0,30px) scale(.25)', opacity: 0 },
            {
              transform: `translate(${ce.x}px,${ce.y}px) rotate(${ce.rot}deg) scale(1.06)`,
              opacity: 1,
              offset: 0.72,
            },
            {
              transform: `translate(${ce.x}px,${ce.y}px) rotate(${ce.rot}deg) scale(1)`,
              opacity: 1,
            },
          ],
          380,
          'cubic-bezier(.3,1.4,.5,1)',
          i * 70
        )
      )
    );
    if (this.dead) return;
    if (n === 1) {
      await this.reveal(0);
      this.finish();
    } else {
      this.phase = 'pick';
      this.say('Tap to reveal');
      this.ui.revealAllBtn.style.display = 'flex';
    }
  }

  async flip(ce: CardEl): Promise<void> {
    fx.sfx.flip();
    await anim(
      ce.flipper,
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }],
      360,
      'cubic-bezier(.45,0,.2,1)'
    );
    await anim(
      ce.wrap,
      [
        {
          transform: `translate(${ce.x}px,${ce.y}px) rotate(${ce.rot}deg) scale(1.1)`,
        },
        {
          transform: `translate(${ce.x}px,${ce.y}px) rotate(${ce.rot}deg) scale(.97)`,
          offset: 0.6,
        },
        {
          transform: `translate(${ce.x}px,${ce.y}px) rotate(${ce.rot}deg) scale(1)`,
        },
      ],
      160
    );
  }

  async reveal(i: number): Promise<void> {
    const ce = this.cardEls[i];
    if (!ce || ce.done) return;
    ce.done = true;
    this.revealed++;
    await this.flip(ce);
    const c = ce.c,
      rar = c.gear.rarity;
    if (ce.foil) void anim(ce.foil, [{ opacity: 0 }, { opacity: 0.25 }], 300);
    if (rar === 'Legendary') await this.legendary();
    if (c.isNew) await this.stamp(ce);
    else await this.shatter(ce);
  }

  async legendary(): Promise<void> {
    if (this.bannerShown) return;
    this.bannerShown = true;
    const w = fx.wobble('LEGENDARY', { size: 34, color: OUT.Legendary });
    this.ui.banner.appendChild(w);
    fx.sfx.fanfare();
    await anim(
      w,
      [
        { transform: 'scale(3)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      260,
      'cubic-bezier(.2,.9,.3,1.2)'
    );
    fx.hitStop(140);
    fx.shake(0.3);
    this.stops.push(
      fx.motes(() => this.ui.root, [OUT.Legendary, '#FFF2B0'])
    );
  }

  async stamp(ce: CardEl): Promise<void> {
    const s = make(
      ce.front,
      'position:absolute;top:8px;right:-4px;padding:3px 8px 4px;background:#FF4D4D;border:3px solid #000000;border-radius:6px 2px 6px 2px;color:#FFFFFF;font-size:15px;transform:rotate(-12deg)',
      null,
      'NEW!'
    );
    fx.sfx.thud();
    await anim(
      s,
      [
        { transform: 'rotate(-12deg) scale(2.2)', opacity: 0 },
        { transform: 'rotate(-12deg) scale(1)', opacity: 1 },
      ],
      160,
      'cubic-bezier(.5,0,.75,0)'
    );
    fx.flash('#FFFFFF', 17, 0.45);
  }

  async shatter(ce: CardEl): Promise<void> {
    await fx.wait(500);
    if (this.dead) return;
    const u = this.ui;
    const refund = ce.c.refund || 0;
    void anim(
      ce.host,
      [{ filter: 'none' }, { filter: 'grayscale(1) brightness(.8)' }],
      200
    );
    fx.sfx.crack(1);
    await fx.wait(220);
    const r = ce.wrap.getBoundingClientRect();
    fx.burst(r.left + r.width / 2, r.top + r.height / 2, {
      colors: ['#9FB3D1', '#CBD9EC', '#5D6B8A'],
      count: 22,
      speed: 260,
    });
    fx.sfx.crack(3);
    void anim(
      ce.wrap,
      [
        {
          transform: `translate(${ce.x}px,${ce.y}px) rotate(${ce.rot}deg) scale(1)`,
        },
        {
          transform: `translate(${ce.x}px,${ce.y}px) rotate(${ce.rot}deg) scale(.94)`,
        },
      ],
      160
    );
    const tag = make(
      ce.wrap,
      `position:absolute;left:50%;top:46%;padding:3px 8px 4px;background:#3A4C74;border:3px solid #000000;border-radius:6px 2px 6px 2px;color:#FFFFFF;font-size:${ce.w > 100 ? 14 : 10}px;white-space:nowrap;transform:translate(-50%,-50%) rotate(-10deg)`,
      null,
      refund ? 'DUPLICATE +' + refund : 'DUPLICATE'
    );
    fx.sfx.thud();
    void anim(
      tag,
      [
        {
          transform: 'translate(-50%,-50%) rotate(-10deg) scale(1.9)',
          opacity: 0,
        },
        {
          transform: 'translate(-50%,-50%) rotate(-10deg) scale(1)',
          opacity: 1,
        },
      ],
      170,
      'cubic-bezier(.5,0,.75,0)'
    );
    if (!refund) return;
    void anim(u.wallet, [{ opacity: 0 }, { opacity: 1 }], 160);
    const count = Math.max(4, Math.min(14, Math.round(refund / 10)));
    const base = this.app.state.profile.coins + this.refunded;
    this.refunded += refund;
    let step = 0;
    await new Promise<void>((res) => {
      fx.flyTo(r, u.walletNum, {
        icon: this.h.coinIcon,
        count,
        stagger: 35,
        size: 16,
        arcHeight: 70,
        onArrive: () => {
          step++;
          u.walletNum.textContent = String(
            base + Math.round((refund * step) / count)
          );
          fx.sfx.tick(Math.min(14, step));
          void anim(
            u.walletNum,
            [
              { transform: 'scale(1.25)', color: '#AEE45D' },
              { transform: 'scale(1)', color: '#FCE370' },
            ],
            160
          );
        },
        onDone: res,
      });
    });
    u.walletNum.textContent = String(base + refund);
  }

  async revealNext(): Promise<void> {
    const i = this.cardEls.findIndex((c) => !c.done);
    if (i < 0) return;
    this.app.revealNext();
    await this.reveal(i);
    if (this.revealed >= this.cardEls.length) this.finish();
  }

  async revealAll(): Promise<void> {
    this.ui.revealAllBtn.style.display = 'none';
    this.app.revealAll();
    let gap = 120;
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < this.cardEls.length; i++) {
      if (this.cardEls[i]?.done) continue;
      jobs.push(this.reveal(i));
      await fx.wait(gap);
      gap = Math.max(50, gap - 15);
    }
    await Promise.all(jobs);
    this.finish();
  }

  finish(): void {
    if (this.phase === 'done' || this.dead) return;
    this.phase = 'done';
    this.ui.revealAllBtn.style.display = 'none';
    this.say('');
    this.ui.collectBtn.style.display = 'flex';
    void anim(
      this.ui.collectBtn,
      [
        { transform: 'scale(0)' },
        { transform: 'scale(1.08)', offset: 0.7 },
        { transform: 'scale(1)' },
      ],
      260,
      'cubic-bezier(.3,1.6,.5,1)'
    );
  }

  async collect(): Promise<void> {
    if (this.collecting) return;
    this.collecting = true;
    fx.resetSpeed();
    const u = this.ui;
    u.collectBtn.style.pointerEvents = 'none';
    void anim(
      u.collectBtn,
      [
        { transform: 'scale(1,1)' },
        { transform: 'scale(1.06,.86)', offset: 0.4 },
        { transform: 'scale(1,1)' },
      ],
      160
    );
    const bag = fx.visible('[data-fx="bag"]');
    const R = u.root.getBoundingClientRect();
    const target: FxRect = bag
      ? bag.getBoundingClientRect()
      : {
          left: R.left + R.width * 0.8 - 20,
          top: R.bottom - 50,
          width: 40,
          height: 40,
        };
    fx.sfx.whoosh();
    await Promise.all(
      this.cardEls
        .filter((ce) => ce.c.isNew)
        .map((ce, k) => {
          const r = ce.wrap.getBoundingClientRect();
          const dx = target.left + target.width / 2 - (r.left + r.width / 2),
            dy = target.top + target.height / 2 - (r.top + r.height / 2);
          return anim(
            ce.wrap,
            [
              {
                transform: `translate(${ce.x}px,${ce.y}px) rotate(${ce.rot}deg) scale(1)`,
                opacity: 1,
              },
              {
                transform: `translate(${ce.x + dx * 0.4}px,${ce.y + dy * 0.4 - 90}px) rotate(${ce.rot - 20}deg) scale(.55)`,
                opacity: 1,
                offset: 0.45,
              },
              {
                transform: `translate(${ce.x + dx}px,${ce.y + dy}px) rotate(${ce.rot - 40}deg) scale(.12)`,
                opacity: 0.2,
              },
            ],
            520,
            'cubic-bezier(.45,0,.75,.6)',
            k * 60
          );
        })
    );
    const newCount = this.cardEls.filter((ce) => ce.c.isNew).length;
    this.app.collectPack({
      before: (r) =>
        fx.primeRoll(
          'coins',
          r && r.profile
            ? r.profile.coins
            : this.app.state.profile.coins + this.refunded
        ),
      after: () => {
        setTimeout(() => popBag(newCount), 60);
      },
    });
  }

  destroy(): void {
    this.dead = true;
    this.stops.forEach((s) => s());
    this.ui.root.remove();
    fx.resetSpeed();
  }
}

/** Bag bounces and a badge pops when gear or packs land in it. */
export const popBag = (n = 1): void => {
  const bag = fx.visible('[data-fx="bag"]');
  if (!bag) return;
  fx.track(
    bag.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.25,.85)', offset: 0.25 },
        { transform: 'scale(.92,1.1)', offset: 0.55 },
        { transform: 'scale(1)' },
      ],
      { duration: fx.ms(420), easing: 'ease-out' }
    )
  );
  if (!n) return;
  const r = bag.getBoundingClientRect();
  const b = document.createElement('div');
  b.textContent = '+' + n;
  b.style.cssText = `position:absolute;left:${r.right - 14}px;top:${r.top + 2}px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#FF4D4D;border:2px solid #000000;color:#FFFFFF;font-family:VolterTitle,'Yoster Island',Volter,monospace;font-size:12px;display:flex;align-items:center;justify-content:center`;
  fx.sprites().appendChild(b);
  fx.sfx.pop(4);
  const a = fx.track(
    b.animate(
      [
        { transform: 'scale(0)', opacity: 1 },
        { transform: 'scale(1.35)', opacity: 1, offset: 0.25 },
        { transform: 'scale(1)', opacity: 1, offset: 0.4 },
        { transform: 'translateY(-10px) scale(1)', opacity: 0 },
      ],
      { duration: fx.ms(1300), easing: 'ease-out', fill: 'forwards' }
    )
  );
  a.onfinish = () => b.remove();
};
