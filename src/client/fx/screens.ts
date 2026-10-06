/* Shop and quest juice: buy flights, can't-afford feedback, bundle showers,
 * quest claims (reward burst, coin flight, DONE stamp), Claim All, the Daily
 * Duties pips and bars that fill from where you last saw them. */
import * as fx from './fx.js';
import type { FxHelpers, FxRect } from './fx.js';
import { popBag } from './packStage.js';

/** A quest reward, as the quest board sends it. */
export type FxQuestReward =
  | { kind: 'coins' | 'gems'; amount: number }
  | { kind: 'pack'; packId: string };
/** One quest row, as far as the juice reads it. */
export type FxQuest = {
  id: string;
  progress: number;
  target: number;
  claimable: boolean;
  claimed: boolean;
  reward: FxQuestReward;
};
type QuestTabKey = 'daily' | 'weekly';

/** Hooks the shop / quest actions call back into. Each action returns the
 *  click handler, which is invoked straight away. */
export type BuyPackHooks = { rect: () => FxRect | null; fail: () => void };
export type GainHooks = { gained: (n: number) => void };
export type ClaimHooks = {
  before: () => void;
  after: () => void;
  fail: () => void;
};
/** The app members the shop and quest juice reads and drives. */
export type ScreensApp = {
  state: {
    phase: string;
    quests: {
      daily: readonly FxQuest[];
      weekly: readonly FxQuest[];
    } | null;
    questTab: QuestTabKey;
    questClaiming: string | null;
  };
  buyPack: (id: string, fxh: BuyPackHooks) => () => void;
  buyCoins: (id: string, fxh: GainHooks) => () => void;
  buyGems: (id: string, fxh: GainHooks) => () => void;
  claimQuest: (id: string, fxh: ClaimHooks) => () => void;
};
/** The click that started an action; only its currentTarget is read. */
export type FxEvent = { currentTarget: EventTarget | null } | null | undefined;

const clamp = (v: number, a: number, b: number): number =>
  Math.max(a, Math.min(b, v));
const wallet = (cur: string): HTMLElement | null =>
  fx.visible('[data-fx="' + cur + '"]');
const btnOf = (e: FxEvent): HTMLElement | null =>
  e && e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
const squash = (el: Element | null | undefined): Animation | null | undefined =>
  el &&
  fx.track(
    el.animate(
      [
        { transform: 'scale(1,1)' },
        { transform: 'scale(1.08,.84)', offset: 0.35 },
        { transform: 'scale(.97,1.04)', offset: 0.7 },
        { transform: 'scale(1,1)' },
      ],
      { duration: fx.ms(240), easing: 'ease-out' }
    )
  );
const REJECT: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-5px) rotate(-3deg)', offset: 0.2 },
  { transform: 'translateX(5px) rotate(3deg)', offset: 0.4 },
  { transform: 'translateX(-3px) rotate(-2deg)', offset: 0.6 },
  { transform: 'translateX(3px) rotate(2deg)', offset: 0.8 },
  { transform: 'translateX(0)' },
];
const rowsOf = (app: ScreensApp, tab: QuestTabKey): readonly FxQuest[] =>
  (app.state.quests && app.state.quests[tab]) || [];

/* ---------- shop ---------- */

/** Not enough: the price shakes, the wallet flashes red, a dull thunk. */
export const cantAfford = (btn: Element | null, cur: string): void => {
  fx.sfx.dull();
  if (btn) btn.animate(REJECT, { duration: 320, easing: 'ease-in-out' });
  const w = wallet(cur);
  if (w)
    w.animate(
      [
        { color: '#FF5A5A', transform: 'scale(1.25)' },
        { color: '#FF5A5A', transform: 'scale(1)', offset: 0.5 },
        { transform: 'scale(1)' },
      ],
      { duration: 560, easing: 'ease-out' }
    );
};

let buyPackBusy = false;
/** BUY: squash, coins fly from the wallet into the pack, the pack lifts while
 *  the call runs; success hands its rect to the opening (shared element),
 *  failure drops it back and returns the coins. */
