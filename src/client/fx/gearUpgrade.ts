/* Gear level-up as a short scene inside the card-info art:
 *   feed (spare copies and coins fly into the piece) -> charge (shake, rings
 *   closing in, rays spinning up) -> burst (flash, shockwave, light pillar,
 *   LEVEL UP stamp, +power).
 * The charge holds until the server answers, so the burst only ever plays for
 * a level the profile really has. A missing copy or coin gets a reject shake
 * on the button and on what is short instead. */
import * as fx from './fx.js';
import type { FxHelpers } from './fx.js';
import type { FxEvent } from './screens.js';

/** What the scene hands the app's upgrade action. */
export type GearUpFx = {
  /** Resolves once the feed and charge have played their minimum. */
  charged: Promise<void>;
  land: () => void;
  fail: () => void;
};
export type GearUpApp = {
  state: { gearUpgrading: boolean };
  upgradeGear: (id: string, fxh?: GearUpFx) => () => void;
};
export type GearUpInfo = {
  id: string;
  /** Null when the next level can be bought now. */
  block: 'unowned' | 'maxed' | 'copies' | 'coins' | null;
  copies: number;
  color: string;
  fromLevel: number;
  fromPower: number;
  toPower: number;
};

const PIXEL = "VolterTitle,'Yoster Island',Volter,monospace";

const el = (root: ParentNode | null, sel: string): HTMLElement | null => {
  const found = root ? root.querySelector(sel) : null;
  return found instanceof HTMLElement ? found : null;
};
const btnOf = (e: FxEvent): HTMLElement | null =>
  e && e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
const centre = (x: HTMLElement): { x: number; y: number } => {
  const r = x.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const anim = (
  x: Element | null,
  frames: Keyframe[],
  duration: number,
  opts: KeyframeAnimationOptions = {}
): Animation | null =>
  x
    ? fx.track(x.animate(frames, { duration: fx.ms(duration), ...opts }))
    : null;
/** A throwaway element inside the art, removed when its animation ends. */
const spawn = (host: HTMLElement, css: string, text = ''): HTMLElement => {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;pointer-events:none;' + css;
  if (text) d.textContent = text;
  host.appendChild(d);
  return d;
};
const once = (a: Animation | null, d: HTMLElement): void => {
  if (!a) return d.remove();
  a.onfinish = () => d.remove();
  a.oncancel = () => d.remove();
};

const REJECT: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px) rotate(-3deg)', offset: 0.2 },
  { transform: 'translateX(6px) rotate(3deg)', offset: 0.4 },
  { transform: 'translateX(-4px) rotate(-2deg)', offset: 0.6 },
  { transform: 'translateX(4px) rotate(2deg)', offset: 0.8 },
  { transform: 'translateX(0)' },
];
const SQUASH: Keyframe[] = [
  { transform: 'scale(1,1)' },
  { transform: 'scale(1.08,.84)', offset: 0.35 },
  { transform: 'scale(.97,1.04)', offset: 0.7 },
  { transform: 'scale(1,1)' },
];
const FLASH_RED: Keyframe[] = [
  { transform: 'scale(1)', color: '#FF5A5A' },
  { transform: 'scale(1.3)', color: '#FF5A5A', offset: 0.3 },
  { transform: 'scale(1)' },
];

/** Not enough copies or coins: the button and the short line both shake. */
const reject = (btn: HTMLElement | null, short: HTMLElement | null): void => {
  fx.sfx.dull();
  anim(btn, REJECT, 340, { easing: 'ease-in-out' });
  anim(short, FLASH_RED, 560, { easing: 'ease-out' });
};

/** Rays behind the piece spin faster while it charges. */
const spinRays = (art: HTMLElement | null, rate: number): void => {
  const rays = el(art, '.glb-rays');
  if (!rays) return;
  for (const a of rays.getAnimations()) a.playbackRate = rate;
};

/** A ring of light that closes in on the piece, `n` times over. */
const closingRings = (art: HTMLElement, color: string, n: number): void => {
  for (let k = 0; k < n; k++) {
    const r = spawn(
      art,
      `left:50%;top:46%;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;border:3px solid ${color};box-shadow:0 0 14px ${color},inset 0 0 14px ${color};opacity:0`
    );
    once(
      anim(
        r,
        [
          { transform: 'scale(2.3)', opacity: 0 },
          { transform: 'scale(1.4)', opacity: 0.9, offset: 0.4 },
          { transform: 'scale(.2)', opacity: 0 },
        ],
        620,
        { delay: fx.ms(k * 300), easing: 'cubic-bezier(.55,0,.9,.4)' }
      ),
      r
    );
  }
};

