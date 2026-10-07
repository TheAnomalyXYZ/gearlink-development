/**
 * The app's state shape, its starting value, and the partial resets the run and
 * the duel apply when they begin. Kept apart from the component so the shape can
 * be read (and extended) without scrolling past every behaviour that touches it.
 */
import {
  DUEL_MATCH_SECONDS,
  FIRST_LOCATION,
  NO_HEARTS,
} from '../../shared/engine/index.js';
import type {
  DuelFoe,
  DuelState,
  Gear,
  HeroClass,
  Mutators,
  RunState,
} from '../../shared/engine/index.js';
import type {
  ClaimQuestResponse,
  DailyBattle,
  LeaderboardEntry,
  Profile,
  ProfileResponse,
  QuestBoard,
  WarChest,
} from '../../shared/api.js';
import type { FtueStep } from '../ftue.js';
import { DEFAULT_VOLUMES } from '../audio/audio.js';
import type { Volumes } from '../audio/audio.js';
import type { FxRect } from '../fx/fx.js';
import type { Preview } from './feedback.js';

export type Phase =
  | 'splash'
  | 'home'
  | 'hero'
  | 'gear'
  | 'battle'
  | 'end'
  | 'shop'
  | 'quests'
  | 'inventory'
  | 'opening'
  | 'duelOptIn'
  | 'duelLobby'
  | 'duelConfirm'
  | 'duel';

export type Pop = { text: string; color: string; top: string };
export type Drop = { dist: number[]; gen: number; spawn: number | null };
export type Place = {
  side: 'above' | 'below';
  offset: number;
  hole: { top: number; left: number; w: number; h: number };
};
export type OpenCard = { gear: Gear; isNew: boolean; refund: number };
export type OpenState = {
  id: string;
  token: string;
  cards: OpenCard[];
  shown: number;
  torn: boolean;
  from: 'shop' | 'inventory';
  /** Where the bought pack sat in the shop, so the stage can fly it in. */
  fromRect?: FxRect | null;
  /** A dev preview open: nothing was rolled, so COLLECT has nothing to send. */
  mock?: boolean;
};
export type DuelEndKind =
  'win' | 'loss' | 'time-win' | 'time-loss' | 'win-buried' | 'loss-buried';
export type DuelOutcome = {
  kind: DuelEndKind;
  won: boolean;
  delta: number;
  /** False for a friendly duel, played without entering the week's league. */
  ranked: boolean;
};
export type GearTab = 'attack' | 'block' | 'effect';
export type ShopTab = 'packs' | 'coins' | 'gems';
export type InvTab = 'packs' | 'gear';
/** Bag > Gear filter chips: everything, only owned, or one effect kind. */
export type GearFilter = 'all' | 'owned' | 'attack' | 'block' | 'effect';
export type QuestTab = 'daily' | 'weekly';