export const buyPack = (
  app: ScreensApp,
  p: { id: string; cur: string },
  e: FxEvent,
  can: boolean,
  h: FxHelpers
): void => {
  const btn = btnOf(e);
  if (!can) return cantAfford(btn, p.cur);
  if (buyPackBusy) return;
  buyPackBusy = true;
  setTimeout(() => (buyPackBusy = false), 900);
  squash(btn);
  const card = btn && btn.closest('[data-fx-pack]');
  const art = card && card.querySelector('[data-fx-packimg]');
  const icon = p.cur === 'gems' ? h.gemIcon : h.coinIcon;
  fx.flyTo(wallet(p.cur), art, {
    icon,
    count: 6,
    stagger: 40,
    size: 16,
    arcHeight: 60,
    onArrive: (k) => fx.sfx.tick(k),
  });
  const lift =
    art &&
    fx.track(
      art.animate(
        [
          { transform: 'none', filter: 'none' },
          { transform: 'translateY(-6px) scale(1.1)', filter: 'brightness(1.3)' },
        ],
        {
          duration: fx.ms(260),
          easing: 'cubic-bezier(.3,1.6,.5,1)',
          fill: 'forwards',
        }
      )
    );
  app.buyPack(p.id, {
    rect: () => (art ? art.getBoundingClientRect() : null),
    fail: () => {
      if (lift) lift.cancel();
      if (art) art.animate(REJECT, { duration: 320 });
      fx.flyTo(art, wallet(p.cur), {
        icon,
        count: 6,
        stagger: 30,
        size: 16,
        arcHeight: 50,
      });
      buyPackBusy = false;
    },
  })();
};

/** Coin bundles: a shower of coins into the wallet as the count rolls up. */
export const buyCoins = (
  app: ScreensApp,
  b: { id: string },
  e: FxEvent,
  can: boolean,
  h: FxHelpers
): void => {
  const btn = btnOf(e);
  if (!can) return cantAfford(btn, 'gems');
  squash(btn);
  app.buyCoins(b.id, {
    gained: (n) => {
      const card = btn && btn.closest('[data-fx-bundle]');
      const from = (card && card.querySelector('[data-fx-stack]')) || card || btn;
      fx.flyTo(from, wallet('coins'), {
        icon: h.coinIcon,
        count: clamp(Math.round(n / 60), 6, 16),
        stagger: 30,
        size: 16,
        arcHeight: 90,
      });
      fx.holdRoll('coins', fx.ms(520));
    },
  })();
};

/** Gem bundles stay calm: after checkout, gems rain into the gem counter. */
export const buyGems = (
  app: ScreensApp,
  b: { id: string },
  e: FxEvent,
  h: FxHelpers
): void => {
  squash(btnOf(e));
  app.buyGems(b.id, {
    gained: (n) => {
      const w = wallet('gems');
      if (!w) return;
      const r = w.getBoundingClientRect(),
        count = clamp(Math.round(n / 10), 6, 16);
      for (let k = 0; k < count; k++)
        fx.flyTo(
          {
            left: r.left - 120 + Math.random() * 220,
            top: -30 - Math.random() * 60,
            width: 8,
            height: 8,
          },
          w,
          {
            icon: h.gemIcon,
            count: 1,
            size: 16,
            arcHeight: 10,
            duration: 600 + k * 45,
          }
        );
      fx.holdRoll('gems', fx.ms(600));
    },
  })();
};

const lists: Record<string, { tab: string | null; gen: number }> = {};
/** Staggered slide-up for list items (shop and bag tabs, like the quest rows);
 *  replays whenever the screen is entered or its tab changes. Pass a falsy
 *  `tab` while the screen is not showing. */
export const listIn = (
  key: string,
  tab: string | false | null | undefined,
  delay: number
): string => {
  const L = lists[key] || (lists[key] = { tab: null, gen: 0 });
  const t = tab || null;
  if (t !== L.tab) {
    L.tab = t;
    if (t) L.gen++;
  }
  if (!t || fx.reduced()) return 'none';
  return (
    'glRowIn' +
    (L.gen % 2 ? 'A' : 'B') +
    ' 320ms cubic-bezier(.2,.9,.3,1) ' +
    Math.min(640, delay) +
    'ms both'
  );
};

/* ---------- quests ---------- */

const SEEN_KEY = 'gl.questSeen';

/** One visit to the quests screen. */
export type QuestVisit = {
  gen: number;
  tab: QuestTabKey;
  tabGen: number;
  seen: Record<string, number>;
  from: Record<string, number>;
  away: string[];
  played: Record<string, boolean>;
  saved: string;
};
type MetaState = {
  shown: number;
  gen: number;
  full: boolean;
  fanfare: boolean;
  popFrom?: number;
};

