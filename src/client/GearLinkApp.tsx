/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The app: all state, all behaviour, all animation timing.
 *
 * It stays a class component because the design's flow is built out of chained
 * timers - a link clears, the board settles, the monster winds up, the swing
 * lands - and each beat reads its own `this.tN` handle. Hooks would scatter
 * that across refs without making any of it clearer.
 *
 * The rule that shapes everything else: the CLIENT plays, the SERVER decides.
 * A run records the seed it was dealt and every move made on it, then submits
 * both; the score, the coins and the ladder position all come back from the
 * replay. The wallet is never edited locally.
 */
import { Component } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { showToast } from '@devvit/web/client';
import { OrderResultStatus, purchase } from '@devvit/payments/client';
import {
  DUEL_FTUE_STEPS,
  DUEL_LOSS_TROPHIES,
  DUEL_MATCH_SECONDS,
  DUEL_THINK_MIN,
  DUEL_THINK_SKILL,
  DUEL_THINK_SPREAD,
  DUEL_WIN_TROPHIES,
  DUEL_STACK_MIN_H,
  EFFECT_LABEL,
  FOE_CLEAR_MS,
  FOE_LAND_MS,
  FOE_LINK_MS,
  GEAR,
  GEM_BUNDLES,
  GRID_COLS,
  GRID_ROWS,
  HERO_PERKS,
  MIN_LINK,
  NO_STATUS,
  RARITY_ORDER,
  RIDERS,
  Run,
  SUPER_MIN_LINK,
  areAdjacent,
  bundleById,
  duelBestMove,
  duelStep,
  enemyDisplayForWave,
  fallDistances,
  hasAnyMove,
  isJunk,
  isSuper,
  junkFor,
  magnitudeFor,
  makeDuelSide,
  markMultX100,
  mulberry32,
  foeLoadout,
  orbTypeOf,
  ownedLoadout,
  riderOf,
  scoreOf,
  REFILL_WEIGHT,
} from '../shared/engine/index.js';
import type {
  DuelFoe,
  DuelState,
  Gear,
  HeroClass,
  Mutators,
  RunState,
} from '../shared/engine/index.js';
import type { LeaderboardEntry, Profile } from '../shared/api.js';
import type { PulledCard } from '../shared/engine/economy.js';
import { api } from './api.js';
import {
  FTUE_ARROW_GAP,
  FTUE_DOING,
  FTUE_ORDER,
  FTUE_PHASE_STEP,
  FTUE_TARGET,
  findAttackLink,
  type FtueStep,
} from './ftue.js';
import { buildView } from './view/buildView.js';
import { Screen } from './view/Screen.js';

type Phase =
  | 'splash'
  | 'home'
  | 'hero'
  | 'gear'
  | 'battle'
  | 'end'
  | 'shop'
  | 'inventory'
  | 'opening'
  | 'duelLobby'
  | 'duel';

type Pop = { text: string; color: string; top: string };
type Place = {
  side: 'above' | 'below';
  offset: number;
  hole: { top: number; left: number; w: number; h: number };
};
type OpenState = {
  id: string;
  token: string;
  cards: { gear: Gear; isNew: boolean; refund: number }[];
  shown: number;
  torn: boolean;
  from: 'shop' | 'inventory';
};
type DuelOutcome = { kind: string; won: boolean; delta: number };

export type AppState = {
  ready: boolean;
  fatal: string | null;
  profile: Profile;
  leaderboard: LeaderboardEntry[];

  phase: Phase;
  heroClass: HeroClass;
  tab: 'attack' | 'block' | 'effect';
  picked: string[];
  bs: RunState | null;

  endT: number;
  coinsEarned: number;
  endReason: 'dead' | 'stuck' | 'ended' | null;

  boardW: number;
  boardH: number;
  chain: number[];
  busy: boolean;
  clearing: number[];
  hitWho: 'monster' | 'player' | null;
  drop: { dist: number[]; gen: number; spawn: number | null } | null;
  pops: Pop[];
  arming: number[];
  detonating: number[];
  blasting: number[];
  rejecting: number[];
  kick: boolean;
  slashGen: number;
  hpShown: number | null;
  pHpShown: number | null;
  monPhase: 'dying' | 'empty' | 'spawning' | null;
  dying: { name: string; url: string; bg: string } | null;
  swing: 'attack' | 'heavy' | 'landed' | null;
  lastSwing: { damage: number; blocked: number } | null;
  hoverStatus: string | null;

  ftueStep: FtueStep | null;
  ftuePlace: Place | null;
  ftueSample: { damage: number; killed: boolean };

  preview: { text: string; color: string } | null;
  modal: 'pause' | 'how' | 'board' | null;
  homeMenu: boolean;

  lastGear: string | null;
  peek: string | null;
  cardInfo: string | null;
  shopTab: 'packs' | 'coins' | 'gems';
  invTab: 'packs' | 'gear';
  shopMsg: string | null;
  openPack: OpenState | null;

  duel: DuelState | null;
  duelFoe: DuelFoe | null;
  duelOutcome: DuelOutcome | null;
  duelClock: number;
  duelTurns: number;
  duelLog: string[];
  duelFtue: number | null;
  duelW: number;
  duelH: number;
  duelMini: number;
  duelStacked: boolean;
  duelHit: 'me' | 'foe' | null;
  foeBeat: 'thinking' | 'linking' | 'clearing' | 'landed' | 'idle';
  foeChain: number[];
  foeClearing: number[];
  foeDrop: { dist: number[]; gen: number; spawn: number | null } | null;
  foePops: Pop[];
  foeSaid: string;
  foeJunk: number;
  foeHitFor: number;
};

const EMPTY_PROFILE: Profile = {
  username: '',
  coins: 0,
  gems: 0,
  trophies: 0,
  gear: {},
  packs: {},
  best: null,
  seenFtue: true,
  seenDuelFtue: true,
};

/** The design ships mutators as authoring knobs; this build runs the base rules. */
const MUTATORS: Mutators = {
  swiftEnemy: false,
  noSupers: false,
  brittleBlock: false,
  chainFrenzy: false,
  glassKnight: false,
};

export class GearLinkApp extends Component<Record<string, never>, AppState> {
  /** The run in flight. Holds the RNG, so it is the only thing that can advance
   *  the board - and `moves` is the transcript the server will replay. */
  private run: Run | null = null;
  private moves: number[][] = [];
  private seed = 0;

  private duelRngs: Record<string, () => number> = {};
  private duelStartedAt = 0;

  private t1?: ReturnType<typeof setTimeout>;
  private t2?: ReturnType<typeof setTimeout>;
  private t3?: ReturnType<typeof setTimeout>;
  private t4?: ReturnType<typeof setTimeout>;
  private t5?: ReturnType<typeof setTimeout>;
  private t6?: ReturnType<typeof setTimeout>;
  private shopT?: ReturnType<typeof setTimeout>;
  private roll?: ReturnType<typeof setInterval>;
  private hpRoll?: ReturnType<typeof setInterval>;
  private duelTickT?: ReturnType<typeof setInterval>;
  private duelBot?: ReturnType<typeof setTimeout>;
  private foeT1?: ReturnType<typeof setTimeout>;
  private foeT2?: ReturnType<typeof setTimeout>;
  private foeT3?: ReturnType<typeof setTimeout>;
  private pendingMe = false;

  private wrap: HTMLElement | null = null;
  private foeWrap: HTMLElement | null = null;
  private arena: HTMLElement | null = null;
  private ro: ResizeObserver | null = null;
  private fro: ResizeObserver | null = null;
  private aro: ResizeObserver | null = null;
  private cardObs: ResizeObserver | null = null;
  private trim = 0;
  /** Standing correction to the height budget, in px, learned by trimBoard. */
  private trimPx = 0;
  /** The column height trimPx was learned against; a change invalidates it. */
  private measuredColumnH = 0;
  private prevPhase: Phase | null = null;

  private ftueRoot: HTMLElement | null = null;
  private ftueCard: HTMLElement | null = null;
  private ftueBoardEl: HTMLElement | null = null;
  private ftueEnemyEl: HTMLElement | null = null;
  private ftueTrackEl: HTMLElement | null = null;
  private ftueFightEl: HTMLElement | null = null;
  private ftueHeroEl: HTMLElement | null = null;
  private ftueGearEl: HTMLElement | null = null;
  private ftueSlotsEl: HTMLElement | null = null;