export type AppState = {
  ready: boolean;
  fatal: string | null;
  profile: Profile;
  leaderboard: LeaderboardEntry[];

  phase: Phase;
  heroClass: HeroClass;
  tab: GearTab;
  picked: string[];
  bs: RunState | null;

  endT: number;
  coinsEarned: number;
  /** The war chest bonus the last banked battle was paid at, in percent. */
  chestBonusPct: number;
  endReason: 'dead' | 'stuck' | 'ended' | 'won' | null;

  /** The map node the next run is for. Chosen on the map, kept through the
   *  hero and gear steps, and sent with the transcript. */
  locationId: string;
  /** What the last submission said about the map: whether the boss fell, and
   *  whether that kill was The King's. */
  runWon: boolean;
  ascended: boolean;
  /** The pin whose detail panel is open on the map. Null is the bare map. */
  openLocation: string | null;
  /** Map viewport: the container's measured size, and how far the artwork has
   *  been panned within it. */
  mapW: number;
  mapH: number;
  mapX: number;
  mapY: number;

  /** Where the last run stands on this post's ladder, once the server says:
   *  'none' when there was nothing to submit, 'failed' when it did not bank. */
  runBanked: 'pending' | 'banked' | 'failed' | 'none';
  runRank: number | null;
  runBest: boolean;
  /** Pieces the last win dropped, for the end screen's readout. */
  heartPiecesEarned: number;
  /** An upgrade is in flight; the button stays inert until it lands. */
  heartUpgrading: boolean;

  boardW: number;
  boardH: number;
  chain: number[];
  busy: boolean;
  clearing: number[];
  hitWho: 'monster' | 'player' | null;
  drop: Drop | null;
  pops: Pop[];
  arming: number[];
  detonating: number[];
  blasting: number[];
  rejecting: number[];
  kick: boolean;
  slashGen: number;
  hpShown: number | null;
  /** The link as drawn, so tiles clear in the order they were linked. */
  clearOrder: number[];
  pHpShown: number | null;
  monPhase: 'dying' | 'empty' | 'spawning' | null;
  dying: { name: string; url: string; bg: string } | null;
  swing: 'attack' | 'heavy' | 'landed' | null;
  lastSwing: { damage: number; blocked: number } | null;
  hoverStatus: string | null;

  ftueStep: FtueStep | null;
  ftuePlace: Place | null;
  ftueSample: { damage: number; killed: boolean };

  preview: Preview | null;
  modal:
    | 'pause'
    | 'how'
    | 'board'
    | 'settings'
    | 'flair'
    | 'warchest'
    | null;
  /** This week's war chest, once the panel has fetched it. */
  warChest: WarChest | null;
  /** The donation in flight, so a double tap cannot give twice. */
  donating: number | null;
  homeMenu: boolean;
  /** Music and SFX slider values, 0-100. Read from browser storage on mount. */
  volumes: Volumes;

  lastGear: string | null;
  peek: string | null;
  cardInfo: string | null;
  shopTab: ShopTab;
  invTab: InvTab;
  gearFilter: GearFilter;
  shopMsg: string | null;
  openPack: OpenState | null;

  /** Null until the first read lands; the nav dot and the tab both wait on it. */
  quests: QuestBoard | null;
  questTab: QuestTab;
  /** The quest whose claim is in flight, so a double tap cannot fire twice. */
  questClaiming: string | null;

  /** Bumped to re-render when a crisp tile icon or an FX roller ticks. */
  crispGen: number;
  fxGen: number;
  /** The World Map has a location focused: the HUD and nav tuck away. */
  wmFocused: boolean;

  /* Which flow the hero and gear steps are serving. They are the same two
     screens either way; what changes is where the five they build ends up -
     in the run about to start, or in the duel loadout the ladder keeps. */
  flow: 'run' | 'duel';
  /** The run's own five, parked while the duel flow borrows the screens. */
  runSaved: { cls: HeroClass; picked: string[] } | null;
  duelSetup: number | null;
  duelSaving: boolean;
  duelOpponents: DuelFoe[];
  duelCursor: number;
  duelLoading: boolean;
  duelPadded: boolean;
  challengeUrl: string | null;
  /** The poster of the challenge post this app was opened from. Pinned to the
   *  top of the lobby for as long as the app is open. */
  challenger: DuelFoe | null;
  /** The Daily Battle of the post this app was opened from. Its location is
   *  open to the reader for as long as the app is open, even past their climb. */
  daily: DailyBattle | null;
  /** A moderator of this subreddit: settings offers them the admin panel. */
  isMod: boolean;
  adminOpen: boolean;
  /** The lobby's how-duels-work sheet. */
  duelRulesOpen: boolean;
  /** The lock-in warning before entering the week's league, and which screen
   *  asked for it: the setup's opt-in step, or the lobby's ENTER button. */
  enterConfirm: 'setup' | 'lobby' | null;

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
  foeDrop: Drop | null;
  foePops: Pop[];
  foeSaid: string;
  foeJunk: number;
  foeHitFor: number;
};

export const EMPTY_PROFILE: Profile = {
  username: '',
  coins: 0,
  gems: 0,
  trophies: 0,
  gear: {},
  packs: {},
  best: null,
  ascension: 0,
  progress: 0,
  heartPieces: 0,
  hearts: { ...NO_HEARTS },
  seenFtue: true,
  seenDuelFtue: true,
  seenDuelSetup: true,
  duelCls: null,
  duelPicked: [],
  duelListed: false,
  duelWeekDuels: 0,
  duelPrize: null,
  flairs: [],
  flair: null,
  donated: 0,
};