let visit: QuestVisit | null = null,
  meta: MetaState | null = null,
  questGen = 0;

const readSeen = (): Record<string, number> => {
  const out: Record<string, number> = {};
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
    if (raw && typeof raw === 'object')
      for (const [k, v] of Object.entries(raw))
        if (typeof v === 'number') out[k] = v;
  } catch {
    /* storage blocked */
  }
  return out;
};

/** Per visit to the quests screen: where each bar starts (last seen progress),
 *  which quests finished while away, and the visit / tab generation that keys
 *  the enter animations. Progress is saved as seen on every render. */
export const questSync = (app: ScreensApp): QuestVisit | null => {
  const st = app.state;
  if (st.phase !== 'quests' || !st.quests) {
    visit = null;
    meta = null;
    return null;
  }
  const tab = st.questTab || 'daily';
  if (!visit) {
    const seen = readSeen();
    visit = {
      gen: (questGen = questGen + 1),
      tab,
      tabGen: 0,
      seen,
      from: {},
      away: [],
      played: {},
      saved: '',
    };
  }
  if (visit.tab !== tab) {
    visit.tab = tab;
    visit.tabGen++;
  }
  const all = [...(st.quests.daily || []), ...(st.quests.weekly || [])];
  const map: Record<string, number> = {};
  for (const q of all) {
    if (!(q.id in visit.from)) {
      const prev = visit.seen[q.id];
      visit.from[q.id] = prev == null ? q.progress : Math.min(prev, q.progress);
      if (prev != null && prev < q.target && q.claimable) visit.away.push(q.id);
    }
    map[q.id] = q.progress;
  }
  const s = JSON.stringify(map);
  if (s !== visit.saved) {
    visit.saved = s;
    try {
      localStorage.setItem(SEEN_KEY, s);
    } catch {
      /* storage blocked */
    }
  }
  setTimeout(() => questEffects(app), 0);
  return visit;
};

export type QuestSeg = { bg: string; anim: string };
export type QuestRowFx = {
  rowIn: string;
  segs: QuestSeg[];
  glowAnim: string;
  shineDisplay: string;
  claimAnim: string;
  iconAnim: string;
};

/** Row animation values: slide-up on enter / tab switch, segmented bar that
 *  fills from the last-seen value, claimable glow / shine / bounce / bob. */
export const questRowFx = (
  _app: ScreensApp,
  q: FxQuest,
  k: number,
  fillBg: string
): QuestRowFx => {
  const v: Pick<QuestVisit, 'gen' | 'tabGen' | 'from'> = visit || {
    gen: 1,
    tabGen: 0,
    from: {},
  };
  const segs = q.target <= 12 ? q.target : 10;
  const fill = (p: number): number =>
    Math.floor((Math.min(p, q.target) / Math.max(1, q.target)) * segs + 1e-9);
  const from = fill(v.from[q.id] ?? q.progress),
    to = fill(q.progress);
  const ab = (v.gen + v.tabGen) % 2 ? 'A' : 'B';
  const list: QuestSeg[] = [];
  let n = 0;
  for (let i = 0; i < segs; i++) {
    const fresh = i >= from && i < to;
    list.push({
      bg: i < to ? fillBg : '#141D2E',
      anim: fresh
        ? `glSegPop${ab} 260ms cubic-bezier(.3,1.8,.5,1) ${320 + k * 40 + n++ * 70}ms both`
        : 'none',
    });
  }
  const live = q.claimable && !q.claimed;
  return {
    rowIn: `glRowIn${ab} 320ms cubic-bezier(.2,.9,.3,1) ${k * 40}ms both`,
    segs: list,
    glowAnim: live ? 'glRowGlow 1.4s ease-in-out infinite' : 'none',
    shineDisplay: live ? 'block' : 'none',
    claimAnim: live ? 'glClaimBounce 2s ease-in-out infinite' : 'none',
    iconAnim: live ? 'glIconBob 1.6s ease-in-out infinite' : 'none',
  };
};

export type MetaPip = { bg: string; bd: string; anim: string };
export type MetaPips = {
  metaDisplay: string;
  metaPips: MetaPip[];
  metaLabel: string;
};

/** Daily Duties: four pips at the top of the daily tab; each claim pops one in,
 *  4/4 flashes them and the Duties row gets its own fanfare. */