  override state: AppState = {
    ready: false,
    fatal: null,
    profile: EMPTY_PROFILE,
    leaderboard: [],
    phase: 'splash',
    heroClass: 'Hero',
    tab: 'attack',
    picked: [],
    bs: null,
    endT: 1,
    coinsEarned: 0,
    endReason: null,
    boardW: 0,
    boardH: 0,
    chain: [],
    busy: false,
    clearing: [],
    hitWho: null,
    drop: null,
    pops: [],
    arming: [],
    detonating: [],
    blasting: [],
    rejecting: [],
    kick: false,
    slashGen: 0,
    hpShown: null,
    pHpShown: null,
    monPhase: null,
    dying: null,
    swing: null,
    lastSwing: null,
    hoverStatus: null,
    ftueStep: null,
    ftuePlace: null,
    ftueSample: { damage: 0, killed: false },
    preview: null,
    modal: null,
    homeMenu: false,
    lastGear: null,
    peek: null,
    cardInfo: null,
    shopTab: 'packs',
    invTab: 'packs',
    shopMsg: null,
    openPack: null,
    duel: null,
    duelFoe: null,
    duelOutcome: null,
    duelClock: DUEL_MATCH_SECONDS,
    duelTurns: 0,
    duelLog: [],
    duelFtue: null,
    duelW: 0,
    duelH: 0,
    duelMini: 18,
    duelStacked: false,
    duelHit: null,
    foeBeat: 'thinking',
    foeChain: [],
    foeClearing: [],
    foeDrop: null,
    foePops: [],
    foeSaid: '',
    foeJunk: 0,
    foeHitFor: 0,
  };

  override componentDidMount(): void {
    void this.boot();
    window.addEventListener('resize', this.measureFtue);
    window.addEventListener('orientationchange', this.measureFtue);
  }

  override componentDidUpdate(): void {
    const st = this.state;
    if (this.prevPhase !== st.phase) {
      this.prevPhase = st.phase;
      this.syncFtueToPhase();
    }
    // Don't consume the step until a placement actually lands, so a frame that
    // measures before layout settles doesn't leave the card hidden forever.
    if (st.ftueStep && !st.ftuePlace) requestAnimationFrame(this.measureFtue);
  }

  override componentWillUnmount(): void {
    this.clearAllTimers();
    for (const o of [this.ro, this.fro, this.aro, this.cardObs])
      o?.disconnect();
    window.removeEventListener('resize', this.measureFtue);
    window.removeEventListener('orientationchange', this.measureFtue);
  }

  private clearAllTimers(): void {
    for (const t of [
      this.t1,
      this.t2,
      this.t3,
      this.t4,
      this.t5,
      this.t6,
      this.shopT,
      this.duelBot,
      this.foeT1,
      this.foeT2,
      this.foeT3,
    ])
      clearTimeout(t);
    for (const i of [this.roll, this.hpRoll, this.duelTickT]) clearInterval(i);
  }

  private async boot(): Promise<void> {
    try {
      const res = await api.init();
      this.setState({
        ready: true,
        profile: res.profile,
        leaderboard: res.leaderboard,
        picked: ownedLoadout(this.state.heroClass, res.profile.gear),
      });
    } catch (e) {
      this.setState({
        fatal: e instanceof Error ? e.message : 'Could not load your profile.',
      });
    }
  }

  /** Adopt whatever the server now says the wallet is, and surface its note. */
  private adopt = (profile: Profile, message?: string): void => {
    this.setState((s) => ({
      profile,
      shopMsg: message ?? s.shopMsg,
      // A pack opened elsewhere can strand the picker on gear that is no longer
      // owned, so the loadout is repaired against every profile that arrives.
      picked: this.repairPicked(s.picked, s.heroClass, profile),
    }));
    if (message) {
      clearTimeout(this.shopT);
      this.shopT = setTimeout(() => this.setState({ shopMsg: null }), 3200);
    }
  };

  private fail = (e: unknown): void => {
    const msg = e instanceof Error ? e.message : 'Something went wrong.';
    this.setState({ shopMsg: msg });
    try {
      showToast(msg);
    } catch {
      /* a toast is a nicety; the inline message is the real report */
    }
    clearTimeout(this.shopT);
    this.shopT = setTimeout(() => this.setState({ shopMsg: null }), 3200);
  };

  private repairPicked = (
    picked: string[],
    cls: HeroClass,
    profile: Profile
  ): string[] => {
    const bad =
      picked.length !== 5 ||
      picked.some((id) => !((profile.gear[id] ?? 0) > 0));
    return bad ? ownedLoadout(cls, profile.gear) : picked;
  };

  /* ---------- derived ---------- */

  mflags(): Mutators {
    return MUTATORS;
  }
  maxHp(): number {
    return this.run ? this.run.maxHp() : 40;
  }
  perk() {
    return HERO_PERKS[this.state.heroClass] ?? HERO_PERKS.Hero;
  }
  loadout(): Gear[] {
    return this.state.picked
      .map((id) => GEAR.find((g) => g.id === id))
      .filter((g): g is Gear => !!g);
  }
  weights(): number[] {
    return this.loadout().map((o) => REFILL_WEIGHT[o.effect]);
  }
  scoreOf = (bs: RunState): number => scoreOf(bs);

  /** The wave the HUD should describe. Everything routes through the live Run,
   *  so the UI can never disagree with the engine about a wave's stats. */
  enemyAt(_base: unknown, wave: number) {
    return this.run
      ? this.run.enemyForWave(wave)
      : new Run({
          seed: 1,
          heroClass: this.state.heroClass,
          picked: this.state.picked,
        }).enemyForWave(wave);
  }
  blockCapFor = (e: any) => (this.run ? this.run.blockCapFor(e) : 0);
  swingStrength = (e: any, hits: number) =>
    this.run ? this.run.swingStrength(e, hits) : e.strength;
  intentFor = (e: any, meter: number, hits: number) =>
    this.run ? this.run.intentFor(e, meter, hits) : 'charge';

  /* ---------- measurement ---------- */

