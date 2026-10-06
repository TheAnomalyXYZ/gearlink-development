/**
 * The app: all state, all behaviour, all animation timing.
 *
 * It stays a class component because the design's flow is built out of chained
 * timers - a link clears, the board settles, the monster winds up, the swing
 * lands - and each beat is a named slot in `timers`. Hooks would scatter that
 * across refs without making any of it clearer.
 *
 * The rule that shapes everything else: the CLIENT plays, the SERVER decides.
 * A run records the seed it was dealt and every move made on it, then submits
 * both; the score, the coins and the ladder position all come back from the
 * replay. The wallet is never edited locally.
 *
 * What lives elsewhere, so this file stays about behaviour:
 * - `state/appState.ts`  the state shape, its initial value, the reset groups
 * - `state/feedback.ts`  link previews, damage floats, duel log lines (pure)
 * - `state/packs.ts`     pack-open cards and summaries (pure)
 * - `state/mapPan.ts`    map cover-scale and pan clamping (pure)
 * - `state/dom.ts`       ResizeObserver swapping and board-budget measuring
 * - `state/timers.ts`    named, self-replacing timeouts and intervals
 * - `state/boot.ts`      the first reads, fired before React mounts
 */
import { Component, Suspense, lazy } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { context, navigateTo, showToast } from '@devvit/web/client';
import { OrderResultStatus, purchase } from '@devvit/payments/client';
import {
  DUEL_FTUE_STEPS,
  DUEL_LOBBY_SIZE,
  DUEL_LOSS_TROPHIES,
  DUEL_THINK_MIN,
  DUEL_THINK_SKILL,
  DUEL_THINK_SPREAD,
  DUEL_SETUP_STEPS,
  DUEL_WIN_TROPHIES,
  DUEL_STACK_MIN_H,
  FOE_CLEAR_MS,
  FOE_LAND_MS,
  FOE_LINK_MS,
  DUPE_COINS,
  GEAR,
  GEAR_BY_ID,
  GEM_BUNDLES,
  GRID_COLS,
  GRID_ROWS,
  HERO_PERKS,
  MAP_ART,
  MIN_LINK,
  NO_STATUS,
  Run,
  areAdjacent,
  bundleById,
  canApplyHeart,
  duelBestMove,
  duelStep,
  enemyDisplayFor,
  fallDistances,
  flairById,
  foeLoadout,
  hasAnyMove,
  heartsFor,
  isJunk,
  isSuper,
  loadoutIsLegal,
  locationById,
  locationIndex,
  makeDuelSide,
  maxHpFor,
  mulberry32,
  orbTypeOf,
  ownedLoadout,
  resolveLoadout,
  scoreOf,
} from '../shared/engine/index.js';
import type {
  DuelFoe,
  Enemy,
  Gear,
  HeroClass,
  Mutators,
  Rarity,
  RunState,
  StepResult,
} from '../shared/engine/index.js';
import type { Profile, SubmitRunRequest } from '../shared/api.js';
import { api } from './api.js';
import {
  DEFAULT_VOLUMES,
  audio,
  loadVolumes,
  saveVolumes,
} from './audio/audio.js';
import type { Volumes } from './audio/audio.js';
import { BGM, regionBgm } from './audio/tracks.js';
import { Booting, Fatal } from './components/BootScreens.js';
import {
  FTUE_ARROW_GAP,
  FTUE_DOING,
  FTUE_ORDER,
  FTUE_PHASE_STEP,
  FTUE_TARGET,
  findAttackLink,
  type FtueStep,
} from './ftue.js';
import {
  BATTLE_RESET,
  DUEL_RESET,
  INITIAL_STATE,
  MUTATORS,
  isCollectFx,
} from './state/appState.js';
import type {
  AppState,
  DuelEndKind,
  PackFx,
  QuestFx,
  WalletFx,
  GearTab,
  InvTab,
  OpenState,
  Phase,
  Place,
  QuestTab,
  ShopTab,
} from './state/appState.js';
import { bootData } from './state/boot.js';
import {
  panelChrome,
  reobserve,
  safeToast,
  siblingFloors,
} from './state/dom.js';
import {
  duelLogLine,
  duelPops,
  foeAnnouncement,
  linkPreview,
  runPops,
  swingPop,
  type Preview,
} from './state/feedback.js';
import { DRAG_SLOP, clampPan, panBounds } from './state/mapPan.js';
import { packSummary, toOpenCards } from './state/packs.js';
import { Timers } from './state/timers.js';
import { buildView } from './view/buildView.js';
import { Screen } from './view/Screen.js';
import type { FxRect } from './fx/fx.js';
import { juice } from './juice.js';
import { paletteFor } from './view/tilePalette.js';

/** Moderators only, and rarely - kept out of the main bundle. */
const AdminPanel = lazy(() =>
  import('./admin/AdminPanel.js').then((m) => ({ default: m.AdminPanel }))
);

export type { AppState } from './state/appState.js';

/** Everything a run is built from, and exactly what the transcript carries -
 *  so the board the player sees and the board the server replays share one
 *  source. */
type RunSpec = Omit<SubmitRunRequest, 'moves'>;

type TimerKey =
  // campaign beats
  | 'link'
  | 'forge'
  | 'land'
  | 'reject'
  | 'blast'
  | 'spawn'
  | 'swing'
  | 'ftue'
  | 'endRoll'
  | 'hpRoll'
  // duel
  | 'duelTick'
  | 'duelBot'
  | 'foeLink'
  | 'foeClear'
  | 'foeLand'
  // chrome
  | 'shopMsg';

/** Every timer that drives the duel's clock and its bot. */
const DUEL_TIMERS: TimerKey[] = [
  'duelTick',
  'duelBot',
  'foeLink',
  'foeClear',
  'foeLand',
];

const SHOP_MSG_MS = 3200;
const REJECT_MS = 300;

type Stopper = { stopPropagation?: () => void };

const newSeed = (): number => Math.floor(Math.random() * 0xffffffff) >>> 0;

export class GearLinkApp extends Component<Record<string, never>, AppState> {
  /** The run in flight. Holds the RNG, so it is the only thing that can advance
   *  the board - and `moves` is the transcript the server will replay. */
  private run: Run | null = null;
  private runSpec: RunSpec | null = null;
  private moves: number[][] = [];

  private duelRngs: Record<string, () => number> = {};
  private duelStartedAt = 0;
  private pendingMe = false;

  private timers = new Timers<TimerKey>();

  private wrap: HTMLElement | null = null;
  private mapWrap: HTMLElement | null = null;
  private foeWrap: HTMLElement | null = null;
  private arena: HTMLElement | null = null;
  private ro: ResizeObserver | null = null;
  private mro: ResizeObserver | null = null;
  private fro: ResizeObserver | null = null;
  private aro: ResizeObserver | null = null;
  private cardObs: ResizeObserver | null = null;

  /** Pan bookkeeping. Held on the instance, not in state, so a pointer move
   *  only re-renders when the offset actually changes - and `moved` is what
   *  tells a drag apart from a tap on a pin. */
  private mapDrag = {
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  };

  private trim = 0;
  /** Standing correction to the height budget, in px, learned by trimBoard. */
  private trimPx = 0;
  /** The column height trimPx was learned against; a change invalidates it. */
  private measuredColumnH = 0;
  private prevPhase: Phase | null = null;

  /** Resolved gear for the current `picked`, reused until `picked` changes. */
  private loadoutMemo: { picked: string[]; gear: Gear[] } | null = null;

  private ftueRoot: HTMLElement | null = null;
  private ftueCard: HTMLElement | null = null;
  /** Coach-mark targets, keyed by FTUE_TARGET's `target` names. */
  private ftueEls: Record<string, HTMLElement | null> = {};

  override state: AppState = INITIAL_STATE;

  override componentDidMount(): void {
    void this.boot();
    const volumes = loadVolumes();
    this.setState({ volumes });
    audio.setVolumes(volumes);
    audio.attach();
    document.addEventListener('click', this.onUiClick);
    this.syncMusic();
    window.addEventListener('resize', this.measureFtue);
    window.addEventListener('orientationchange', this.measureFtue);
  }