export const metaPips = (app: ScreensApp): MetaPips => {
  const st = app.state,
    tab = st.questTab || 'daily';
  const q = st.quests && (st.quests.daily || []).find((x) => x.id === 'd_all');
  if (!q || tab !== 'daily')
    return { metaDisplay: 'none', metaPips: [], metaLabel: '' };
  const n = Math.min(q.target, q.progress);
  if (!meta)
    meta = {
      shown: n,
      gen: 0,
      full: n >= q.target && (q.claimable || q.claimed),
      fanfare: false,
    };
  const m = meta;
  if (n > m.shown) {
    m.gen++;
    m.popFrom = m.shown;
    m.shown = n;
  }
  if (n >= q.target && q.claimable && !m.full) {
    m.full = true;
    m.fanfare = true;
  }
  const ab = m.gen % 2 ? 'A' : 'B';
  const pf = m.popFrom ?? n;
  return {
    metaDisplay: 'flex',
    metaLabel: n + '/' + q.target,
    metaPips: Array.from({ length: q.target }, (_, i) => ({
      bg: i < n ? '#FCE270' : '#141D2E',
      bd: i < n ? '#000000' : '#3A4C74',
      anim:
        m.full && q.claimable
          ? 'glPipFlash 520ms ease-in-out 3'
          : i < n && i >= pf
            ? `glPipPop${ab} 320ms cubic-bezier(.3,1.8,.5,1) ${(i - pf) * 80}ms both`
            : 'none',
    })),
  };
};

const questEffects = (app: ScreensApp): void => {
  const v = visit;
  if (!v || app.state.phase !== 'quests') return;
  const tab = app.state.questTab || 'daily';
  const rows = rowsOf(app, tab);
  rows.forEach((q, k) => {
    if (v.played[q.id]) return;
    v.played[q.id] = true;
    const segs = q.target <= 12 ? q.target : 10;
    const fill = (p: number): number =>
      Math.floor((Math.min(p, q.target) / Math.max(1, q.target)) * segs + 1e-9);
    const fresh = fill(q.progress) - fill(v.from[q.id] ?? q.progress);
    for (let i = 0; i < fresh; i++)
      setTimeout(() => fx.sfx.tick(i), fx.ms(320 + k * 40 + i * 70));
    if (v.away.includes(q.id))
      setTimeout(() => complete(q.id), fx.ms(420 + k * 40 + fresh * 70));
  });
  if (meta && meta.fanfare) {
    meta.fanfare = false;
    fx.sfx.fanfare();
    setTimeout(() => complete('d_all'), 200);
  }
};

/** Gold flash + COMPLETE! over a row. */
const complete = (id: string): void => {
  const row = document.querySelector('[data-fx-quest="' + id + '"]');
  if (!row) return;
  fx.track(
    row.animate(
      [
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.8) saturate(1.3)', offset: 0.25 },
        { filter: 'brightness(1)' },
      ],
      { duration: fx.ms(520), easing: 'ease-out' }
    )
  );
  fx.sfx.chime(2);
  const r = row.getBoundingClientRect();
  const w = fx.wobble('COMPLETE!', { size: 22, color: '#FCE270' });
  w.style.position = 'absolute';
  w.style.left = r.left + r.width / 2 + 'px';
  w.style.top = r.top + r.height / 2 + 'px';
  w.style.transform = 'translate(-50%,-50%)';
  fx.sprites().appendChild(w);
  const a = fx.track(
    w.animate([{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], {
      duration: fx.ms(1600),
      fill: 'forwards',
    })
  );
  a.onfinish = () => w.remove();
};

const stampDone = (row: Element): void => {
  const r = row.getBoundingClientRect();
  const s = document.createElement('div');
  s.textContent = 'DONE';
  const x = r.left + r.width * 0.6,
    y = r.top + r.height / 2;
  s.style.cssText = `position:absolute;left:${x}px;top:${y}px;padding:4px 12px 5px;border:3px solid #AEE45D;border-radius:6px 2px 6px 2px;background:rgba(20,29,46,.8);color:#AEE45D;font-family:VolterTitle,'Yoster Island',Volter,monospace;font-size:22px;letter-spacing:.06em`;
  fx.sprites().appendChild(s);
  const T = (sc: number): string =>
    `translate(-50%,-50%) rotate(-8deg) scale(${sc})`;
  const a = fx.track(
    s.animate(
      [
        { transform: T(2), opacity: 0 },
        { transform: T(1), opacity: 1, offset: 0.16 },
        { transform: T(1), opacity: 1, offset: 0.8 },
        { transform: T(1), opacity: 0 },
      ],
      { duration: fx.ms(1150), easing: 'ease-out', fill: 'forwards' }
    )
  );
  a.onfinish = () => s.remove();
  setTimeout(() => {
    fx.sfx.thud();
    fx.burst(x, y + 12, {
      colors: ['#C9B79C', '#8A7A66', '#E6D7BF'],
      count: 12,
      speed: 150,
      gravity: 520,
    });
  }, fx.ms(180));
};