  boardWrapRef = (el: HTMLElement | null): void => {
    if (this.wrap === el) return;
    this.wrap = el;
    // Re-observe on every NEW node: the duel screen mounts its own wrapper, and
    // a one-shot observer would stay pinned to the gauntlet's element and leave
    // the duel board measured at zero.
    this.ro?.disconnect();
    this.ro = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.measureBoard());
      this.ro.observe(el);
    }
    this.measureBoard();
    if (el) requestAnimationFrame(this.measureBoard);
  };

  measureBoard = (): void => {
    const el = this.wrap;
    if (!el) return;
    if (this.state.phase === 'duel') {
      this.measureDuelBoards();
      return;
    }
    const panel = el.parentElement;
    const column = panel?.parentElement;
    const w = el.clientWidth;
    if (!w || !column || !column.clientHeight) return;
    /* The board panel is sized FROM the board, so its available height must come
       from the column's other children - and from their min-heights, not their
       rendered heights, since the monster stage flexes into whatever the board
       leaves. Measuring rendered heights here would be circular. */
    const px = (v: string) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    let used = 0;
    for (const c of Array.from(column.children)) {
      if (c === panel) continue;
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
    const pcs = getComputedStyle(panel);
    let chrome =
      px(pcs.paddingTop) +
      px(pcs.paddingBottom) +
      px(pcs.rowGap) * Math.max(0, panel.children.length - 1);
    for (const c of Array.from(panel.children))
      if (c !== el) chrome += c.getBoundingClientRect().height;
    /* A correction learned against a different column height is stale - a
       rotation or a resize gets a fresh budget. Otherwise the correction is
       kept, which is what makes this converge: without it, trimBoard shrinks
       the board, the wrapper's resize re-runs this, this recomputes the same
       too-tall number and undoes the trim, and the board pulses forever. */
    if (Math.abs(this.measuredColumnH - column.clientHeight) > 1) {
      this.measuredColumnH = column.clientHeight;
      this.trimPx = 0;
      this.trim = 0;
    }
    const avail = column.clientHeight - used - chrome - this.trimPx;
    // Capped: past this the orbs stop reading better and only strand the stage.
    const cell = Math.max(
      18,
      Math.floor(Math.min((w - 20) / 6, (avail - 16) / 5, 56))
    );
    const bw = cell * 6 + 20;
    const bh = cell * 5 + 16;
    if (
      Math.abs(this.state.boardW - bw) > 1 ||
      Math.abs(this.state.boardH - bh) > 1
    ) {
      this.setState({ boardW: bw, boardH: bh }, () =>
        requestAnimationFrame(this.trimBoard)
      );
    } else {
      requestAnimationFrame(this.trimBoard);
    }
  };

  /* The budget above is a prediction, and a prediction can be wrong by a row.
     This is the ground truth: if the panel actually hangs past the column, book
     the overflow as a standing correction and measure again. The stage is
     flex-shrinkable down to its floor, so shrinking the board is what the stage
     absorbs. The iteration cap is a stop, not the mechanism - the correction
     persisting across measurements is what makes it settle. */
  trimBoard = (): void => {
    const el = this.wrap;
    if (!el || this.state.phase !== 'battle') return;
    const panel = el.parentElement;
    const column = panel?.parentElement;
    if (!column || !panel) return;
    const over = Math.round(
      panel.getBoundingClientRect().bottom -
        column.getBoundingClientRect().bottom
    );
    if (over <= 0 || (this.trim = this.trim + 1) > 4) return;
    this.trimPx += over;
    const cell = Math.max(
      18,
      Math.floor((this.state.boardH - 16) / 5) - Math.ceil(over / 5)
    );
    const bh = cell * 5 + 16;
    if (bh >= this.state.boardH) return;
    this.setState({ boardW: cell * 6 + 20, boardH: bh }, () =>
      requestAnimationFrame(this.trimBoard)
    );
  };

  foeWrapRef = (el: HTMLElement | null): void => {
    if (this.foeWrap === el) return;
    this.foeWrap = el;
    this.fro?.disconnect();
    this.fro = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      this.fro = new ResizeObserver(() => this.measureDuelBoards());
      this.fro.observe(el);
    }
    this.measureDuelBoards();
    if (el) requestAnimationFrame(this.measureDuelBoards);
  };

  /* Whether the duel stacks two EQUAL boards is decided by the arena's own
     height, never by the boards - deciding it from a board size would feed the
     layout back into the measurement that produced it. */
  duelArenaRef = (el: HTMLElement | null): void => {
    if (this.arena === el) return;
    this.arena = el;
    this.aro?.disconnect();
    this.aro = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      this.aro = new ResizeObserver(() => this.measureDuelArena());
      this.aro.observe(el);
    }
    this.measureDuelArena();
  };

  measureDuelArena = (): void => {
    const el = this.arena;
    if (!el) return;
    const h = el.clientHeight;
    if (!h) return;
    const stacked = h >= DUEL_STACK_MIN_H;
    const mini = Math.max(
      14,
      Math.min(22, Math.round(((el.clientWidth || 360) / 6) * 0.3))
    );
    if (this.state.duelStacked !== stacked || this.state.duelMini !== mini)
      this.setState({ duelStacked: stacked, duelMini: mini });
    else this.measureDuelBoards();
  };

  /* Both duel boards read at the SAME size, so a glance at theirs compares
     directly with yours. One shared cell, from whichever region is tighter. */
  measureDuelBoards = (): void => {
    const a = this.wrap;
    if (!a) return;
    const cellOf = (el: HTMLElement) => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return 0;
      return Math.floor(Math.min((w - 12) / GRID_COLS, (h - 8) / GRID_ROWS));
    };
    const ca = cellOf(a);
    if (ca <= 0) return;
    const b = this.state.duelStacked ? this.foeWrap : null;
    const cb = b ? cellOf(b) : 0;
    const cell = cb > 0 ? Math.min(ca, cb) : ca;
    const bw = cell * GRID_COLS + 12;
    const bh = cell * GRID_ROWS + 8;
    if (
      Math.abs(this.state.duelW - bw) > 1 ||
      Math.abs(this.state.duelH - bh) > 1
    )
      this.setState({ duelW: bw, duelH: bh });
  };

  /* Count-up for the end panel's numbers. Defaults to 1 so a panel opened
     without a roll still shows the real value. */
  rollUp = (v: number): number => Math.round(v * (this.state.endT ?? 1));

  runEndRoll(): void {
    clearInterval(this.roll);
    this.setState({ endT: 0 });
    const t0 = Date.now();
    this.roll = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 700);
      this.setState({ endT: p });
      if (p >= 1) clearInterval(this.roll);
    }, 40);
  }

  /** Roll the HP figure toward its new value instead of snapping, so a hit
   *  reads as damage taken rather than a number swap. */
  rollHp(to: number): void {
    clearInterval(this.hpRoll);
    const from = this.state.hpShown ?? to;
    if (from === to) {
      this.setState({ hpShown: to });
      return;
    }
    const t0 = Date.now();
    this.hpRoll = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 420);
      this.setState({ hpShown: Math.round(from + (to - from) * p) });
      if (p >= 1) clearInterval(this.hpRoll);
    }, 30);
  }

  /* ---------- navigation ---------- */

  goStep = (p: Phase) => (): void => {
    const profile = this.state.profile;
    this.setState((s) => {
      const picked =
        p === 'hero' || p === 'gear'
          ? this.repairPicked(s.picked, s.heroClass, profile)
          : s.picked;
      // Entering the gear step with gear already on: point the readout at the
      // first equipped piece, so the slots panel is never blank on arrival.
      const keep = !!s.lastGear && picked.indexOf(s.lastGear) >= 0;
      const lastGear =
        p === 'gear' && !keep
          ? (picked.filter(Boolean)[0] ?? null)
          : s.lastGear;
      return {
        phase: p,
        homeMenu: false,
        picked,
        lastGear,
        peek: p === 'gear' && !keep ? null : s.peek,
      };
    });
  };

  goLoadout = (): void => this.setState({ phase: 'home' });
  goHome = this.goStep('home');
  openPause = (): void => this.setState({ modal: 'pause' });
  resume = (): void => this.setState({ modal: null });
  openBoard = (): void => this.setState({ modal: 'board' });
  openHow = (): void => this.setState({ modal: 'how' });
  toggleHomeMenu = (): void =>
    this.setState((s) => ({ homeMenu: !s.homeMenu }));
  openBoardFromMenu = (): void =>
    this.setState({ modal: 'board', homeMenu: false });
  openHowFromMenu = (): void =>
    this.setState({ modal: 'how', homeMenu: false });
  closeModal = (): void => this.setState({ modal: null });
  stop = (e: { stopPropagation: () => void }): void => e.stopPropagation();

  /* ---------- loadout ---------- */

  /** Switching hero rebuilds the loadout: you fight with your own class's kit,
   *  so another class's gear can never ride along. */
  pickHero = (c: HeroClass) => (): void =>
    this.setState((s) => ({
      heroClass: c,
      picked: ownedLoadout(c, s.profile.gear),
      tab: 'attack',
      lastGear: null,
      peek: null,
    }));

  pickTab = (t: 'attack' | 'block' | 'effect') => (): void =>
    this.setState({ tab: t });

  toggleGear = (id: string) => (): void => {
    this.setState((s) => {
      const picked = s.picked.slice();
      const i = picked.indexOf(id);
      // Equipping hands the piece to the slots readout and dismisses the preview.
      if (i >= 0) {
        picked.splice(i, 1);
        return { lastGear: id, peek: null, picked };
      }
      if (picked.length >= 5)
        return { lastGear: id, peek: null, picked: s.picked };
      const g = GEAR.find((x) => x.id === id);
      if (!g) return { lastGear: id, peek: null, picked: s.picked };
      const sameEffect = picked
        .map((p) => GEAR.find((x) => x.id === p))
        .filter((x) => x && x.effect === g.effect).length;
      if (sameEffect >= 2)
        return { lastGear: id, peek: null, picked: s.picked };
      picked.push(id);
      return { lastGear: id, peek: null, picked };
    });
  };

  selectGear =
    (id: string) =>
    (e?: { stopPropagation?: () => void }): void => {
      e?.stopPropagation?.();
      this.setState({ lastGear: id, peek: null });
    };
  clearSlot =
    (id: string) =>
    (e?: { stopPropagation?: () => void }): void => {
      e?.stopPropagation?.();
      this.toggleGear(id)();
    };
  /** Step through the equipped slots, so reading each piece is arrow-key cheap. */
  pageSlot =
    (dir: number) =>
    (e?: { stopPropagation?: () => void }): void => {
      e?.stopPropagation?.();
      const picked = this.state.picked.filter(Boolean);
      if (!picked.length) return;
      const at = picked.indexOf(this.state.lastGear ?? '');
      const next =
        at < 0
          ? dir > 0
            ? 0
            : picked.length - 1
          : (at + dir + picked.length) % picked.length;
      this.setState({ lastGear: picked[next]! });
    };
  /** Preview of gear that is NOT equipped - floats, so it never disturbs the
   *  equipped readout or the slots pager. */
  inspectGear =
    (id: string) =>
    (e?: { stopPropagation?: () => void }): void => {
      e?.stopPropagation?.();
      this.setState((s) =>
        s.picked.indexOf(id) >= 0
          ? { lastGear: id, peek: null }
          : { lastGear: s.lastGear, peek: s.peek === id ? null : id }
      );
    };

  closePeek = (): void => this.setState({ peek: null });

  hoverStatus = (k: string | null) => (): void => {
    if (this.state.hoverStatus !== k) this.setState({ hoverStatus: k });
  };
  toggleStatusTip = (k: string) => (): void =>
    this.setState((s) => ({ hoverStatus: s.hoverStatus === k ? null : k }));
  intentEnter = (): void => this.hoverStatus('intent')();
  intentLeave = (): void => this.hoverStatus(null)();
  intentTap = (): void => this.toggleStatusTip('intent')();

  /* ---------- the run ---------- */

  startRun = (): void => {
    if (this.state.picked.length !== 5) return;
    // The seed is the run's whole identity: it is what the server replays, so it
    // is drawn once here and never regenerated.
    this.seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
    this.run = new Run({
      seed: this.seed,
      heroClass: this.state.heroClass,
      picked: this.state.picked,
      mutators: MUTATORS,
    });
    this.moves = [];
    const bs = this.run.start();
    this.setState({
      phase: 'battle',
      bs,
      chain: [],
      busy: false,
      clearing: [],
      preview: null,
      endReason: null,
      hitWho: null,
      drop: null,
      pops: [],
      arming: [],
      detonating: [],
      blasting: [],
      rejecting: [],
      kick: false,
      slashGen: 0,
      hpShown: null,
      pHpShown: null,
      monPhase: null,
      dying: null,
      swing: null,
      coinsEarned: 0,
      ftueStep: this.state.profile.seenFtue ? null : 'orbs',
      ftuePlace: null,
      ftueSample: { damage: 0, killed: false },
    });
  };

  quitRun = (): void => {
    if (!this.state.bs) return;
    this.setState({
      phase: 'end',
      endReason: 'ended',
      busy: false,
      modal: null,
    });
    this.runEndRoll();
    void this.submitRun(this.state.bs);
  };

  /**
   * Hand the run to the server. The transcript is what is sent - the score that
   * comes back is the server's, computed by replaying these same moves through
   * the same engine, and that is what the ladder and the wallet record.
   */
  private async submitRun(bs: RunState): Promise<void> {
    if (!this.run || !this.moves.length) {
      this.setState({ coinsEarned: 0 });
      return;
    }
    const moves = this.moves;
    this.moves = [];
    try {
      const res = await api.submitRun({
        seed: this.seed,
        heroClass: this.state.heroClass,
        picked: this.state.picked,
        moves,
      });
      this.setState({
        profile: res.profile,
        leaderboard: res.leaderboard,
        coinsEarned: res.coinsEarned,
      });
    } catch (e) {
      // The run is over on screen either way; say plainly that it did not bank.
      this.setState({ coinsEarned: 0 });
      this.fail(e);
      void bs;
    }
  }

  /* ---------- input ---------- */

  private cellFromEvent(e: ReactPointerEvent): number | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const host = el?.closest?.('[data-cell]');
    return host ? Number(host.getAttribute('data-cell')) : null;
  }

  /** The board the player is currently dragging on - gauntlet wave or duel side.
   *  Every input handler goes through this so one gesture serves both modes. */
  private liveBoard(): number[] | null {
    if (this.state.phase === 'duel') return this.state.duel?.me.board ?? null;
    return this.state.bs?.board ?? null;
  }
  private liveLoadout(): Gear[] {
    if (this.state.phase === 'duel' && this.state.duel)
      return this.state.duel.me.loadout;
    return this.loadout();
  }
  private boardIsLive(): boolean {
    const st = this.state;
    if (st.phase === 'duel')
      return !!st.duel && !st.duelOutcome && !st.busy && !this.duelFtuePaused();
    return st.phase === 'battle';
  }

  onDown = (e: ReactPointerEvent): void => {
    if (this.state.busy || !this.boardIsLive()) return;
    if (this.ftueBlocksBoard()) return;
    const board = this.liveBoard();
    if (!board) return;
    const i = this.cellFromEvent(e);
    if (i === null || isJunk(board[i]!)) return;
    // On the drag step only the demonstrated colour is live, so the taught
    // gesture cannot be practised on the wrong orb.
    if (this.state.ftueStep === 'drag') {
      const orb = this.loadout()[orbTypeOf(board[i]!)];
      if (!orb || orb.effect !== 'attack') return;
    }
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is an optimisation; the move handler still hit-tests by point */
    }
    this.setState({ chain: [i], preview: this.previewFor([i]) });
  };

  onMove = (e: ReactPointerEvent): void => {
    const { chain, busy } = this.state;
    if (busy || chain.length === 0) return;
    const i = this.cellFromEvent(e);
    if (i === null) return;
    const last = chain[chain.length - 1]!;
    if (i === last) return;
    // Dragging back over the previous cell un-picks the head, so a misdrawn
    // link is corrected without lifting off.
    if (chain.length >= 2 && i === chain[chain.length - 2]) {
      const next = chain.slice(0, -1);
      this.setState({ chain: next, preview: this.previewFor(next) });
      return;
    }
    if (chain.includes(i) || !areAdjacent(last, i)) return;
    const board = this.liveBoard();
    if (!board || isJunk(board[i]!)) return;
    if (orbTypeOf(board[i]!) !== orbTypeOf(board[chain[0]!]!)) return;
    const next = chain.concat([i]);
    this.setState({ chain: next, preview: this.previewFor(next) });
  };

  onCancel = (): void => this.setState({ chain: [], preview: null });

  onUp = (): void => {
    const chain = this.state.chain;
    const board = this.liveBoard();
    if (chain.length === 0 || !board) return;
    const fire = (move: number[]) => {
      if (this.state.phase === 'duel') this.resolveDuel('me', move);
      else this.resolve(move);
    };
    if (
      chain.length === 1 &&
      board[chain[0]!] != null &&
      isSuper(board[chain[0]!]!)
    ) {
      fire(chain.slice());
      return;
    }
    if (chain.length < MIN_LINK) {
      this.setState({ rejecting: chain.slice(), chain: [], preview: null });
      clearTimeout(this.t3);
      this.t3 = setTimeout(() => this.setState({ rejecting: [] }), 300);
      return;
    }
    fire(chain.slice());
  };

  /** What this link will land, buffs and Mark included - the number the player
   *  is about to commit to, not the raw payout. */
  previewFor(chain: number[]): { text: string; color: string } | null {
    const duelling = this.state.phase === 'duel';
    const board = this.liveBoard();
    if (!board) return null;
    const sx = duelling
      ? { ...NO_STATUS, ...this.state.duel!.me.stx }
      : { ...NO_STATUS, ...(this.state.bs?.stx ?? {}) };
    const foeSx = duelling ? { ...NO_STATUS, ...this.state.duel!.foe.stx } : sx;
    if (chain.length === 1 && isSuper(board[chain[0]!]!))
      return { text: 'RELEASE TO DETONATE', color: '#FFC24B' };
    const orb = this.liveLoadout()[orbTypeOf(board[chain[0]!]!)];
    if (!orb) return null;
    if (chain.length < MIN_LINK)
      return {
        text: 'LINK ' + chain.length + ' / ' + MIN_LINK,
        color: '#9DB4D4',
      };
    const perk = duelling
      ? (HERO_PERKS[this.state.duel!.me.cls] ?? HERO_PERKS.Hero)
      : this.perk();
    const raw = magnitudeFor(orb.power, chain.length, MUTATORS);
    const x =
      orb.effect === 'attack'
        ? perk.attackX100
        : orb.effect === 'block'
          ? perk.blockX100
          : perk.healX100;
    let val = Math.max(1, Math.floor((raw * x) / 100));
    if (orb.effect === 'attack' && sx.strength > 0) val += sx.strength;
    if (orb.effect === 'block' && sx.grit > 0) val += sx.grit;
    let mark = '';
    if (orb.effect === 'attack' && foeSx.mark > 0) {
      val = Math.ceil((val * markMultX100(foeSx.mark)) / 100);
      mark = ' MARKED';
    }
    const bomb = chain.length >= SUPER_MIN_LINK ? '  +BOMB' : '';
    const rd = riderOf(orb.id);
    let rider = '';
    if (rd) {
      const R = RIDERS[rd.r]!;
      rider =
        chain.length >= rd.at
          ? '  +' + R.label + ' ' + rd.v
          : '  ' + R.label + ' in ' + (rd.at - chain.length);
    }
    // Junk is the duel's whole second axis, so the preview must price it.
    let junk = '';
    if (duelling) {
      const n = sx.frost > 0 ? 0 : junkFor(chain.length);
      junk =
        n > 0
          ? '  +' + n + ' JUNK'
          : chain.length < 5
            ? '  JUNK in ' + (5 - chain.length)
            : '';
    }
    return {
      text:
        EFFECT_LABEL[orb.effect] +
        ' ' +
        val +
        '  from ' +
        chain.length +
        ' orbs' +
        mark +
        bomb +
        rider +
        junk,
      color:
        orb.effect === 'attack'
          ? '#E75757'
          : orb.effect === 'block'
            ? '#4F92F0'
            : '#3FAF6E',
    };
  }

  /* ---------- resolving a turn ---------- */

  resolve(move: number[]): void {
    if (!this.run || !this.state.bs) return;
    const out = this.run.step(this.state.bs, move);
    if (!out) {
      this.setState({ rejecting: move.slice(), chain: [], preview: null });
      clearTimeout(this.t3);
      this.t3 = setTimeout(() => this.setState({ rejecting: [] }), 300);
      return;
    }
    // Recorded only once the engine has accepted it, so the transcript and the
    // board can never drift apart.
    this.moves.push(move.slice());

    const isBlast = out.detonators.length > 0;
    // The drag step is completed by DOING it: record what the taught link
    // actually dealt, then move to the step that points at the HP bar.
    if (this.state.ftueStep === 'drag') {
      this.setState({
        ftueSample: { damage: out.attackDealt, killed: out.waveCleared },
      });
      this.t6 = setTimeout(this.advanceFtue, 900);
    }
    const prevWave = this.state.bs.wave;
    const prevMon = enemyDisplayForWave(prevWave);

    const land = () => {
      const pops: Pop[] = [];
      if (out.attackDealt > 0)
        pops.push({ text: '-' + out.attackDealt, color: '#F08686', top: '4%' });
      if (out.burnDealt > 0)
        pops.push({
          text: '-' + out.burnDealt,
          color: RIDERS['burn']!.color,
          top: '16%',
        });
      if (out.blockGained > 0)
        pops.push({
          text: '+' + out.blockGained,
          color: '#89BCFF',
          top: '30%',
        });
      if (out.healed > 0)
        pops.push({ text: '+' + out.healed, color: '#C5F47D', top: '30%' });
      const lastStage = out.stages.length
        ? out.stages[out.stages.length - 1]!
        : null;
      const allCleared = lastStage ? lastStage.cleared : out.cleared;
      const struck = out.attackDealt > 0 || out.burnDealt > 0;
      if (out.waveCleared) {
        clearInterval(this.hpRoll);
        this.setState({ hpShown: 0 });
      } else this.rollHp(Math.max(0, out.bs.enemyHp));

      this.setState((s) => ({
        bs: out.bs,
        clearing: [],
        detonating: [],
        blasting: [],
        arming: [],
        slashGen: struck ? s.slashGen + 1 : s.slashGen,
        monPhase: out.waveCleared ? 'dying' : s.monPhase,
        dying: out.waveCleared ? prevMon : s.dying,
        drop: {
          dist: fallDistances(allCleared),
          gen: (s.drop ? s.drop.gen : 0) + 1,
          spawn: out.superAfter,
        },
        kick: isBlast,
        pops,
        // The swing is its own beat, so the player's HP readout is held at its
        // pre-swing value until that beat actually plays.
        pHpShown: out.enemyAttacked ? out.bs.playerHp + out.enemyDamage : null,
        hitWho: out.attackDealt > 0 ? 'monster' : null,
      }));

      const tail = () => {
        const stuck = !out.over && !hasAnyMove(out.bs.board);
        if (out.over || stuck) {
          this.setState({
            phase: 'end',
            endReason: out.over ? 'dead' : 'stuck',
            busy: false,
            hitWho: null,
            pops: [],
            drop: null,
            kick: false,
            monPhase: null,
            dying: null,
            swing: null,
            pHpShown: null,
          });
          this.runEndRoll();
          void this.submitRun(out.bs);
        } else if (out.waveCleared) {
          // The kill lands, the fallen enemy plays out, the stage sits empty a
          // beat, then the next one walks in.
          this.setState({ pops: [], drop: null, kick: false });
          clearTimeout(this.t5);
          this.t5 = setTimeout(() => {
            this.setState({ monPhase: 'empty', dying: null });
            this.t5 = setTimeout(() => {
              this.setState({ monPhase: 'spawning' });
              this.rollHp(this.enemyAt(null, out.bs.wave).hp);
              this.t5 = setTimeout(
                () =>
                  this.setState({ monPhase: null, busy: false, hitWho: null }),
                460
              );
            }, 260);
          }, 240);
        } else {
          this.setState({
            busy: false,
            hitWho: null,
            pops: [],
            drop: null,
            kick: false,
            swing: null,
            pHpShown: null,
          });
        }
      };

      clearTimeout(this.t2);
      this.t2 = setTimeout(() => {
        /* The monster's turn is a SEPARATE, announced beat: wind-up, then the
           hit. Resolving it inside the player's payout made the swing invisible
           - the HP just dropped with everything else. */
        if (!out.enemyAttacked) {
          tail();
          return;
        }
        this.setState({
          pops: [],
          drop: null,
          kick: false,
          swing: out.enemyHeavy ? 'heavy' : 'attack',
        });
        clearTimeout(this.t6);
        this.t6 = setTimeout(() => {
          const hit: Pop[] =
            out.enemyDamage > 0
              ? [{ text: '-' + out.enemyDamage, color: '#FF9EA1', top: '58%' }]
              : [{ text: 'BLOCKED', color: '#89BCFF', top: '58%' }];
          this.setState({
            hitWho: 'player',
            pops: hit,
            pHpShown: null,
            swing: 'landed',
            lastSwing: { damage: out.enemyDamage, blocked: out.enemyBlocked },
          });
          clearTimeout(this.t6);
          this.t6 = setTimeout(tail, 560);
        }, 620);
      }, 520);
    };

    clearTimeout(this.t1);
    if (isBlast) {
      /* Play the cascade STAGE BY STAGE. Each stage arms its detonators, blows
         them, then drops the survivors, so a blast that catches another bomb
         reads as a chain instead of resolving invisibly in one frame. The board
         shown between beats is that stage's recorded board; out.bs is applied
         once at the end, so the engine stays the single source of truth. */
      const stages = out.stages.length
        ? out.stages
        : [
            {
              detonators: out.detonators,
              blasted: out.blasted,
              cleared: out.cleared,
              before: [],
              after: [],
            },
          ];
      const playStage = (n: number) => {
        if (n >= stages.length) {
          land();
          return;
        }
        const stg = stages[n]!;
        this.setState({
          busy: true,
          arming: stg.detonators,
          blasting: [],
          detonating: [],
          clearing: n === 0 ? out.cleared : [],
          chain: [],
          preview: null,
        });
        this.t1 = setTimeout(() => {
          this.setState({
            arming: [],
            detonating: stg.detonators,
            blasting: stg.blasted,
            clearing: [],
          });
          clearTimeout(this.t4);
          this.t4 = setTimeout(() => {
            const last = n === stages.length - 1;
            if (last || !stg.after.length) {
              playStage(n + 1);
              return;
            }
            // Settle this stage's collapse before the next bomb arms.
            this.setState((s) => ({
              bs: s.bs ? { ...s.bs, board: stg.after } : s.bs,
              arming: [],
              detonating: [],
              blasting: [],
              clearing: [],
              kick: true,
              drop: {
                dist: fallDistances(stg.cleared),
                gen: (s.drop ? s.drop.gen : 0) + 1,
                spawn: null,
              },
            }));
            this.t4 = setTimeout(() => {
              this.setState({ kick: false });
              playStage(n + 1);
            }, 300);
          }, 420);
        }, 320);
      };
      playStage(0);
    } else {
      this.setState({
        busy: true,
        clearing: out.cleared,
        chain: [],
        preview: null,
      });
      this.t1 = setTimeout(land, 420);
    }
  }

  /* ---------- duel ---------- */

  private duelRng(side: string): () => number {
    if (!this.duelRngs[side])
      this.duelRngs[side] = mulberry32(
        Math.floor(Math.random() * 0xffffffff) >>> 0
      );
    return this.duelRngs[side]!;
  }

  goDuelLobby = (): void =>
    this.setState({ phase: 'duelLobby', duelFoe: null, duelOutcome: null });

  startDuel = (foe: DuelFoe) => (): void => {
    const mine = this.loadout();
    if (mine.length !== 5) return;
    this.duelRngs = {};
    this.duelStartedAt = Date.now();
    this.setState({
      phase: 'duel',
      duelFoe: foe,
      duelOutcome: null,
      duelTurns: 0,
      duelClock: DUEL_MATCH_SECONDS,
      duelLog: [],
      chain: [],
      preview: null,
      busy: false,
      clearing: [],
      drop: null,
      pops: [],
      duelHit: null,
      foeBeat: 'thinking',
      foeChain: [],
      foeClearing: [],
      foeDrop: null,
      foePops: [],
      foeSaid: '',
      duelFtue: this.state.profile.seenDuelFtue ? null : 0,
      duel: {
        me: makeDuelSide(this.state.heroClass, mine, 1, this.duelRng('me')),
        foe: makeDuelSide(
          foe.cls,
          foeLoadout(foe.cls),
          foe.skill,
          this.duelRng('foe')
        ),
      },
    });
    clearInterval(this.duelTickT);
    this.duelTickT = setInterval(this.duelTick, 1000);
    this.scheduleFoe();
  };

  /* The primer pauses the clock and the foe, so nobody loses HP while reading. */
  private duelFtuePaused(): boolean {
    return this.state.duelFtue !== null;
  }
  nextDuelFtue = (): void => {
    const i = this.state.duelFtue;
    if (i === null) return;
    if (i + 1 >= DUEL_FTUE_STEPS.length) {
      this.setState({ duelFtue: null });
      void api
        .ftueSeen('duel')
        .then((r) => this.adopt(r.profile))
        .catch(() => undefined);
      this.scheduleFoe();
      return;
    }
    this.setState({ duelFtue: i + 1 });
  };
  skipDuelFtue = (): void => {
    this.setState({ duelFtue: null });
    void api
      .ftueSeen('duel')
      .then((r) => this.adopt(r.profile))
      .catch(() => undefined);
    this.scheduleFoe();
  };

  duelTick = (): void => {
    const st = this.state;
    if (st.phase !== 'duel' || st.duelOutcome || this.duelFtuePaused()) return;
    const clock = st.duelClock - 1;
    if (clock <= 0) {
      this.endDuel(
        st.duel!.me.hp >= st.duel!.foe.hp ? 'time-win' : 'time-loss'
      );
      return;
    }
    this.setState({ duelClock: clock });
  };

  /* The foe runs on its own timer, independent of anything the player does. */
  private scheduleFoe(): void {
    clearTimeout(this.duelBot);
    if (this.state.phase !== 'duel' || this.state.duelOutcome) return;
    const skill = this.state.duelFoe?.skill ?? 0.85;
    const wait =
      DUEL_THINK_MIN +
      Math.random() * DUEL_THINK_SPREAD +
      (1 - skill) * DUEL_THINK_SKILL;
    this.setState({ foeBeat: 'thinking', foeChain: [], foeSaid: '' });
    this.duelBot = setTimeout(this.runFoeMove, wait);
  }

  runFoeMove = (): void => {
    const st = this.state;
    if (st.phase !== 'duel' || st.duelOutcome || !st.duel) return;
    // Board writes are serialised: if the player's move is mid-flight the foe
    // waits a beat rather than resolving against a stale board.
    if (this.duelFtuePaused()) {
      this.duelBot = setTimeout(this.runFoeMove, 320);
      return;
    }
    const move = duelBestMove(st.duel, 'foe', MUTATORS);
    if (!move) {
      this.endDuel('win-buried');
      return;
    }
    this.resolveDuel('foe', move);
  };

  resolveDuel(side: 'me' | 'foe', move: number[]): void {
    const st = this.state;
    if (!st.duel) return;
    const out = duelStep(st.duel, side, move, this.duelRng(side), MUTATORS);
    if (!out) {
      this.setState({ chain: [], preview: null });
      return;
    }

    const name = st.duelFoe?.name ?? 'Foe';
    const who = side === 'me' ? 'You' : name;
    const what =
      out.attack > 0
        ? ' hit for ' + out.attack
        : out.blockGain > 0
          ? ' raised ' + out.blockGain + ' block'
          : out.heal > 0
            ? ' healed ' + out.heal
            : ' cleared';
    const line =
      who + what + (out.junkSend > 0 ? ', sent ' + out.junkSend + ' junk' : '');

    // Floats sit over whoever they happened TO: damage over the struck side,
    // block and heal over the side that gained them.
    const mine: Pop[] = [];
    const theirs: Pop[] = [];
    const struckSide = side === 'me' ? theirs : mine;
    const gainSide = side === 'me' ? mine : theirs;
    if (out.attack > 0)
      struckSide.push({ text: '-' + out.attack, color: '#F08686', top: '10%' });
    if (out.burnDealt > 0)
      struckSide.push({
        text: '-' + out.burnDealt,
        color: RIDERS['burn']!.color,
        top: '26%',
      });
    if (out.blockGain > 0)
      gainSide.push({
        text: '+' + out.blockGain,
        color: '#89BCFF',
        top: '38%',
      });
    if (out.heal > 0)
      gainSide.push({ text: '+' + out.heal, color: '#C5F47D', top: '38%' });

    const finish = () => {
      if (out.over) {
        this.endDuel(side === 'me' ? 'win' : 'loss');
        return;
      }
      // A dead board ENDS the match: being buried out of legal links is the
      // whole point of sabotage, so it decides the duel rather than passing.
      const other = side === 'me' ? 'foe' : 'me';
      if (!hasAnyMove(out.state[other].board)) {
        this.endDuel(other === 'foe' ? 'win-buried' : 'loss-buried');
        return;
      }
      if (!hasAnyMove(out.state[side].board)) {
        this.endDuel(side === 'foe' ? 'win-buried' : 'loss-buried');
        return;
      }
      if (side === 'foe') this.scheduleFoe();
    };

    if (side === 'me') {
      this.pendingMe = true;
      this.setState({
        busy: true,
        clearing: out.cleared,
        chain: [],
        preview: null,
        duelHit: 'foe',
      });
      clearTimeout(this.t1);
      this.t1 = setTimeout(() => {
        this.pendingMe = false;
        this.setState((s) => ({
          duel: out.state,
          clearing: [],
          busy: false,
          pops: mine,
          foePops: theirs,
          duelTurns: s.duelTurns + 1,
          duelLog: [line].concat(s.duelLog).slice(0, 3),
          drop: {
            dist: fallDistances(out.cleared),
            gen: (s.drop ? s.drop.gen : 0) + 1,
            spawn: out.superAfter,
          },
        }));
        // Resolved at commit, not after the drop, so a kill or a burial is never
        // sitting behind an animation the player can already play through.
        finish();
        clearTimeout(this.t2);
        this.t2 = setTimeout(
          () =>
            this.setState({ pops: [], foePops: [], drop: null, duelHit: null }),
          520
        );
      }, 400);
      return;
    }

    /* A foe move plays in three announced beats - draw the link, clear it, then
       land the damage - so its play can actually be read. The board is locked
       for the duration, which is what keeps the two sides' writes serial. */
    const orb = out.chainOrb;
    const said =
      out.chainLen >= MIN_LINK
        ? name +
          ' links ' +
          out.chainLen +
          (orb ? ' ' + EFFECT_LABEL[orb.effect] : '') +
          (out.junkSend > 0 ? ' - ' + out.junkSend + ' junk incoming' : '')
        : name + ' detonates a bomb';
    this.setState({
      foeBeat: 'linking',
      foeChain: move.slice(),
      foeSaid: said,
      foeJunk: out.junkSend,
      foeHitFor: out.attack,
    });
    clearTimeout(this.foeT1);
    this.foeT1 = setTimeout(() => {
      this.setState({ foeBeat: 'clearing', foeClearing: out.cleared });
      clearTimeout(this.foeT2);
      const land = () => {
        if (this.pendingMe) {
          this.foeT2 = setTimeout(land, 90);
          return;
        }
        this.setState((s) => ({
          duel: out.state,
          foeBeat: 'landed',
          foeChain: [],
          foeClearing: [],
          pops: mine,
          foePops: theirs,
          duelHit: 'me',
          duelTurns: s.duelTurns + 1,
          duelLog: [line].concat(s.duelLog).slice(0, 3),
          foeDrop: {
            dist: fallDistances(out.cleared),
            gen: (s.foeDrop ? s.foeDrop.gen : 0) + 1,
            spawn: out.superAfter,
          },
        }));
        clearTimeout(this.foeT3);
        this.foeT3 = setTimeout(() => {
          this.setState({
            pops: [],
            foePops: [],
            foeDrop: null,
            duelHit: null,
            foeBeat: 'idle',
          });
          finish();
        }, FOE_LAND_MS);
      };
      this.foeT2 = setTimeout(land, FOE_CLEAR_MS);
    }, FOE_LINK_MS);
  }

  private endDuel(kind: string): void {
    clearInterval(this.duelTickT);
    for (const t of [this.duelBot, this.foeT1, this.foeT2, this.foeT3])
      clearTimeout(t);
    const won = kind === 'win' || kind === 'time-win' || kind === 'win-buried';
    const seconds = Math.round((Date.now() - this.duelStartedAt) / 1000);
    // Shown immediately off the local result; the server's number replaces it
    // the moment it answers, so a slow network never holds up the panel.
    this.setState({
      duelOutcome: {
        kind,
        won,
        delta: won ? DUEL_WIN_TROPHIES : -DUEL_LOSS_TROPHIES,
      },
      busy: false,
    });
    void api
      .duelResult({ foe: this.state.duelFoe?.name ?? '', won, seconds })
      .then((r) => {
        const before = this.state.profile.trophies;
        this.adopt(r.profile);
        this.setState((s) => ({
          duelOutcome: s.duelOutcome
            ? { ...s.duelOutcome, delta: r.profile.trophies - before }
            : s.duelOutcome,
        }));
      })
      .catch(() => undefined);
  }

  duelAgain = (): void => {
    const f = this.state.duelFoe;
    const out = this.state.duelOutcome;
    if (!f || out?.won) return;
    this.startDuel(f)();
  };

  leaveDuel = (): void => {
    clearInterval(this.duelTickT);
    for (const t of [this.duelBot, this.foeT1, this.foeT2, this.foeT3])
      clearTimeout(t);
    this.setState({ phase: 'duelLobby', duelOutcome: null });
  };

  /* ---------- shop / bag / packs ---------- */

  goShop = (): void =>
    this.setState({ phase: 'shop', shopMsg: null, homeMenu: false });
  goInventory = (): void =>
    this.setState({ phase: 'inventory', homeMenu: false });
  pickShopTab = (t: 'packs' | 'coins' | 'gems') => (): void =>
    this.setState({ shopTab: t, shopMsg: null });
  pickInvTab = (t: 'packs' | 'gear') => (): void =>
    this.setState({ invTab: t, cardInfo: null });
  inspectCard = (id: string) => (): void => this.setState({ cardInfo: id });
  closeCardInfo = (): void => this.setState({ cardInfo: null });

  buyCoins = (id: string) => (): void => {
    void api
      .buyCoins(id)
      .then((r) => this.adopt(r.profile, r.message))
      .catch(this.fail);
  };
  /**
   * Gems are real money, so this hands off to Reddit and then gets out of the
   * way. The gems are credited by the fulfilment endpoint, off the order Reddit
   * has already charged for - all this does afterwards is re-read the wallet.
   */
  buyGems = (id: string) => (): void => {
    const bundle = bundleById(GEM_BUNDLES, id);
    if (!bundle?.sku) return;
    this.setState({ shopMsg: 'Opening checkout...' });
    void purchase(bundle.sku)
      .then(async (order) => {
        if (order.status === OrderResultStatus.STATUS_CANCELLED) {
          this.setState({ shopMsg: null });
          return;
        }
        if (order.status !== OrderResultStatus.STATUS_SUCCESS) {
          this.fail(
            new Error(
              'That purchase did not go through. You have not been charged.'
            )
          );
          return;
        }
        // Fulfilment happens server-side and may land a moment after checkout
        // closes, so the balance is re-read rather than assumed.
        const res = await api.profile();
        const gained = res.profile.gems - this.state.profile.gems;
        this.adopt(
          res.profile,
          gained > 0
            ? '+' + gained + ' gems.'
            : 'Purchase received. Your gems will land shortly.'
        );
      })
      .catch(this.fail);
  };

  /** Buying opens it: the bag is for packs you saved, not a toll on a purchase
   *  you just made. COLLECT returns to the shop rather than to the bag. */
  buyPack = (id: string) => (): void => {
    void api
      .buyPack(id)
      .then((r) => {
        this.adopt(r.profile, r.message);
        if (!r.message) this.openPackFrom(id, 'shop');
      })
      .catch(this.fail);
  };

  openPack = (id: string) => (): void => this.openPackFrom(id, 'inventory');

  /** The roll happens on the server and is held there against a token; the
   *  cards only land in the collection when COLLECT presents that token back,
   *  so a half-watched open cannot half-apply. */
  private openPackFrom(id: string, from: 'shop' | 'inventory'): void {
    void api
      .openPack(id)
      .then((r) => {
        const cards = r.cards
          .map((c: PulledCard) => {
            const gear = GEAR.find((g) => g.id === c.id);
            return gear ? { gear, isNew: c.isNew, refund: c.refund } : null;
          })
          .filter(
            (c): c is { gear: Gear; isNew: boolean; refund: number } => !!c
          );
        this.setState({
          phase: 'opening',
          openPack: { id, token: r.token, cards, shown: 0, torn: false, from },
        });
      })
      .catch(this.fail);
  }

  tearPack = (): void => {
    const op = this.state.openPack;
    if (!op || op.torn) return;
    this.setState({ openPack: { ...op, torn: true, shown: 1 } });
  };
  revealNext = (): void => {
    const op = this.state.openPack;
    if (!op) return;
    if (!op.torn) {
      this.tearPack();
      return;
    }
    if (op.shown >= op.cards.length) return;
    this.setState({ openPack: { ...op, shown: op.shown + 1 } });
  };
  revealAll = (): void => {
    const op = this.state.openPack;
    if (!op) return;
    this.setState({ openPack: { ...op, torn: true, shown: op.cards.length } });
  };

  /** One line naming what the open was worth. */
  packSummary = (op: OpenState): string => {
    const nw = op.cards.filter((c) => c.isNew).length;
    const refund = op.cards.reduce((n, c) => n + c.refund, 0);
    const best = op.cards
      .slice()
      .sort(
        (a, b) =>
          RARITY_ORDER.indexOf(b.gear.rarity) -
          RARITY_ORDER.indexOf(a.gear.rarity)
      )[0];
    if (op.cards.length === 1) {
      const c = op.cards[0]!;
      return c.isNew
        ? 'New gear - ' + c.gear.rarity
        : 'Duplicate - refunded ' + c.refund + ' coins';
    }
    const parts = [
      nw > 0 ? nw + (nw === 1 ? ' new piece' : ' new pieces') : 'No new gear',
    ];
    if (refund > 0) parts.push('+' + refund + ' coins from duplicates');
    if (best) parts.push('best: ' + best.gear.rarity);
    return parts.join('  -  ');
  };

  collectPack = (): void => {
    const op = this.state.openPack;
    if (!op) return;
    const back = op.from === 'shop';
    const summary = this.packSummary(op);
    void api
      .collectPack({ token: op.token })
      .then((r) => {
        this.setState({
          phase: back ? 'shop' : 'inventory',
          invTab: 'gear',
          openPack: null,
        });
        this.adopt(r.profile, back ? summary : undefined);
      })
      .catch(this.fail);
  };

  /* ---------- FTUE ---------- */

  private ftueSeen(): boolean {
    return this.state.profile.seenFtue;
  }
  private markFtueSeen(): void {
    if (this.state.profile.seenFtue) return;
    this.setState((s) => ({ profile: { ...s.profile, seenFtue: true } }));
    void api
      .ftueSeen('run')
      .then((r) => this.adopt(r.profile))
      .catch(() => undefined);
  }

  /** Hint cells for the drag step - null when the board holds no attack link,
   *  which is what makes `drag` and `damage` skippable as a pair. */
  ftueHint = (): number[] | null => {
    const st = this.state;
    if (st.ftueStep !== 'orbs' && st.ftueStep !== 'drag') return null;
    if (!st.bs) return null;
    return findAttackLink(st.bs.board, this.loadout());
  };
  ftueBlocksBoard(): boolean {
    return this.state.ftueStep !== null && !FTUE_DOING[this.state.ftueStep];
  }

  /** Pre-battle steps follow the phase, so back-navigation re-points the card
   *  instead of stranding it on a screen that is no longer showing. */
  private syncFtueToPhase(): void {
    if (this.ftueSeen()) {
      if (this.state.ftueStep !== null)
        this.setState({ ftueStep: null, ftuePlace: null });
      return;
    }
    const want = FTUE_PHASE_STEP[this.state.phase];
    if (want && this.state.ftueStep !== want)
      this.setState({ ftueStep: want, ftuePlace: null });
  }

  endFtue = (): void => {
    this.markFtueSeen();
    this.setState({ ftueStep: null, ftuePlace: null });
  };

  /** Deal a board that HAS an attack link, rather than skipping the drag lesson
   *  because this particular deal had none. Only reachable before the player's
   *  first move, so nothing recorded is disturbed. */
  private dealTeachableBoard(): boolean {
    const bs = this.state.bs;
    if (!bs || !this.run || this.moves.length) return false;
    const weights = this.weights();
    const loadout = this.loadout();
    if (!loadout.some((o) => o.effect === 'attack')) return false;
    // A re-deal consumes the run's RNG, so the seed must be re-rolled with it -
    // otherwise the server would replay the board the player never saw.
    for (let tries = 0; tries < 80; tries++) {
      const seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
      const candidate = new Run({
        seed,
        heroClass: this.state.heroClass,
        picked: this.state.picked,
        mutators: MUTATORS,
      });
      const start = candidate.start();
      if (findAttackLink(start.board, loadout)) {
        this.run = candidate;
        this.seed = seed;
        this.setState({ bs: start });
        return true;
      }
    }
    void weights;
    return false;
  }

  advanceFtue = (): void => {
    const cur = this.state.ftueStep;
    if (!cur) return;
    let next: FtueStep | null = FTUE_ORDER[FTUE_ORDER.indexOf(cur) + 1] ?? null;
    // Linking is the whole game, so re-deal instead of skipping it.
    if (
      next === 'drag' &&
      this.ftueHint() === null &&
      !this.dealTeachableBoard()
    )
      next = 'waves';
    if (next === null) this.markFtueSeen();
    this.setState({ ftueStep: next, ftuePlace: null });
  };

  setFtueFight = (el: HTMLElement | null): void => {
    this.ftueFightEl = el;
  };
  setFtueHero = (el: HTMLElement | null): void => {
    this.ftueHeroEl = el;
  };
  setFtueGear = (el: HTMLElement | null): void => {
    this.ftueGearEl = el;
  };
  setFtueSlots = (el: HTMLElement | null): void => {
    this.ftueSlotsEl = el;
  };
  setFtueRoot = (el: HTMLElement | null): void => {
    this.ftueRoot = el;
  };
  setFtueBoard = (el: HTMLElement | null): void => {
    this.ftueBoardEl = el;
  };
  setFtueEnemy = (el: HTMLElement | null): void => {
    this.ftueEnemyEl = el;
  };
  setFtueTrack = (el: HTMLElement | null): void => {
    this.ftueTrackEl = el;
  };
  setFtueCard = (el: HTMLElement | null): void => {
    this.ftueCard = el;
    this.cardObs?.disconnect();
    this.cardObs = null;
    if (!el) return;
    // The card's own height settles a frame late (web fonts, the legend's gear
    // art), so re-measure whenever it changes size rather than trusting one shot.
    if (typeof ResizeObserver !== 'undefined') {
      this.cardObs = new ResizeObserver(() => this.measureFtue());
      this.cardObs.observe(el);
    }
    requestAnimationFrame(this.measureFtue);
  };

  /** The card is MEASURED into place, not parked at a fixed offset: the monster
   *  sprite and the board both size off the viewport, so a fixed top would land
   *  the card on the very bar it points at. */
  measureFtue = (): void => {
    const step = this.state.ftueStep;
    if (!step || !this.ftueRoot || !this.ftueCard) return;
    const spec = FTUE_TARGET[step]!;
    const el =
      spec.target === 'board'
        ? this.ftueBoardEl
        : spec.target === 'enemyHp'
          ? this.ftueEnemyEl
          : spec.target === 'track'
            ? this.ftueTrackEl
            : spec.target === 'fight'
              ? this.ftueFightEl
              : spec.target === 'hero'
                ? this.ftueHeroEl
                : spec.target === 'slots'
                  ? this.ftueSlotsEl
                  : this.ftueGearEl;
    if (!el) return;
    const arena = this.ftueRoot.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const cardH = this.ftueCard.getBoundingClientRect().height;
    if (!arena.height || !rect.height) return;
    const roomAbove = rect.top - arena.top;
    const roomBelow = arena.bottom - rect.bottom;
    const needed = cardH + FTUE_ARROW_GAP + 16;
    const side =
      spec.place === 'above'
        ? roomAbove >= needed || roomAbove >= roomBelow
          ? 'above'
          : 'below'
        : roomBelow >= needed || roomBelow >= roomAbove
          ? 'below'
          : 'above';
    const offsetRaw =
      side === 'above'
        ? arena.bottom - rect.top + FTUE_ARROW_GAP
        : rect.bottom - arena.top + FTUE_ARROW_GAP;
    // Neither side may be able to hold a tall card (the legend step). Clamp so
    // it slides back inside the shell instead of off the top edge.
    const next: Place = {
      side,
      offset: Math.min(offsetRaw, Math.max(0, arena.height - cardH - 4)),
      hole: {
        top: rect.top - arena.top,
        left: rect.left - arena.left,
        w: rect.width,
        h: rect.height,
      },
    };
    const cur = this.state.ftuePlace;
    if (
      cur &&
      cur.side === next.side &&
      Math.abs(cur.offset - next.offset) < 1 &&
      Math.abs(cur.hole.top - next.hole.top) < 1 &&
      Math.abs(cur.hole.left - next.hole.left) < 1
    )
      return;
    this.setState({ ftuePlace: next });
  };

  override render() {
    if (this.state.fatal) return <Fatal message={this.state.fatal} />;
    if (!this.state.ready) return <Booting />;
    return <Screen v={buildView(this)} />;
  }
}

const Booting = () => (
  <div style={shellStyle}>
    <div
      style={{
        fontFamily: "'Yoster Island',Volter,monospace",
        fontSize: 16,
        color: '#FFF2B0',
      }}
    >
      LOADING THE FORGE...
    </div>
  </div>
);

const Fatal = ({ message }: { message: string }) => (
  <div style={shellStyle}>
    <div
      style={{
        maxWidth: '36ch',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          fontFamily: "'Yoster Island',Volter,monospace",
          fontSize: 16,
          color: '#FF9EA1',
        }}
      >
        CANNOT OPEN THE FORGE
      </div>
      <div style={{ fontSize: 12, color: '#CBD9EC', lineHeight: 1.6 }}>
        {message}
      </div>
    </div>
  </div>
);

const shellStyle = {
  minHeight: '100vh',
  background: '#0B1020',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  fontFamily: 'Volter,ui-monospace,monospace',
} as const;