const burstScene = (
  art: HTMLElement,
  icon: HTMLElement,
  info: GearUpInfo
): void => {
  const { x, y } = centre(icon);
  const colors = [info.color, '#FFF2B0', '#FFFFFF', '#AEE45D'];
  fx.flash('#FFFFFF', 150, 0.75);
  fx.shake(0.5);
  fx.sfx.thud();
  fx.sfx.fanfare();
  fx.burst(x, y, { colors, count: 70, speed: 430, life: 820 });
  fx.burst(x, y, {
    colors,
    count: 30,
    speed: 180,
    gravity: 260,
    life: 1200,
    delay: 140,
  });

  // The piece itself: white-hot, then a springy settle.
  anim(
    icon,
    [
      { transform: 'scale(1.55)', filter: 'brightness(3.2) saturate(0)' },
      { transform: 'scale(.9)', filter: 'brightness(1.5)', offset: 0.4 },
      { transform: 'scale(1.06)', filter: 'brightness(1.1)', offset: 0.7 },
      { transform: 'scale(1)', filter: 'none' },
    ],
    760,
    { easing: 'ease-out' }
  );

  // Two shockwaves.
  for (let k = 0; k < 2; k++) {
    const w = spawn(
      art,
      `left:50%;top:46%;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;border:${k ? 2 : 4}px solid ${k ? '#FFFFFF' : info.color}`
    );
    once(
      anim(
        w,
        [
          { transform: 'scale(.3)', opacity: 1 },
          { transform: 'scale(3.4)', opacity: 0 },
        ],
        680,
        { delay: fx.ms(k * 130), easing: 'cubic-bezier(.1,.8,.3,1)' }
      ),
      w
    );
  }

  // A pillar of light up through the piece.
  const pillar = spawn(
    art,
    `left:50%;top:0;bottom:0;width:84px;margin-left:-42px;background:linear-gradient(90deg,rgba(255,255,255,0),${info.color}cc 30%,#FFFFFF 50%,${info.color}cc 70%,rgba(255,255,255,0));transform-origin:50% 100%;mix-blend-mode:screen`
  );
  once(
    anim(
      pillar,
      [
        { transform: 'scaleY(0) scaleX(.4)', opacity: 1 },
        { transform: 'scaleY(1) scaleX(1)', opacity: 1, offset: 0.3 },
        { transform: 'scaleY(1) scaleX(.1)', opacity: 0 },
      ],
      900,
      { easing: 'ease-out' }
    ),
    pillar
  );

  // LEVEL UP stamp, then the level step under it.
  const stamp = spawn(
    art,
    `left:50%;top:38%;font-family:${PIXEL};font-size:34px;line-height:1;color:#FFF2B0;-webkit-text-stroke:6px #000000;paint-order:stroke fill;text-shadow:0 4px 0 #141D2E;white-space:nowrap;opacity:0`,
    'LEVEL UP!'
  );
  once(
    anim(
      stamp,
      [
        {
          transform: 'translate(-50%,-50%) rotate(-14deg) scale(2.6)',
          opacity: 0,
        },
        {
          transform: 'translate(-50%,-50%) rotate(-6deg) scale(.94)',
          opacity: 1,
          offset: 0.14,
        },
        {
          transform: 'translate(-50%,-50%) rotate(-6deg) scale(1)',
          opacity: 1,
          offset: 0.2,
        },
        {
          transform: 'translate(-50%,-50%) rotate(-6deg) scale(1)',
          opacity: 1,
          offset: 0.8,
        },
        {
          transform: 'translate(-50%,-110%) rotate(-6deg) scale(1.05)',
          opacity: 0,
        },
      ],
      1700,
      { delay: fx.ms(80), easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'both' }
    ),
    stamp
  );
  const step = spawn(
    art,
    `left:50%;top:60%;padding:3px 9px 4px;background:#141D2E;border:3px solid #000000;border-radius:6px 2px 6px 2px;font-family:${PIXEL};font-size:15px;color:#FFFFFF;white-space:nowrap;opacity:0`,
    'LV ' + info.fromLevel + '  >  LV ' + (info.fromLevel + 1)
  );
  once(
    anim(
      step,
      [
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
        {
          transform: 'translate(-50%,-50%) scale(1.12)',
          opacity: 1,
          offset: 0.16,
        },
        {
          transform: 'translate(-50%,-50%) scale(1)',
          opacity: 1,
          offset: 0.24,
        },
        {
          transform: 'translate(-50%,-50%) scale(1)',
          opacity: 1,
          offset: 0.82,
        },
        { transform: 'translate(-50%,-90%) scale(1)', opacity: 0 },
      ],
      1600,
      { delay: fx.ms(260), easing: 'ease-out', fill: 'both' }
    ),
    step
  );
  const gain = info.toPower - info.fromPower;
  if (gain > 0)
    setTimeout(
      () => fx.floatText(icon, '+' + gain + ' POWER', '#AEE45D', 18),
      fx.ms(420)
    );
};