const payout = async (
  row: Element | null,
  r: FxQuestReward,
  h: FxHelpers,
  step: number
): Promise<void> => {
  const icon = row && row.querySelector('[data-fx-reward]');
  if (icon) {
    fx.track(
      icon.animate(
        [
          { transform: 'scale(1)', filter: 'brightness(1)' },
          { transform: 'scale(1.4)', filter: 'brightness(2.2)', offset: 0.3 },
          { transform: 'scale(1)', filter: 'brightness(1)' },
        ],
        { duration: fx.ms(320), easing: 'ease-out' }
      )
    );
    const ir = icon.getBoundingClientRect();
    fx.burst(ir.left + ir.width / 2, ir.top + ir.height / 2, {
      colors: ['#FFF2B0', '#FCE270', '#FFFFFF'],
      count: 10,
      speed: 180,
    });
  }
  await new Promise<void>((res) => {
    if (r.kind === 'pack')
      fx.flyTo(icon || row, fx.visible('[data-fx="bag"]'), {
        icon: h.packImg(r.packId),
        count: 1,
        size: 34,
        arcHeight: 120,
        duration: 640,
        onDone: () => {
          popBag(1);
          res();
        },
      });
    else
      fx.flyTo(icon || row, wallet(r.kind), {
        icon: r.kind === 'gems' ? h.gemIcon : h.coinIcon,
        count: clamp(Math.round((r.amount || 0) / 10), 4, 14),
        stagger: 35,
        size: 16,
        arcHeight: 80,
        onArrive: (k) => fx.sfx.tick(step + k),
        onDone: res,
      });
  });
  if (row) stampDone(row);
};

/** CLAIM: squash + shimmer while the call runs, then the payout. */
export const claimQuest = (
  app: ScreensApp,
  q: FxQuest,
  e: FxEvent,
  h: FxHelpers,
  step = 0
): Promise<void> =>
  new Promise<void>((resolve) => {
    const btn = btnOf(e);
    const row =
      (btn && btn.closest('[data-fx-quest]')) ||
      document.querySelector('[data-fx-quest="' + q.id + '"]');
    const b = btn || (row && row.querySelector('[data-fx-claim]'));
    squash(b);
    const shimmer =
      b &&
      b.animate(
        [
          { filter: 'brightness(1)' },
          { filter: 'brightness(1.35)' },
          { filter: 'brightness(1)' },
        ],
        { duration: 480, iterations: Infinity }
      );
    const r = q.reward;
    app.claimQuest(q.id, {
      before: () => {
        if (r.kind === 'coins' || r.kind === 'gems')
          fx.holdRoll(r.kind, fx.ms(540));
      },
      after: () => {
        if (shimmer) shimmer.cancel();
        void payout(row, r, h, step).then(resolve);
      },
      fail: () => {
        if (shimmer) shimmer.cancel();
        resolve();
      },
    })();
  });

let claimAllBusy = false;
/** CLAIM ALL: one after another, payouts cascading faster (300 -> 120ms) up a
 *  pitch ladder. */
export const claimAll = async (app: ScreensApp, h: FxHelpers): Promise<void> => {
  if (claimAllBusy) return;
  claimAllBusy = true;
  const tab = app.state.questTab || 'daily';
  const ids = rowsOf(app, tab)
    .filter((q) => q.claimable)
    .map((q) => q.id);
  let gap = 300,
    step = 0;
  const jobs: Promise<void>[] = [];
  for (const id of ids) {
    while (app.state.questClaiming) await fx.wait(16);
    const q = rowsOf(app, tab).find((x) => x.id === id);
    if (!q || !q.claimable) continue;
    jobs.push(claimQuest(app, q, null, h, step));
    step += 2;
    await fx.wait(gap);
    gap = Math.max(120, gap - 60);
  }
  await Promise.all(jobs);
  claimAllBusy = false;
};