/** The design ships mutators as authoring knobs; this build runs the base rules. */
export const MUTATORS: Mutators = {
  swiftEnemy: false,
  noSupers: false,
  brittleBlock: false,
  chainFrenzy: false,
  glassKnight: false,
};

/** Every transient board effect, cleared. Both the run and the duel start
 *  from this, so a new board never inherits the last one's animation state. */
export const BOARD_FX_RESET = {
  chain: [],
  preview: null,
  busy: false,
  clearing: [],
  drop: null,
  pops: [],
} satisfies Partial<AppState>;

export const BATTLE_RESET = {
  ...BOARD_FX_RESET,
  endReason: null,
  hitWho: null,
  arming: [],
  detonating: [],
  blasting: [],
  rejecting: [],
  kick: false,
  slashGen: 0,
  hpShown: null,
  clearOrder: [],
  pHpShown: null,
  monPhase: null,
  dying: null,
  swing: null,
  coinsEarned: 0,
  chestBonusPct: 0,
  runWon: false,
  ascended: false,
  heartPiecesEarned: 0,
  runBanked: 'pending',
  runRank: null,
  runBest: false,
  ftuePlace: null,
  ftueSample: { damage: 0, killed: false },
} satisfies Partial<AppState>;

export const DUEL_RESET = {
  ...BOARD_FX_RESET,
  duelOutcome: null,
  duelTurns: 0,
  duelClock: DUEL_MATCH_SECONDS,
  duelLog: [],
  duelHit: null,
  foeBeat: 'thinking',
  foeChain: [],
  foeClearing: [],
  foeDrop: null,
  foePops: [],
  foeSaid: '',
} satisfies Partial<AppState>;

export const INITIAL_STATE: AppState = {
  ...BATTLE_RESET,
  ...DUEL_RESET,
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
  locationId: FIRST_LOCATION,
  openLocation: null,
  mapW: 0,
  mapH: 0,
  mapX: 0,
  mapY: 0,
  heartUpgrading: false,
  boardW: 0,
  boardH: 0,
  lastSwing: null,
  hoverStatus: null,
  ftueStep: null,
  modal: null,
  homeMenu: false,
  volumes: DEFAULT_VOLUMES,
  lastGear: null,
  peek: null,
  cardInfo: null,
  shopTab: 'packs',
  invTab: 'packs',
  gearFilter: 'all',
  shopMsg: null,
  openPack: null,
  quests: null,
  questTab: 'daily',
  questClaiming: null,
  warChest: null,
  donating: null,
  crispGen: 0,
  fxGen: 0,
  wmFocused: false,
  flow: 'run',
  runSaved: null,
  duelSetup: null,
  duelSaving: false,
  duelOpponents: [],
  duelCursor: 0,
  duelLoading: false,
  duelPadded: false,
  challengeUrl: null,
  challenger: null,
  daily: null,
  isMod: false,
  adminOpen: false,
  duelRulesOpen: false,
  enterConfirm: null,
  duel: null,
  duelFoe: null,
  duelFtue: null,
  duelW: 0,
  duelH: 0,
  duelMini: 18,
  duelStacked: false,
  foeJunk: 0,
  foeHitFor: 0,
};

/* Hooks the FX layer (src/client/fx) hands to the shop, quest and pack
   actions, so the animation can bracket the server round-trip. */
export type QuestFx = {
  before?: (r: ClaimQuestResponse) => void;
  after?: (r: ClaimQuestResponse) => void;
  fail?: () => void;
};
export type WalletFx = { gained?: (amount: number) => void };
export type PackFx = { rect?: () => FxRect | null; fail?: () => void };
export type CollectFx = {
  before: (r: ProfileResponse) => void;
  after?: (r?: ProfileResponse) => void;
};
export const isCollectFx = (x: unknown): x is CollectFx =>
  typeof x === 'object' &&
  x !== null &&
  'before' in x &&
  typeof x.before === 'function';