  override componentDidUpdate(): void {
    const st = this.state;
    if (this.prevPhase !== st.phase) {
      this.prevPhase = st.phase;
      this.syncFtueToPhase();
    }
    this.syncMusic();
    // Don't consume the step until a placement actually lands, so a frame that
    // measures before layout settles doesn't leave the card hidden forever.
    if (st.ftueStep && !st.ftuePlace) requestAnimationFrame(this.measureFtue);
  }

  override componentWillUnmount(): void {
    this.timers.clearAll();
    audio.detach();
    document.removeEventListener('click', this.onUiClick);
    for (const o of [this.ro, this.fro, this.aro, this.cardObs, this.mro])
      o?.disconnect();
    window.removeEventListener('resize', this.measureFtue);
    window.removeEventListener('orientationchange', this.measureFtue);
  }

  /** The profile and the quest board were requested before React mounted (see
   *  `state/boot.ts`); this only waits on them. */
  private async boot(): Promise<void> {
    const { init, quests } = bootData();
    try {
      const res = await init;
      this.setState(
        (s) => ({
          ready: true,
          profile: res.profile,
          leaderboard: res.leaderboard,
          picked: ownedLoadout(s.heroClass, res.profile.gear),
          challenger: res.challenger,
          daily: res.daily,
          isMod: res.isModerator,
        }),
        // Opened from a challenge post: ACCEPT goes straight to the pre-fight
        // screen against its poster - by way of the duel build if there is no
        // loadout yet, which hands back to that screen once it is saved.
        // Opened from a Daily Battle post: straight into that location's
        // pre-fight build, whether or not the climb has reached it.
        () => {
          const foe = res.challenger;
          if (foe) {
            if (this.duelLoadout()) this.pickFoe(foe)();
            else this.openDuelSetup(foe);
            return;
          }
          if (res.daily) this.pickLocation(res.daily.locationId)();
        }
      );
    } catch (e) {
      this.setState({
        fatal: e instanceof Error ? e.message : 'Could not load your profile.',
      });
      return;
    }
    const q = await quests;
    if (q) this.setState({ quests: q.board });
    else this.refreshQuests();
  }

  /* ---------- wallet + messages ---------- */

  private clearShopMsgSoon(): void {
    this.timers.after('shopMsg', SHOP_MSG_MS, () =>
      this.setState({ shopMsg: null })
    );
  }

  /** Adopt whatever the server now says the wallet is, and surface its note. */
  private adopt = (profile: Profile, message?: string): void => {
    this.noteFlairs(profile);
    this.setState((s) => ({
      profile,
      shopMsg: message ?? s.shopMsg,
      // A pack opened elsewhere can strand the picker on gear that is no longer
      // owned, so the loadout is repaired against every profile that arrives.
      picked: this.repairPicked(s.picked, s.heroClass, profile),
    }));
    if (message) this.clearShopMsgSoon();
  };

  /** Toast any flair this profile unlocked that the one on screen had not. */
  private noteFlairs(next: Profile): void {
    const had = new Set(this.state.profile.flairs);
    for (const id of next.flairs) {
      const def = had.has(id) ? null : flairById(id);
      if (def) safeToast(showToast, 'Flair unlocked: ' + def.text + '!');
    }
  }

