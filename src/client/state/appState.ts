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
  LeaderboardEntry,
  Profile,
  QuestBoard,
} from '../../shared/api.js';
import type { FtueStep } from '../ftue.js';

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
};
export type DuelEndKind =
  'win' | 'loss' | 'time-win' | 'time-loss' | 'win-buried' | 'loss-buried';
export type DuelOutcome = { kind: DuelEndKind; won: boolean; delta: number };
export type GearTab = 'attack' | 'block' | 'effect';
export type ShopTab = 'packs' | 'coins' | 'gems';
export type InvTab = 'packs' | 'gear';
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
  shopTab: ShopTab;
  invTab: InvTab;
  shopMsg: string | null;
  openPack: OpenState | null;

  /** Null until the first read lands; the nav dot and the tab both wait on it. */
  quests: QuestBoard | null;
  questTab: QuestTab;
  /** The quest whose claim is in flight, so a double tap cannot fire twice. */
  questClaiming: string | null;

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
  /** The lobby's how-duels-work sheet. */
  duelRulesOpen: boolean;

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
  pHpShown: null,
  monPhase: null,
  dying: null,
  swing: null,
  coinsEarned: 0,
  runWon: false,
  ascended: false,
  heartPiecesEarned: 0,
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
  lastGear: null,
  peek: null,
  cardInfo: null,
  shopTab: 'packs',
  invTab: 'packs',
  shopMsg: null,
  openPack: null,
  quests: null,
  questTab: 'daily',
  questClaiming: null,
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
  duelRulesOpen: false,
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