let busy = false;

/** LEVEL UP pressed. */
export const upgradeGear = (
  app: GearUpApp,
  info: GearUpInfo,
  e: FxEvent,
  h: FxHelpers
): void => {
  const btn = btnOf(e);
  const panel = btn ? btn.closest('.glb-panel') : null;
  if (info.block === 'copies' || info.block === 'coins')
    return reject(
      btn,
      el(
        panel,
        info.block === 'copies' ? '[data-fx-upcopies]' : '[data-fx-upcoins]'
      )
    );
  if (info.block || busy || app.state.gearUpgrading) return;

  const art = el(panel, '[data-fx-upart]');
  const icon = el(panel, '[data-fx-upicon]');
  if (!art || !icon || fx.reduced()) {
    app.upgradeGear(info.id)();
    return;
  }
  busy = true;

  anim(btn, SQUASH, 240, { easing: 'ease-out' });
  fx.sfx.whoosh();

  // Feed: the spare copies, then the coins, arc into the piece.
  fx.flyTo(el(panel, '[data-fx-upcopies]'), icon, {
    icon: h.gearImage(info.id),
    count: Math.max(1, Math.min(6, info.copies)),
    size: 30,
    stagger: 110,
    duration: 520,
    arcHeight: 90,
    onArrive: (k) => {
      fx.sfx.pop(k);
      anim(
        icon,
        [{ transform: 'scale(1.14)' }, { transform: 'scale(1)' }],
        160,
        {
          composite: 'add',
        }
      );
    },
  });
  setTimeout(
    () =>
      fx.flyTo(el(panel, '[data-fx-upcoins]'), icon, {
        icon: h.coinIcon,
        count: 8,
        size: 15,
        stagger: 45,
        arcHeight: 60,
        onArrive: (k) => fx.sfx.tick(k),
      }),
    fx.ms(260)
  );

  // Charge: a shake that tightens, the piece heating up, rings closing in.
  const charge = anim(
    icon,
    [
      { transform: 'translate(0,0)', filter: 'brightness(1)' },
      { transform: 'translate(-1px,1px) rotate(-1deg)', offset: 0.1 },
      { transform: 'translate(1px,-1px) rotate(1deg)', offset: 0.2 },
      { transform: 'translate(-2px,0) rotate(-2deg)', offset: 0.32 },
      { transform: 'translate(2px,1px) rotate(2deg)', offset: 0.44 },
      { transform: 'translate(-3px,-1px) rotate(-3deg)', offset: 0.56 },
      { transform: 'translate(3px,1px) rotate(3deg)', offset: 0.68 },
      { transform: 'translate(-3px,0) rotate(-3deg) scale(1.04)', offset: 0.8 },
      {
        transform: 'translate(3px,-1px) rotate(3deg) scale(1.08)',
        offset: 0.9,
      },
      {
        transform: 'translate(0,-2px) scale(1.12)',
        filter: 'brightness(2.1) drop-shadow(0 0 10px #FFFFFF)',
      },
    ],
    1100,
    { delay: fx.ms(300), easing: 'ease-in', fill: 'forwards', iterations: 1 }
  );
  const glow = anim(
    art,
    [{ filter: 'brightness(1)' }, { filter: 'brightness(1.3) saturate(1.3)' }],
    1100,
    { delay: fx.ms(300), fill: 'forwards' }
  );
  setTimeout(() => {
    spinRays(art, 7);
    closingRings(art, info.color, 3);
  }, fx.ms(300));
  const stopMotes = fx.motes(art, [info.color, '#FFF2B0', '#FFFFFF']);
  // Rising ticks through the charge; they stop climbing if the server is slow.
  let tick = 0;
  const ticker = setInterval(() => {
    if (tick < 16) fx.sfx.tick(tick++);
  }, fx.ms(80));

  const settle = (): void => {
    clearInterval(ticker);
    stopMotes();
    if (charge) charge.cancel();
    if (glow) glow.cancel();
    spinRays(art, 1);
    busy = false;
  };

  app.upgradeGear(info.id, {
    charged: fx.wait(1400),
    land: () => {
      settle();
      burstScene(art, icon, info);
    },
    fail: () => {
      settle();
      anim(icon, REJECT, 360, { easing: 'ease-in-out' });
      fx.sfx.dull();
    },
  })();
};