  private fail = (e: unknown): void => {
    const msg = e instanceof Error ? e.message : 'Something went wrong.';
    this.setState({ shopMsg: msg });
    safeToast(showToast, msg);
    this.clearShopMsgSoon();
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

  /** Record a primer as seen. Best-effort: a failed write only means it shows
   *  again next time. */
  private markSeen(which: 'run' | 'duel' | 'duelSetup'): void {
    void api
      .ftueSeen(which)
      .then((r) => this.adopt(r.profile))
      .catch(() => undefined);
  }

  /* ---------- derived ---------- */

  mflags(): Mutators {
    return MUTATORS;
  }
  /** Containers banked by the class currently selected. This is what the run
   *  is built with and what the transcript carries; the server checks it
   *  against the profile before it replays anything. */
  heartsOfClass(cls?: HeroClass): number {
    return heartsFor(this.state.profile.hearts, cls ?? this.state.heroClass);
  }
  maxHp(): number {
    return this.run ? this.run.maxHp() : maxHpFor(this.heartsOfClass());
  }
  /** Whether the pieces on hand buy this class another container. */
  canUpgradeHp(cls?: HeroClass): boolean {
    return canApplyHeart(
      this.state.profile.heartPieces,
      this.heartsOfClass(cls)
    );
  }

  /** Spend three pieces on the selected class. The server owns the wallet, so
   *  nothing is deducted here - the profile that comes back is adopted whole. */
  upgradeHp = (cls: HeroClass) => (): void => {
    if (this.state.heartUpgrading || !this.canUpgradeHp(cls)) return;
    this.setState({ heartUpgrading: true });
    void api
      .applyHeart({ cls })
      .then((r) => {
        this.setState({ heartUpgrading: false });
        this.adopt(r.profile, r.message);
      })
      .catch((e) => {
        this.setState({ heartUpgrading: false });
        this.fail(e);
      });
  };
  perk() {
    return HERO_PERKS[this.state.heroClass] ?? HERO_PERKS.Hero;
  }
  /** Memoised on the `picked` array: the view and the input handlers ask for
   *  this many times per render, and it only changes when `picked` does. */
  loadout(): Gear[] {
    const picked = this.state.picked;
    if (this.loadoutMemo?.picked !== picked)
      this.loadoutMemo = { picked, gear: resolveLoadout(picked) };
    return this.loadoutMemo.gear;
  }
  scoreOf = (bs: RunState): number => scoreOf(bs);

  /** The spec a run started now would be built from. */
  private currentRunSpec(seed: number): RunSpec {
    const st = this.state;
    return {
      seed,
      heroClass: st.heroClass,
      picked: st.picked,
      locationId: st.locationId,
      ascension: st.profile.ascension,
      hearts: this.heartsOfClass(),
    };
  }

  /** The wave the HUD should describe. Everything routes through the live Run,
   *  so the UI can never disagree with the engine about a wave's stats. */
  enemyAt(_base: unknown, wave: number): Enemy {
    return (this.run ?? new Run(this.currentRunSpec(1))).enemyForWave(wave);
  }

  /** How many waves the battle in flight holds. Before it starts, the map
   *  card shows the location's band instead, so this is only ever asked
   *  during a run. */
  waveCount(): number {
    return this.run ? this.run.waveCount : 0;
  }

  locationName(): string {
    return locationById(this.state.locationId).name;
  }
  /** The last wave of the battle, which is always the location's elite. */
  isBossWave(wave: number): boolean {
    return this.run ? this.run.isBossWave(wave) : false;
  }
  /** The Castle's boss wave, and the only kill that ascends. */
  isKingWave(wave: number): boolean {
    return this.isBossWave(wave) && !!locationById(this.state.locationId).king;
  }

  /** Name and art for a wave of the run in flight. The region is the
   *  LOCATION's, so every wave of a battle shares one backdrop. */
  waveDisplay(wave: number) {
    const loc = locationById(this.state.locationId);
    const name = this.run ? this.run.planFor(wave).name : loc.mobs[0]!;
    return enemyDisplayFor(name, loc.region);
  }
  blockCapFor = (e: Enemy) => (this.run ? this.run.blockCapFor(e) : 0);
  swingStrength = (e: Enemy, hits: number) =>
    this.run ? this.run.swingStrength(e, hits) : e.strength;
  intentFor = (e: Enemy, meter: number, hits: number) =>
    this.run ? this.run.intentFor(e, meter, hits) : 'charge';

  /* ---------- measurement ---------- */

  boardWrapRef = (el: HTMLElement | null): void => {
    if (this.wrap === el) return;
    this.wrap = el;
    // Re-observe on every NEW node: the duel screen mounts its own wrapper, and
    // a one-shot observer would stay pinned to the campaign's element and leave
    // the duel board measured at zero.
    this.ro = reobserve(this.ro, el, this.measureBoard);
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
    if (!w || !panel || !column || !column.clientHeight) return;
    /* The board panel is sized FROM the board, so its available height must come
       from the column's other children - see siblingFloors for why floors and
       not rendered heights. */
    const used = siblingFloors(column, panel);
    const chrome = panelChrome(panel, el);
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
    this.fro = reobserve(this.fro, el, this.measureDuelBoards);
    this.measureDuelBoards();
    if (el) requestAnimationFrame(this.measureDuelBoards);
  };

  /* Whether the duel stacks two EQUAL boards is decided by the arena's own
     height, never by the boards - deciding it from a board size would feed the
     layout back into the measurement that produced it. */
  duelArenaRef = (el: HTMLElement | null): void => {
    if (this.arena === el) return;
    this.arena = el;
    this.aro = reobserve(this.aro, el, this.measureDuelArena);
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
    this.setState({ endT: 0 });
    const t0 = Date.now();
    this.timers.every('endRoll', 40, () => {
      const p = Math.min(1, (Date.now() - t0) / 700);
      this.setState({ endT: p });
      if (p >= 1) this.timers.clear('endRoll');
    });
  }

  /** Roll the HP figure toward its new value instead of snapping, so a hit
   *  reads as damage taken rather than a number swap. Ticks that would show
   *  the same integer skip the render. */
  rollHp(to: number): void {
    this.timers.clear('hpRoll');
    const from = this.state.hpShown ?? to;
    if (from === to) {
      this.setState({ hpShown: to });
      return;
    }
    const t0 = Date.now();
    this.timers.every('hpRoll', 30, () => {
      const p = Math.min(1, (Date.now() - t0) / 420);
      const shown = Math.round(from + (to - from) * p);
      if (shown !== this.state.hpShown) this.setState({ hpShown: shown });
      if (p >= 1) this.timers.clear('hpRoll');
    });
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
  /** HOME IS THE MAP, so there is nowhere else to send anyone. Kept as its own
   *  name because the end screen and the hero step both mean "back to the map"
   *  rather than "back to a menu". */
  goMap = (): void => {
    this.setState({ openLocation: null });
    this.goStep('home')();
  };

  /* ---------- the map ---------- */

  mapWrapRef = (el: HTMLElement | null): void => {
    this.mapWrap = el;
    this.mro = reobserve(this.mro, el, this.measureMap);
    this.measureMap();
  };

  /** Cover-scale the artwork to the viewport and keep the pan inside it. The
   *  map is taller than the shell, so the overflow is what there is to pan. */
  measureMap = (): void => {
    const el = this.mapWrap;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    this.setState((s) => {
      const { x, y } = clampPan(s.mapX, s.mapY, w, h);
      // Open centred on the vertical overflow rather than pinned to the top,
      // so the first thing on screen is the middle of the road.
      const started = s.mapW > 0 || s.mapH > 0;
      return {
        mapW: w,
        mapH: h,
        mapX: x,
        mapY: started ? y : panBounds(w, h).minY / 2,
      };
    });
  };

  /** The artwork's drawn size and offset, for the view. */
  mapFrame(): { w: number; h: number; x: number; y: number } {
    const st = this.state;
    const { scale } = panBounds(st.mapW || MAP_ART.w, st.mapH || MAP_ART.h);
    return {
      w: MAP_ART.w * scale,
      h: MAP_ART.h * scale,
      x: st.mapX,
      y: st.mapY,
    };
  }

  onMapDown = (e: ReactPointerEvent): void => {
    this.mapDrag = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: this.state.mapX,
      originY: this.state.mapY,
      moved: false,
    };
  };
  onMapMove = (e: ReactPointerEvent): void => {
    const d = this.mapDrag;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > DRAG_SLOP) {
      d.moved = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (!d.moved) return;
    const st = this.state;
    const { x, y } = clampPan(d.originX + dx, d.originY + dy, st.mapW, st.mapH);
    if (x !== st.mapX || y !== st.mapY) this.setState({ mapX: x, mapY: y });
  };
  onMapUp = (e: ReactPointerEvent): void => {
    if (this.mapDrag.active && e.currentTarget.hasPointerCapture?.(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    this.mapDrag.active = false;
  };
  /** Swallow the click a drag leaves behind, so panning never opens a pin. */
  onMapClickCapture = (e: { stopPropagation: () => void }): void => {
    if (!this.mapDrag.moved) return;
    this.mapDrag.moved = false;
    e.stopPropagation();
  };

  /** Tap a pin: open its panel, or close it if it was already the open one.
   *  A locked pin says so rather than doing nothing. */
  tapLocation = (id: string) => (): void => {
    if (this.mapDrag.moved) return;
    this.setState((s) => ({ openLocation: s.openLocation === id ? null : id }));
  };
  closeLocation = (): void => this.setState({ openLocation: null });

  /** Commit to a location and walk into the hero step. A locked node is inert:
   *  the map is the only gate on the run, so it is enforced here as well as on
   *  the server. The daily post's own location is the one exception. */
  pickLocation = (id: string) => (): void => {
    if (!this.canEnter(id)) return;
    this.setState({ locationId: id, flow: 'run', openLocation: null }, () =>
      this.goStep('hero')()
    );
  };
  /** Whether a location is open to fight: reached by the climb, or the one
   *  the Daily Battle post this app was opened from is fought at. */
  canEnter = (id: string): boolean =>
    locationIndex(id) <= this.state.profile.progress ||
    id === this.state.daily?.locationId;

  /** Whether the run on screen is this post's Daily Battle. */
  isDailyRun = (): boolean =>
    !!this.state.daily && this.state.locationId === this.state.daily.locationId;

  /** PLAY AGAIN on a Daily Battle's end screen: back into its build. */
  replayDaily = (): void => {
    const daily = this.state.daily;
    if (daily) this.pickLocation(daily.locationId)();
  };

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
  openFlairFromMenu = (): void =>
    this.setState({ modal: 'flair', homeMenu: false });

  private flairBusy = false;
  /** Wear an unlocked flair, or null to take it off. Reddit is written by the
   *  server first, so the profile that comes back is what Reddit now shows. */
  equipFlair = (flairId: string | null) => (): void => {
    if (this.flairBusy) return;
    this.flairBusy = true;
    void api
      .equipFlair(flairId)
      .then((r) => {
        this.adopt(r.profile);
        if (r.message) safeToast(showToast, r.message);
      })
      .catch(this.fail)
      .finally(() => {
        this.flairBusy = false;
      });
  };
  openSettings = (): void => this.setState({ modal: 'settings' });
  openSettingsFromMenu = (): void =>
    this.setState({ modal: 'settings', homeMenu: false });
  /** Opened from the pause menu mid-run, settings hands back to it. */
  closeSettings = (): void =>
    this.setState({ modal: this.state.phase === 'battle' ? 'pause' : null });
  /** Moderators only - the server checks again on every admin call. */
  openAdmin = (): void => {
    if (this.state.isMod) this.setState({ adminOpen: true, modal: null });
  };
  closeAdmin = (): void =>
    this.setState({ adminOpen: false, modal: 'settings' });
  setMusicVolume = (n: number): void =>
    this.applyVolumes({ ...this.state.volumes, music: n });
  setSfxVolume = (n: number): void =>
    this.applyVolumes({ ...this.state.volumes, sfx: n });
  resetVolumes = (): void => this.applyVolumes(DEFAULT_VOLUMES);
  private applyVolumes(v: Volumes): void {
    this.setState({ volumes: v });
    audio.setVolumes(v);
    saveVolumes(v);
  }

  /** The Devvit app version, and the client build it is serving. */
  versionInfo(): { app: string; build: string } {
    let app = 'dev';
    try {
      app = context.appVersion || app;
    } catch {
      /* no Devvit context outside the web view */
    }
    return {
      app,
      build: typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev',
    };
  }

  /* ---------- audio ---------- */

  /** The track for wherever the player is: the location's own theme on a run,
   *  the training theme in a duel, the home theme everywhere else. */
  private syncMusic(): void {
    const st = this.state;
    audio.music(
      st.phase === 'battle' || st.phase === 'end'
        ? regionBgm(locationById(st.locationId).region)
        : st.phase === 'duel'
          ? BGM.duel
          : BGM.main
    );
  }

  /** One delegated tick for every tappable control, so each of the screen's
   *  buttons does not need its own call. The board has no pointer cursor, so
   *  links are left to their own sounds. */
  private onUiClick = (e: MouseEvent): void => {
    const t = e.target;
    if (
      t instanceof Element &&
      t.closest('[style*="cursor: pointer"], .cursor-pointer')
    )
      audio.play('click', { gain: 0.6 });
  };
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

  pickTab = (t: GearTab) => (): void => this.setState({ tab: t });

  toggleGear = (id: string) => (): void => {
    this.setState((s) => {
      // Any tap hands the piece to the slots readout and dismisses the preview.
      const unchanged = { lastGear: id, peek: null, picked: s.picked };
      const i = s.picked.indexOf(id);
      if (i >= 0)
        return { ...unchanged, picked: s.picked.filter((_, j) => j !== i) };
      const g = GEAR_BY_ID[id];
      if (!g || s.picked.length >= 5) return unchanged;
      const sameEffect = s.picked.filter(
        (p) => GEAR_BY_ID[p]?.effect === g.effect
      ).length;
      if (sameEffect >= 2) return unchanged;
      return { ...unchanged, picked: s.picked.concat(id) };
    });
  };

  selectGear =
    (id: string) =>
    (e?: Stopper): void => {
      e?.stopPropagation?.();
      this.setState({ lastGear: id, peek: null });
    };
  clearSlot =
    (id: string) =>
    (e?: Stopper): void => {
      e?.stopPropagation?.();
      this.toggleGear(id)();
    };
  /** Step through the equipped slots, so reading each piece is arrow-key cheap. */
  pageSlot =
    (dir: number) =>
    (e?: Stopper): void => {
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
    (e?: Stopper): void => {
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
  intentEnter = this.hoverStatus('intent');
  intentLeave = this.hoverStatus(null);
  intentTap = this.toggleStatusTip('intent');

  /* ---------- the run ---------- */

  /** Build the run from a spec. The seed is the run's whole identity: it is
   *  what the server replays, so the spec kept here is what gets submitted. */
  private adoptRun(spec: RunSpec): RunState {
    this.runSpec = spec;
    this.run = new Run({ ...spec, mutators: MUTATORS });
    return this.run.start();
  }

  startRun = (): void => {
    if (this.state.picked.length !== 5) return;
    this.moves = [];
    const bs = this.adoptRun(this.currentRunSpec(newSeed()));
    this.setState({
      ...BATTLE_RESET,
      phase: 'battle',
      bs,
      ftueStep: this.state.profile.seenFtue ? null : 'orbs',
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
    void this.submitRun();
  };

  /**
   * Hand the run to the server. The transcript is what is sent - the score that
   * comes back is the server's, computed by replaying these same moves through
   * the same engine, and that is what the ladder and the wallet record.
   */
  private async submitRun(): Promise<void> {
    const spec = this.runSpec;
    if (!this.run || !spec || !this.moves.length) {
      this.setState({ coinsEarned: 0, runBanked: 'none' });
      return;
    }
    const moves = this.moves;
    this.moves = [];
    try {
      const res = await api.submitRun({ ...spec, moves });
      this.noteFlairs(res.profile);
      this.setState({
        profile: res.profile,
        leaderboard: res.leaderboard,
        coinsEarned: res.coinsEarned,
        runWon: res.won,
        ascended: res.ascended,
        heartPiecesEarned: res.heartPiecesEarned,
        runBanked: 'banked',
        runRank: res.rank,
        runBest: res.isBest,
      });
      this.refreshQuests();
    } catch (e) {
      // The run is over on screen either way; say plainly that it did not bank.
      this.setState({ coinsEarned: 0, runBanked: 'failed' });
      this.fail(e);
    }
  }

  /* ---------- input ---------- */

  private cellFromEvent(e: ReactPointerEvent): number | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const host = el?.closest?.('[data-cell]');
    return host ? Number(host.getAttribute('data-cell')) : null;
  }

  /** The board the player is currently dragging on - campaign wave or duel side.
   *  Every input handler goes through this so one gesture serves both modes. */
  private liveBoard(): number[] | null {
    if (this.state.phase === 'duel') return this.state.duel?.me.board ?? null;
    return this.state.bs?.board ?? null;
  }
  private boardIsLive(): boolean {
    const st = this.state;
    if (st.phase === 'duel')
      return !!st.duel && !st.duelOutcome && !st.busy && !this.duelFtuePaused();
    return st.phase === 'battle';
  }

  /** Shake a link the rules refused, then let it go. */
  private reject(move: number[]): void {
    audio.play('reject', { gain: 0.7 });
    this.setState({ rejecting: move.slice(), chain: [], preview: null });
    this.timers.after('reject', REJECT_MS, () =>
      this.setState({ rejecting: [] })
    );
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
    juice.bind(this);
    juice.link(1);
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
      juice.link(next.length, true);
      return;
    }
    if (chain.includes(i) || !areAdjacent(last, i)) return;
    const board = this.liveBoard();
    if (!board || isJunk(board[i]!)) return;
    if (orbTypeOf(board[i]!) !== orbTypeOf(board[chain[0]!]!)) return;
    const next = chain.concat([i]);
    this.setState({ chain: next, preview: this.previewFor(next) });
    // Each orb rings a little higher, so a long link climbs as it is drawn.
    juice.link(next.length);
  };

  onCancel = (): void => this.setState({ chain: [], preview: null });

  onUp = (): void => {
    const chain = this.state.chain;
    const board = this.liveBoard();
    if (chain.length === 0 || !board) return;
    const lone = chain.length === 1 && isSuper(board[chain[0]!]!);
    if (!lone && chain.length < MIN_LINK) {
      this.reject(chain);
      return;
    }
    if (this.state.phase === 'duel') this.resolveDuel('me', chain.slice());
    else this.resolve(chain.slice());
  };

  /** The preview for a link on whichever board is live. */
  previewFor(chain: number[]): Preview | null {
    const st = this.state;
    const board = this.liveBoard();
    if (!board) return null;
    if (st.phase === 'duel' && st.duel) {
      const me = st.duel.me;
      return linkPreview({
        chain,
        board,
        loadout: me.loadout,
        perk: HERO_PERKS[me.cls] ?? HERO_PERKS.Hero,
        sx: { ...NO_STATUS, ...me.stx },
        foeSx: { ...NO_STATUS, ...st.duel.foe.stx },
        duelling: true,
        mutators: MUTATORS,
      });
    }
    const sx = { ...NO_STATUS, ...(st.bs?.stx ?? {}) };
    return linkPreview({
      chain,
      board,
      loadout: this.loadout(),
      perk: this.perk(),
      sx,
      // A campaign Mark sits on the linker's own status block.
      foeSx: sx,
      duelling: false,
      mutators: MUTATORS,
    });
  }

  /* ---------- resolving a turn ---------- */

  resolve(move: number[]): void {
    const bs = this.state.bs;
    if (!this.run || !bs) return;
    const out = this.run.step(bs, move);
    if (!out) {
      this.reject(move);
      return;
    }
    // Recorded only once the engine has accepted it, so the transcript and the
    // board can never drift apart.
    this.moves.push(move.slice());

    // The drag step is completed by DOING it: record what the taught link
    // actually dealt, then move to the step that points at the HP bar.
    if (this.state.ftueStep === 'drag') {
      this.setState({
        ftueSample: { damage: out.attackDealt, killed: out.waveCleared },
      });
      this.timers.after('ftue', 900, this.advanceFtue);
    }
    const prevMon = this.waveDisplay(bs.wave);
    const land = () => this.landTurn(out, prevMon);

    this.timers.clear('link');
    if (out.detonators.length > 0) {
      this.playBlastStage(out, 0, land);
      return;
    }
    // Tiles pop in link order, and a chain long enough to forge a bomb plays
    // the forge beat first; juice returns how long each beat runs.
    juice.bind(this);
    const order = move.slice();
    const lo = this.loadout();
    const pal = paletteFor(lo);
    const info = (i: number) => {
      const t = orbTypeOf(bs.board[i]!);
      return { pal: pal[t], effect: lo[t]?.effect };
    };
    const begin = () => {
      this.setState({
        busy: true,
        clearing: out.cleared,
        clearOrder: order,
        chain: [],
        preview: null,
      });
      this.timers.after(
        'link',
        juice.resolve(order, out.cleared, info, 'main'),
        land
      );
    };
    if (out.superAfter !== null && out.superAfter !== undefined) {
      this.setState({ busy: true });
      this.timers.after(
        'forge',
        juice.forge(order, out.superAfter, 'main'),
        begin
      );
    } else begin();
  }

  /* Play the cascade STAGE BY STAGE. Each stage arms its detonators, blows
     them, then drops the survivors, so a blast that catches another bomb reads
     as a chain instead of resolving invisibly in one frame. The board shown
     between beats is that stage's recorded board; out.bs is applied once at the
     end, so the engine stays the single source of truth. */
  private playBlastStage(out: StepResult, n: number, land: () => void): void {
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
    if (n >= stages.length) {
      land();
      return;
    }
    const stg = stages[n]!;
    const next = () => this.playBlastStage(out, n + 1, land);
    this.setState({
      busy: true,
      arming: stg.detonators,
      blasting: [],
      detonating: [],
      clearing: n === 0 ? out.cleared : [],
      chain: [],
      preview: null,
    });
    this.timers.after('link', 320, () => {
      audio.play('bomb');
      juice.detonate(this.state.phase === 'duel' ? 'duel' : 'main');
      this.setState({
        arming: [],
        detonating: stg.detonators,
        blasting: stg.blasted,
        clearing: [],
      });
      this.timers.after('blast', 420, () => {
        if (n === stages.length - 1 || !stg.after.length) {
          next();
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
        this.timers.after('blast', 300, () => {
          this.setState({ kick: false });
          next();
        });
      });
    });
  }

  /** The player's payout lands; then, as its own announced beat, the swing. */
  private landTurn(
    out: StepResult,
    prevMon: ReturnType<typeof enemyDisplayFor>
  ): void {
    const lastStage = out.stages.length
      ? out.stages[out.stages.length - 1]!
      : null;
    const allCleared = lastStage ? lastStage.cleared : out.cleared;
    const struck = out.attackDealt > 0 || out.burnDealt > 0;
    if (out.waveCleared) {
      this.timers.clear('hpRoll');
      this.setState({ hpShown: 0 });
    } else this.rollHp(Math.max(0, out.bs.enemyHp));
    if (struck) audio.play('attack');
    if (out.blockGained > 0) audio.play('block');
    if (out.healed > 0) audio.play('heal');
    if (out.fired.length > 0) audio.play('rider', { gain: 0.7 });
    if (out.waveCleared) audio.play('kill');
    juice.bind(this);
    if (out.waveCleared) juice.impact('kill');
    else if (struck)
      juice.impact(
        out.attackDealt >=
          0.25 * (out.attackDealt + Math.max(0, out.bs.enemyHp))
          ? 'big'
          : 'hit'
      );
    juice.dropTicks(fallDistances(allCleared), 6);

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
      kick: out.detonators.length > 0,
      pops: runPops(out),
      // The swing is its own beat, so the player's HP readout is held at its
      // pre-swing value until that beat actually plays.
      pHpShown: out.enemyAttacked ? out.bs.playerHp + out.enemyDamage : null,
      hitWho: out.attackDealt > 0 ? 'monster' : null,
    }));

    this.timers.after('land', 520, () => {
      /* The monster's turn is a SEPARATE, announced beat: wind-up, then the
         hit. Resolving it inside the player's payout made the swing invisible
         - the HP just dropped with everything else. */
      if (!out.enemyAttacked) {
        this.finishTurn(out);
        return;
      }
      this.setState({
        pops: [],
        drop: null,
        kick: false,
        swing: out.enemyHeavy ? 'heavy' : 'attack',
      });
      this.timers.after('swing', 620, () => {
        audio.play(out.enemyDamage > 0 ? 'hurt' : 'blocked');
        if (out.enemyDamage > 0) juice.impact('hurt');
        this.setState({
          hitWho: 'player',
          pops: [swingPop(out.enemyDamage)],
          pHpShown: null,
          swing: 'landed',
          lastSwing: { damage: out.enemyDamage, blocked: out.enemyBlocked },
        });
        this.timers.after('swing', 560, () => this.finishTurn(out));
      });
    });
  }

  /** After the turn has played out: end the run, walk in the next wave, or
   *  hand the board back. */
  private finishTurn(out: StepResult): void {
    const stuck = !out.over && !out.battleWon && !hasAnyMove(out.bs.board);
    if (out.battleWon || out.over || stuck) {
      audio.play(out.battleWon ? 'victory' : 'defeat');
      this.setState({
        phase: 'end',
        endReason: out.battleWon ? 'won' : out.over ? 'dead' : 'stuck',
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
      void this.submitRun();
      return;
    }
    if (out.waveCleared) {
      // The kill lands, the fallen enemy plays out, the stage sits empty a
      // beat, then the next one walks in.
      this.setState({ pops: [], drop: null, kick: false });
      this.timers.after('spawn', 240, () => {
        this.setState({ monPhase: 'empty', dying: null });
        this.timers.after('spawn', 260, () => {
          this.setState({ monPhase: 'spawning' });
          this.rollHp(this.enemyAt(null, out.bs.wave).hp);
          this.timers.after('spawn', 460, () =>
            this.setState({ monPhase: null, busy: false, hitWho: null })
          );
        });
      });
      return;
    }
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

  /* ---------- duel ---------- */

  private duelRng(side: string): () => number {
    return (this.duelRngs[side] ??= mulberry32(newSeed()));
  }

  /* ---------- duel setup ---------- */

  /** The duel loadout as gear, or null while it is still unbuilt. */
  private duelLoadout(): Gear[] | null {
    const p = this.state.profile;
    if (!p.duelCls || !loadoutIsLegal(p.duelPicked, p.duelCls)) return null;
    const g = resolveLoadout(p.duelPicked);
    return g.length === 5 ? g : null;
  }

  /**
   * DUEL, from the bottom bar. A player with no duel loadout is sent to build
   * one first - the mode's first ask is the build, not a fight, because the
   * five you list are what other people's lobbies will hand their bot.
   */
  goDuelLobby = (): void => {
    if (!this.duelLoadout()) {
      this.enterDuelSetup();
      return;
    }
    this.setState({ phase: 'duelLobby', duelFoe: null, duelOutcome: null });
    void this.loadOpponents(this.state.duelCursor);
  };

  /** Borrow the hero and gear screens for the duel build, parking the run's own
   *  five so a duel rebuild never costs the player the run they had set up. */
  enterDuelSetup = (): void => this.openDuelSetup(null);

  /** EDIT on the pre-fight screen: the same build, but it hands back to that
   *  screen with the same opponent rather than dropping them in the lobby. */
  editDuelForFoe = (): void => this.openDuelSetup(this.state.duelFoe);

  private openDuelSetup(foe: DuelFoe | null): void {
    const p = this.state.profile;
    const cls = p.duelCls ?? this.state.heroClass;
    const picked =
      p.duelCls && loadoutIsLegal(p.duelPicked, p.duelCls)
        ? p.duelPicked.slice()
        : ownedLoadout(cls, p.gear);
    this.setState((st) => ({
      phase: 'hero',
      flow: 'duel',
      runSaved: st.runSaved ?? { cls: st.heroClass, picked: st.picked.slice() },
      heroClass: cls,
      picked,
      tab: 'attack',
      lastGear: null,
      peek: null,
      duelSetup: p.seenDuelSetup ? null : 0,
      homeMenu: false,
      duelFoe: foe,
    }));
  }

  /** Hand the screens back to the run, with the five it had before. */
  private restoreRunLoadout(): Pick<
    AppState,
    'flow' | 'runSaved' | 'heroClass' | 'picked' | 'duelSetup'
  > {
    const saved = this.state.runSaved;
    return {
      flow: 'run',
      runSaved: null,
      heroClass: saved ? saved.cls : this.state.heroClass,
      picked: saved ? saved.picked : this.state.picked,
      duelSetup: null,
    };
  }

  leaveDuelSetup = (): void =>
    this.setState((s) => ({
      ...this.restoreRunLoadout(),
      phase: s.duelFoe ? 'duelConfirm' : 'home',
      peek: null,
    }));

  goDuelOptIn = (): void => {
    if (this.state.picked.length !== 5) return;
    this.setState({ phase: 'duelOptIn', peek: null });
  };

  nextDuelSetup = (): void =>
    this.setState((s) =>
      s.duelSetup === null
        ? null
        : { duelSetup: Math.min(s.duelSetup + 1, DUEL_SETUP_STEPS.length - 1) }
    );

  skipDuelSetup = (): void => {
    this.setState({ duelSetup: null });
    this.markSeen('duelSetup');
  };

  /** The opt-in itself. Listing puts the five in the pool at this account's
   *  trophy count and shares a challenge post; staying out saves the loadout
   *  and nothing else - duelling still works either way. */
  private saveDuelLoadout(listed: boolean): void {
    if (this.state.duelSaving) return;
    const cls = this.state.heroClass;
    const picked = this.state.picked;
    if (!loadoutIsLegal(picked, cls)) return;
    const wasListed = this.state.profile.duelListed;
    this.setState({ duelSaving: true, duelSetup: null, enterConfirm: null });
    void api
      .saveDuelLoadout({ cls, picked, listed })
      .then((r) => {
        this.adopt(r.profile);
        this.setState((s) => ({
          ...this.restoreRunLoadout(),
          duelSaving: false,
          phase: s.duelFoe ? 'duelConfirm' : 'duelLobby',
          duelOutcome: null,
        }));
        void this.loadOpponents(0);
        // The challenge post goes up when a player ENTERS, not every time an
        // entered player tweaks their five.
        if (listed && !wasListed) this.postChallenge();
      })
      .catch((e) => {
        this.setState({ duelSaving: false });
        this.fail(e);
      });
  }

  /** ENTER on the opt-in step. Entering locks a player in until the reset, so
   *  it is asked twice - once on the page, once in the warning. Already in,
   *  the button only saves the new five. */
  listAndShare = (): void => {
    if (this.state.profile.duelListed) this.saveDuelLoadout(true);
    else this.setState({ enterConfirm: 'setup' });
  };
  saveUnlisted = (): void => this.saveDuelLoadout(false);

  /** ENTER from the lobby, for a player who saved a loadout for friendly duels. There is
   *  no way back out mid-week, so there is no toggle in the other direction. */
  toggleListed = (): void => {
    if (this.state.profile.duelListed) return;
    this.setState({ enterConfirm: 'lobby' });
  };

  cancelEnter = (): void => this.setState({ enterConfirm: null });

  confirmEnter = (): void => {
    const from = this.state.enterConfirm;
    if (from === 'setup') {
      this.saveDuelLoadout(true);
      return;
    }
    this.setState({ enterConfirm: null });
    void api
      .setDuelListed(true)
      .then((r) => {
        this.adopt(r.profile, r.message);
        void this.loadOpponents(this.state.duelCursor);
        if (r.profile.duelListed) this.postChallenge();
      })
      .catch(this.fail);
  };

  /** Share the challenge. A post is the only way this reaches people who are
   *  not already in the app, so it is its own action rather than a side effect
   *  the player cannot repeat. */
  postChallenge = (): void => {
    void api
      .duelChallenge()
      .then((r) => {
        this.setState({ challengeUrl: r.url });
        safeToast(showToast, 'Challenge posted. Tap VIEW POST to open it.');
      })
      .catch(this.fail);
  };

  openChallenge = (): void => {
    const url = this.state.challengeUrl;
    if (url) navigateTo(url);
  };

  /* ---------- the lobby ---------- */

  private async loadOpponents(cursor: number): Promise<void> {
    this.setState({ duelLoading: true });
    try {
      const r = await api.duelOpponents(cursor);
      this.setState({
        duelOpponents: r.opponents,
        duelCursor: cursor,
        duelPadded: r.padded,
        duelLoading: false,
      });
    } catch (e) {
      this.setState({ duelLoading: false });
      this.fail(e);
    }
  }

  /** REFRESH walks the window along rather than re-rolling it, so pressing it
   *  twice shows you two different neighbourhoods and not the same five. */
  refreshOpponents = (): void => {
    if (this.state.duelLoading) return;
    void this.loadOpponents(this.state.duelCursor + DUEL_LOBBY_SIZE);
  };

  /** Tapping a lobby row picks the opponent; the fight starts from the
   *  pre-fight screen, where both fives are laid side by side. */
  pickFoe = (foe: DuelFoe) => (): void =>
    this.setState({ phase: 'duelConfirm', duelFoe: foe, duelOutcome: null });

  /** COLLECT on the weekly prize. The payout already landed at the reset, so
   *  this only clears the notice - optimistically, since a failed write just
   *  means it shows once more. */
  dismissPrize = (): void => {
    this.setState((s) => ({ profile: { ...s.profile, duelPrize: null } }));
    void api
      .prizeSeen()
      .then((r) => this.adopt(r.profile))
      .catch(() => undefined);
  };

  openDuelRules = (): void => this.setState({ duelRulesOpen: true });
  closeDuelRules = (): void => this.setState({ duelRulesOpen: false });

  backToLobby = (): void => {
    this.setState({ phase: 'duelLobby', duelFoe: null });
    // Arriving from a challenge post skips the lobby, so it may never have loaded.
    if (!this.state.duelOpponents.length) void this.loadOpponents(0);
  };

  confirmDuel = (): void => {
    const foe = this.state.duelFoe;
    if (foe) this.startDuel(foe)();
  };

  startDuel = (foe: DuelFoe) => (): void => {
    const mine = this.duelLoadout();
    if (!mine) {
      this.openDuelSetup(foe);
      return;
    }
    this.duelRngs = {};
    this.duelStartedAt = Date.now();
    const p = this.state.profile;
    this.setState(
      {
        ...DUEL_RESET,
        phase: 'duel',
        duelFoe: foe,
        duelFtue: p.seenDuelFtue ? null : 0,
        duel: {
          me: makeDuelSide(
            p.duelCls ?? this.state.heroClass,
            mine,
            1,
            this.duelRng('me')
          ),
          foe: makeDuelSide(
            foe.cls,
            foeLoadout(foe.cls, foe.picked),
            foe.skill,
            this.duelRng('foe')
          ),
        },
      },
      // After commit: scheduleFoe reads `phase`, which is still the lobby's
      // until this update lands.
      () => {
        this.timers.every('duelTick', 1000, this.duelTick);
        this.scheduleFoe();
      }
    );
  };

  /* The primer pauses the clock and the foe, so nobody loses HP while reading. */
  private duelFtuePaused(): boolean {
    return this.state.duelFtue !== null;
  }
  nextDuelFtue = (): void => {
    const i = this.state.duelFtue;
    if (i === null) return;
    if (i + 1 >= DUEL_FTUE_STEPS.length) this.skipDuelFtue();
    else this.setState({ duelFtue: i + 1 });
  };
  skipDuelFtue = (): void => {
    this.setState({ duelFtue: null });
    this.markSeen('duel');
    this.scheduleFoe();
  };

  duelTick = (): void => {
    const st = this.state;
    if (st.phase !== 'duel' || !st.duel || st.duelOutcome) return;
    if (this.duelFtuePaused()) return;
    const clock = st.duelClock - 1;
    if (clock <= 0) {
      this.endDuel(st.duel.me.hp >= st.duel.foe.hp ? 'time-win' : 'time-loss');
      return;
    }
    this.setState({ duelClock: clock });
  };

  /* The foe runs on its own timer, independent of anything the player does. */
  private scheduleFoe(): void {
    this.timers.clear('duelBot');
    if (this.state.phase !== 'duel' || this.state.duelOutcome) return;
    const skill = this.state.duelFoe?.skill ?? 0.85;
    const wait =
      DUEL_THINK_MIN +
      Math.random() * DUEL_THINK_SPREAD +
      (1 - skill) * DUEL_THINK_SKILL;
    this.setState({ foeBeat: 'thinking', foeChain: [], foeSaid: '' });
    this.timers.after('duelBot', wait, this.runFoeMove);
  }

  runFoeMove = (): void => {
    const st = this.state;
    if (st.phase !== 'duel' || st.duelOutcome || !st.duel) return;
    // The primer holds the foe; check back rather than moving while it shows.
    if (this.duelFtuePaused()) {
      this.timers.after('duelBot', 320, this.runFoeMove);
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
    const line = duelLogLine(out, side === 'me' ? 'You' : name);
    const { mine, theirs } = duelPops(out, side);

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
      juice.bind(this);
      const order = move.slice();
      const dlo = st.duel.me.loadout;
      const dpal = paletteFor(dlo);
      const db = st.duel.me.board;
      const dinfo = (i: number) => {
        const t = orbTypeOf(db[i]!);
        return { pal: dpal[t], effect: dlo[t]?.effect };
      };
      this.setState({
        busy: true,
        clearing: out.cleared,
        clearOrder: order,
        chain: [],
        preview: null,
        duelHit: 'foe',
      });
      this.timers.after(
        'link',
        juice.resolve(order, out.cleared, dinfo, 'duel'),
        () => {
          this.pendingMe = false;
          if (out.attack > 0) audio.play('attack');
          if (out.blockGain > 0) audio.play('block');
          if (out.heal > 0) audio.play('heal');
          if (out.attack > 0) juice.impact('hit');
          juice.dropTicks(fallDistances(out.cleared), 6);
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
          this.timers.after('land', 520, () =>
            this.setState({ pops: [], foePops: [], drop: null, duelHit: null })
          );
        }
      );
      return;
    }

    /* A foe move plays in three announced beats - draw the link, clear it, then
       land the damage - so its play can actually be read. The board is locked
       for the duration, which is what keeps the two sides' writes serial. */
    this.setState({
      foeBeat: 'linking',
      foeChain: move.slice(),
      foeSaid: foeAnnouncement(out, name),
      foeJunk: out.junkSend,
      foeHitFor: out.attack,
    });
    const land = () => {
      // Board writes are serialised: if the player's move is mid-flight the
      // foe waits a beat rather than landing on a stale board.
      if (this.pendingMe) {
        this.timers.after('foeClear', 90, land);
        return;
      }
      if (out.attack > 0) audio.play('hurt');
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
      this.timers.after('foeLand', FOE_LAND_MS, () => {
        this.setState({
          pops: [],
          foePops: [],
          foeDrop: null,
          duelHit: null,
          foeBeat: 'idle',
        });
        finish();
      });
    };
    this.timers.after('foeLink', FOE_LINK_MS, () => {
      this.setState({ foeBeat: 'clearing', foeClearing: out.cleared });
      this.timers.after('foeClear', FOE_CLEAR_MS, land);
    });
  }

  private endDuel(kind: DuelEndKind): void {
    this.timers.clear(...DUEL_TIMERS);
    const won = kind === 'win' || kind === 'time-win' || kind === 'win-buried';
    audio.play(won ? 'victory' : 'defeat');
    const seconds = Math.round((Date.now() - this.duelStartedAt) / 1000);
    const ranked = this.state.profile.duelListed;
    // Shown immediately off the local result; the server's number replaces it
    // the moment it answers, so a slow network never holds up the panel.
    this.setState({
      duelOutcome: {
        kind,
        won,
        delta: !ranked ? 0 : won ? DUEL_WIN_TROPHIES : -DUEL_LOSS_TROPHIES,
        ranked,
      },
      busy: false,
    });
    const foe = this.state.duelFoe;
    void api
      .duelResult({
        foe: foe?.name ?? '',
        ...(foe && foe.kind === 'player' ? { foeId: foe.id } : {}),
        won,
        seconds,
      })
      .then((r) => {
        const before = this.state.profile.trophies;
        this.adopt(r.profile);
        this.setState((s) => ({
          duelOutcome: s.duelOutcome
            ? { ...s.duelOutcome, delta: r.profile.trophies - before }
            : s.duelOutcome,
        }));
        this.refreshQuests();
      })
      .catch(() => undefined);
  }

  duelAgain = (): void => {
    const f = this.state.duelFoe;
    if (!f || this.state.duelOutcome?.won) return;
    this.startDuel(f)();
  };

  leaveDuel = (): void => {
    this.timers.clear(...DUEL_TIMERS);
    this.setState({ phase: 'duelLobby', duelFoe: null, duelOutcome: null });
    // The result moved the trophy count, so the band the lobby matched against
    // is stale the moment the duel ends.
    void this.loadOpponents(this.state.duelCursor);
  };

  /* ---------- quests ---------- */

  goQuests = (): void => {
    this.setState({ phase: 'quests', shopMsg: null, homeMenu: false });
    this.refreshQuests();
  };
  pickQuestTab = (t: QuestTab) => (): void => this.setState({ questTab: t });

  /** Progress is banked server-side off runs, duels and packs, so the board is
   *  re-read after each of those rather than counted on the client. A failed
   *  read keeps the last board - it is only ever behind, never wrong. */
  private refreshQuests(): void {
    void api
      .quests()
      .then((r) => this.setState({ quests: r.board }))
      .catch(() => undefined);
  }

  claimQuest = (id: string, fxh?: QuestFx) => (): void => {
    if (this.state.questClaiming) return;
    this.setState({ questClaiming: id });
    void api
      .claimQuest(id)
      .then((r) => {
        fxh?.before?.(r);
        this.setState({ quests: r.board, questClaiming: null });
        audio.play('coins');
        this.adopt(r.profile, r.message);
        fxh?.after?.(r);
      })
      .catch((e) => {
        this.setState({ questClaiming: null });
        fxh?.fail?.();
        this.fail(e);
        this.refreshQuests();
      });
  };

  /* ---------- shop / bag / packs ---------- */

  goShop = (): void =>
    this.setState({ phase: 'shop', shopMsg: null, homeMenu: false });
  goInventory = (): void =>
    this.setState({ phase: 'inventory', homeMenu: false });
  pickShopTab = (t: ShopTab) => (): void =>
    this.setState({ shopTab: t, shopMsg: null });
  pickInvTab = (t: InvTab) => (): void =>
    this.setState({ invTab: t, cardInfo: null });
  inspectCard = (id: string) => (): void => this.setState({ cardInfo: id });
  closeCardInfo = (): void => this.setState({ cardInfo: null });

  buyCoins = (id: string, fxh?: WalletFx) => (): void => {
    const before = this.state.profile.coins;
    void api
      .buyCoins(id)
      .then((r) => {
        const gained = r.profile.coins - before;
        if (gained > 0) {
          audio.play('coins');
          fxh?.gained?.(gained);
        }
        this.adopt(r.profile, r.message);
      })
      .catch(this.fail);
  };
  /**
   * Gems are real money, so this hands off to Reddit and then gets out of the
   * way. The gems are credited by the fulfilment endpoint, off the order Reddit
   * has already charged for - all this does afterwards is re-read the wallet.
   */
  buyGems = (id: string, fxh?: WalletFx) => (): void => {
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
        if (gained > 0) {
          audio.play('coins');
          fxh?.gained?.(gained);
        }
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
  buyPack = (id: string, fxh?: PackFx) => (): void => {
    void api
      .buyPack(id)
      .then((r) => {
        this.adopt(r.profile, r.message);
        if (!r.message) {
          audio.play('coins');
          this.openPackFrom(id, 'shop', fxh?.rect ? fxh.rect() : null);
        } else fxh?.fail?.();
      })
      .catch((e: unknown) => {
        fxh?.fail?.();
        this.fail(e);
      });
  };

  openPack = (id: string) => (): void => this.openPackFrom(id, 'inventory');

  /** The roll happens on the server and is held there against a token; the
   *  cards only land in the collection when COLLECT presents that token back,
   *  so a half-watched open cannot half-apply. */
  private openPackFrom(
    id: string,
    from: 'shop' | 'inventory',
    fromRect: FxRect | null = null
  ): void {
    void api
      .openPack(id)
      .then((r) =>
        this.setState({
          phase: 'opening',
          openPack: {
            id,
            token: r.token,
            cards: toOpenCards(r.cards),
            shown: 0,
            torn: false,
            from,
            fromRect,
          },
        })
      )
      .catch(this.fail);
  }

  private updatePack(fn: (op: OpenState) => OpenState | null): void {
    const op = this.state.openPack;
    const next = op ? fn(op) : null;
    if (!next) return;
    this.setState({ openPack: next });
  }

  tearPack = (): void =>
    this.updatePack((op) => (op.torn ? null : { ...op, torn: true, shown: 1 }));
  revealNext = (): void =>
    this.updatePack((op) =>
      !op.torn
        ? { ...op, torn: true, shown: 1 }
        : op.shown >= op.cards.length
          ? null
          : { ...op, shown: op.shown + 1 }
    );
  revealAll = (): void =>
    this.updatePack((op) => ({ ...op, torn: true, shown: op.cards.length }));

  packSummary = packSummary;

  /** `hooks` comes from the pack stage, which flies the cards to the bag; a
   *  plain click passes the event, which is ignored. */
  collectPack = (hooks?: unknown): void => {
    const op = this.state.openPack;
    if (!op) return;
    const back = op.from === 'shop';
    const h = isCollectFx(hooks) ? hooks : null;
    if (op.mock) {
      this.setState({
        phase: back ? 'shop' : 'inventory',
        invTab: 'gear',
        openPack: null,
      });
      h?.after?.();
      return;
    }
    const summary = packSummary(op);
    void api
      .collectPack({ token: op.token })
      .then((r) => {
        h?.before(r);
        this.setState({
          phase: back ? 'shop' : 'inventory',
          invTab: 'gear',
          openPack: null,
        });
        this.adopt(r.profile, back ? summary : undefined);
        this.refreshQuests();
        h?.after?.(r);
      })
      .catch(this.fail);
  };

  /** Dev only: a mocked open of the given rarity - never touches the server
   *  roll, and COLLECT on it changes nothing. */
  previewOpen = (rarity: Rarity, dupe: boolean): void => {
    const pool = GEAR.filter((x) => x.rarity === rarity);
    const gear = pool[Math.floor(Math.random() * pool.length)] ?? GEAR[0];
    if (!gear) return;
    this.setState({
      phase: 'opening',
      homeMenu: false,
      openPack: {
        id: rarity === 'Common' ? 'base' : 'bronze',
        token: 'mock-' + Date.now(),
        mock: true,
        cards: [{ gear, isNew: !dupe, refund: dupe ? DUPE_COINS[rarity] : 0 }],
        shown: 0,
        torn: false,
        from: 'shop',
        fromRect: null,
      },
    });
  };

  /* ---------- FTUE ---------- */

  private markFtueSeen(): void {
    if (this.state.profile.seenFtue) return;
    this.setState((s) => ({ profile: { ...s.profile, seenFtue: true } }));
    this.markSeen('run');
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
    if (this.state.profile.seenFtue) {
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
    const spec = this.runSpec;
    if (!this.state.bs || !this.run || !spec || this.moves.length) return false;
    const loadout = this.loadout();
    if (!loadout.some((o) => o.effect === 'attack')) return false;
    // A re-deal consumes the run's RNG, so the seed must be re-rolled with it -
    // otherwise the server would replay the board the player never saw. Only
    // the seed changes: location, ascension and hearts must match what is
    // submitted.
    for (let tries = 0; tries < 80; tries++) {
      const candidate = { ...spec, seed: newSeed() };
      const start = new Run({ ...candidate, mutators: MUTATORS }).start();
      if (findAttackLink(start.board, loadout)) {
        this.setState({ bs: this.adoptRun(candidate) });
        return true;
      }
    }
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

  private ftueRef =
    (target: string) =>
    (el: HTMLElement | null): void => {
      this.ftueEls[target] = el;
    };
  setFtueMap = this.ftueRef('map');
  setFtueHero = this.ftueRef('hero');
  setFtueGear = this.ftueRef('gear');
  setFtueSlots = this.ftueRef('slots');
  setFtueBoard = this.ftueRef('board');
  setFtueEnemy = this.ftueRef('enemyHp');
  setFtueTrack = this.ftueRef('track');
  // Each screen's bottom action bar (map nav, hero CONTINUE, gear START). The
  // card must never sit on these, or the player cannot see how to move on.
  setFtueHomeNav = this.ftueRef('footer:home');
  setFtueHeroCta = this.ftueRef('footer:hero');
  setFtueGearCta = this.ftueRef('footer:gear');
  setFtueRoot = (el: HTMLElement | null): void => {
    this.ftueRoot = el;
  };
  setFtueCard = (el: HTMLElement | null): void => {
    this.ftueCard = el;
    // The card's own height settles a frame late (web fonts, the legend's gear
    // art), so re-measure whenever it changes size rather than trusting one shot.
    this.cardObs = reobserve(this.cardObs, el, this.measureFtue);
    if (el) requestAnimationFrame(this.measureFtue);
  };

  /** The card is MEASURED into place, not parked at a fixed offset: the monster
   *  sprite and the board both size off the viewport, so a fixed top would land
   *  the card on the very bar it points at. */
  measureFtue = (): void => {
    const step = this.state.ftueStep;
    if (!step || !this.ftueRoot || !this.ftueCard) return;
    const spec = FTUE_TARGET[step]!;
    const el = this.ftueEls[spec.target];
    if (!el) return;
    const arena = this.ftueRoot.getBoundingClientRect();
    const raw = el.getBoundingClientRect();
    const cardH = this.ftueCard.getBoundingClientRect().height;
    if (!arena.height || !raw.height) return;
    // The map is larger than the shell and dragged around inside it, so only
    // the part actually on screen counts as the target.
    const rect = {
      top: Math.max(raw.top, arena.top),
      bottom: Math.min(raw.bottom, arena.bottom),
      left: Math.max(raw.left, arena.left),
      right: Math.min(raw.right, arena.right),
    };
    // Usable area stops at the bottom action bar so the card never covers it.
    const footer = ['footer:home', 'footer:hero', 'footer:gear']
      .map((k) => this.ftueEls[k])
      .find((f) => f && f.isConnected);
    const floor = footer
      ? Math.min(arena.bottom, footer.getBoundingClientRect().top - 4)
      : arena.bottom;
    const roomAbove = rect.top - arena.top;
    const roomBelow = floor - rect.bottom;
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
    // Neither side may be able to hold a tall card (the legend step, or a
    // short desktop modal). Clamp so it stays between the top edge and the
    // action bar instead of sliding over either.
    const arrow = FTUE_ARROW_GAP + 16;
    const maxTop = Math.max(0, floor - arena.top - cardH - arrow);
    const minBottom = arena.bottom - floor;
    const offset =
      side === 'below'
        ? Math.min(offsetRaw, maxTop)
        : Math.max(
            minBottom,
            Math.min(offsetRaw, Math.max(0, arena.height - cardH - arrow))
          );
    const next: Place = {
      side,
      offset,
      hole: {
        top: rect.top - arena.top,
        left: rect.left - arena.left,
        w: rect.right - rect.left,
        h: rect.bottom - rect.top,
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
    return (
      <>
        <Screen v={buildView(this)} />
        {this.state.adminOpen && (
          <Suspense fallback={null}>
            <AdminPanel onClose={this.closeAdmin} />
          </Suspense>
        )}
      </>
    );
  }
}
