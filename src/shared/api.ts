import type { HeroClass } from './engine/types.js';
import type { Hearts } from './engine/hearts.js';
import type { PulledCard } from './engine/economy.js';
import type { DuelFoe } from './engine/duel.js';
import type { SeasonPrize } from './engine/season.js';
import type { QuestPeriod, QuestReward } from './engine/quests.js';

/** Everything the client needs to boot: who the player is, what they own, and
 *  where this post's ladder currently stands. */
export type Profile = {
  username: string;
  coins: number;
  gems: number;
  trophies: number;
  /** cardId -> copies owned. */
  gear: Record<string, number>;
  /** packId -> unopened count. */
  packs: Record<string, number>;
  best: BestRun | null;
  /** How many times The King has fallen. Scales every battle on the map. */
  ascension: number;
  /** Unspent heart pieces. A shared pool: three of them buy one container for
   *  whichever class you choose. */
  heartPieces: number;
  /** Heart containers applied, PER CLASS - building a hero up is a choice, so
   *  swapping class does not carry the pool with it. */
  hearts: Hearts;
  /** How far along the map this ascension has got: locations 0..progress are
   *  open, and progress === LOCATIONS.length means the map is finished. */
  progress: number;
  /** Whether this account has been shown the first-run coaching. */
  seenFtue: boolean;
  seenDuelFtue: boolean;
  /** Whether the duel SETUP flow (hero, five, opt-in) has been walked once. */
  seenDuelSetup: boolean;
  /** The duel loadout, kept apart from the run one so climbing the ladder
   *  never means rebuilding the run you like. Null until it is first built. */
  duelCls: HeroClass | null;
  duelPicked: string[];
  /** Listed in the opponent pool: other players can draw you as a foe. Opting
   *  out does not stop you duelling, it only hides you from their lobbies. */
  duelListed: boolean;
  /** Duels reported this week - the weekly prize needs SEASON_MIN_DUELS. */
  duelWeekDuels: number;
  /** Last week's league prize, already paid, until the notice is dismissed. */
  duelPrize: SeasonPrize | null;
  /** Ids of the subreddit flairs this player has unlocked, kept for good. */
  flairs: string[];
  /** The unlocked flair this player chose to wear, or null for none. */
  flair: string | null;
  /** Coins this player has given to the subreddit's war chest, over all weeks. */
  donated: number;
};

export type BestRun = {
  score: number;
  waves: number;
  chain: number;
  hero: HeroClass;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  waves: number;
  chain: number;
  hero: HeroClass;
  /** True for the row belonging to the player asking. */
  isYou: boolean;
};

/** A Daily Battle post's fight: its number and the location it is fought at. */
export type DailyBattle = { day: number; locationId: string };

export type InitResponse = {
  type: 'init';
  postId: string;
  profile: Profile;
  leaderboard: LeaderboardEntry[];
  /** The duellist who made this post, when it is a challenge post the reader
   *  did not make themself. Opening it goes straight to the duel. */
  challenger: DuelFoe | null;
  /** The Daily Battle this post holds, when it is one. Opening it goes
   *  straight to that fight, even past the reader's own climb. */
  daily: DailyBattle | null;
  /** Moderators of the subreddit get the admin panel in settings. */
  isModerator: boolean;
  /** True on a War Chest post: opening it goes straight to the chest. */
  warChestPost: boolean;
};

/** A finished run, as the client played it. The server re-runs the moves; the
 *  client never reports its own score. */
export type SubmitRunRequest = {
  seed: number;
  heroClass: HeroClass;
  picked: string[];
  moves: number[][];
  /** Which location was fought. */
  locationId: string;
  /** The ascension the client played at. It has to match the profile, or the
   *  replay would be scored against different monsters than were fought. */
  ascension: number;
  /** Heart containers the chosen class has. Checked against the profile. */
  hearts: number;
};

export type SubmitRunResponse = {
  type: 'run';
  /** The score the server's replay produced, scaled by map depth and ascension. */
  score: number;
  waves: number;
  chain: number;
  /** Already includes the war chest's bonus. */
  coinsEarned: number;
  /** The war chest bonus this battle was paid at, in percent; 0 for none. */
  chestBonusPct: number;
  isBest: boolean;
  rank: number | null;
  /** The location's boss fell. */
  won: boolean;
  /** How many waves the battle held, for the end screen's "3/4" readout. */
  waveCount: number;
  /** True when this win was The King's: the map resets one ascension higher. */
  ascended: boolean;
  /** Heart pieces the boss dropped. Only a location's FIRST clear this
   *  ascension pays, so a cleared location cannot be farmed. */
  heartPiecesEarned: number;
  profile: Profile;
  leaderboard: LeaderboardEntry[];
};

/** Spend three pieces on one more container for this class. */
export type ApplyHeartRequest = { cls: HeroClass };

export type BuyPackRequest = { packId: string };
export type OpenPackRequest = { packId: string };

export type OpenPackResponse = {
  type: 'openPack';
  packId: string;
  cards: PulledCard[];
  /** The nonce this open is held under; COLLECT must echo it back. */
  token: string;
};

export type CollectPackRequest = { token: string };

export type BuyBundleRequest = { bundleId: string };

export type SaveDuelLoadoutRequest = {
  cls: HeroClass;
  picked: string[];
  /** Whether to list this loadout in the opponent pool. */
  listed: boolean;
};

export type DuelListedRequest = { listed: boolean };

/** One lobby row. `isYou` never appears here - the pool excludes the asker. */
export type DuelOpponentsResponse = {
  type: 'opponents';
  opponents: DuelFoe[];
  /** True when the pool had nobody close and the list was padded with bots. */
  padded: boolean;
  /** Free REFRESHes left today. At 0, each one costs `refreshCost` coins. */
  freeRefreshes: number;
  refreshCost: number;
};

/** REFRESH: the next window, and the wallet it may have been paid from. */
export type DuelRefreshResponse = Omit<DuelOpponentsResponse, 'type'> & {
  type: 'refresh';
  profile: Profile;
};

export type DuelChallengeResponse = {
  type: 'challenge';
  /** Permalink of the post that was created. */
  url: string;
};

/**
 * What the inline view of a CHALLENGE post draws.
 *
 * Every image url is resolved on the SERVER. The feed view has to stay small -
 * no engine, no card table - so it is handed finished paths rather than the ids
 * it would need the gear and rank tables to turn into art.
 */
export type ChallengeCard = {
  /** Reddit handle, without the u/ prefix. */
  username: string;
  /** Snoovatar, or empty when the account has none - the card then draws
   *  Reddit's default snoo, never the game's class art. */
  avatar: string;
  trophies: number;
  leagueName: string;
  leagueIcon: string;
  /** I, II or III - empty at Knight, which is a single rung. */
  leagueNumeral: string;
  leagueColor: string;
  leagueShade: string;
  /** The duellist's class and the perk line that goes with it. */
  cls: HeroClass;
  heroPerk: string;
  /** Their five, as art plus the orb colour each becomes on the board. */
  gear: { icon: string; tint: string; name: string }[];
};

/** The reader of a challenge post, as the card draws them on the open side.
 *  Null when the feed view is being shown to a logged-out visitor, who gets
 *  the anonymous placeholder instead of a face. */
export type ChallengeViewer = {
  /** Reddit handle, without the u/ prefix. */
  username: string;
  /** Snoovatar, or empty when the account has none. */
  avatar: string;
};

/**
 * What the inline view of a Daily Battle post draws: the day's poster. Like
 * the challenge card, every path is finished on the server so the feed view
 * needs no engine.
 */
export type DailyPoster = {
  /** Daily Battle number, counted from the first one. */
  day: number;
  /** Short date for the chip, e.g. "OCT 1". */
  dateLabel: string;
  /** Three-letter UTC weekday of the post's day, e.g. "THU". */
  weekday: string;
  /** When the day's battle closes: the UTC midnight after its day, in ms. */
  endsAt: number;
  /** The foe on the poster, the stage it stands on, and its light. */
  foe: string;
  foeArt: string;
  region: string;
  backdrop: string;
  accent: string;
  tagline: string;
  /** The top of this post's own ladder, best first. Empty when nobody has run.
   *  `avatar` is the player's snoovatar, '' when Reddit has none. */
  top: { username: string; score: number; avatar: string }[];
  /** How many players are on this post's ladder. */
  players: number;
};

export type ChallengeResponse = {
  type: 'challengeCard';
  /** Null on any post that is not a challenge. */
  card: ChallengeCard | null;
  /** The day's poster on a Daily Battle post. Null on any other post - a
   *  challenge post draws `card`, and a general post draws the plain splash. */
  poster: DailyPoster | null;
  /** The chest on a War Chest post. Null on any other post. */
  chest: WarChestPost | null;
  /** Who is reading, when Reddit says. Null for a logged-out visitor. */
  viewer: ChallengeViewer | null;
};

export type DuelResultRequest = {
  foe: string;
  /** Reddit user id of the opponent, when it was a listed player. */
  foeId?: string;
  won: boolean;
  /** Seconds the match lasted, used to reject instantly-reported wins. */
  seconds: number;
};

export type ProfileResponse = {
  type: 'profile';
  profile: Profile;
  message?: string;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  leaderboard: LeaderboardEntry[];
};

/** One row of the quest board, resolved against this player's progress. */
export type QuestView = {
  id: string;
  period: QuestPeriod;
  title: string;
  blurb: string;
  /** Capped at `target`. */
  progress: number;
  target: number;
  reward: QuestReward;
  claimed: boolean;
  claimable: boolean;
};

export type QuestBoard = {
  /** Sorted: claimable, then in progress, then claimed. */
  daily: QuestView[];
  weekly: QuestView[];
  /** When each set rolls over, in epoch ms (UTC midnight / Monday). */
  dailyResetAt: number;
  weeklyResetAt: number;
};

export type QuestsResponse = { type: 'quests'; board: QuestBoard };

export type ClaimQuestRequest = { questId: string };

export type ClaimQuestResponse = {
  type: 'questClaim';
  profile: Profile;
  board: QuestBoard;
  message: string;
};

/** One named donor on the war chest. */
export type WarChestDonor = {
  username: string;
  amount: number;
  /** True for the row belonging to the player asking. */
  isYou: boolean;
};

/** This week's war chest, as the asking player sees it. The tiers themselves
 *  are static and live in `shared/engine/warchest.ts`. */
export type WarChest = {
  /** Which week this is, counted the way `duelWeekOf` counts. */
  week: number;
  /** Coins in the chest this week. */
  total: number;
  /** The battle-coin bonus live right now, in percent. */
  bonusPct: number;
  /** What the asking player has given this week. */
  yours: number;
  /** Biggest donors this week, biggest first. */
  top: WarChestDonor[];
  /** How many players have given anything this week. */
  donors: number;
  /** When the chest empties, in epoch ms (Monday 00:00 UTC). */
  resetAt: number;
};

/** What the inline view of a War Chest post draws. */
export type WarChestPost = {
  /** The chest of the week the post was made for. */
  chest: WarChest;
  /** That week is over: the post shows its final tally, and giving goes to
   *  the current week's chest from inside the game. */
  ended: boolean;
  /** The reader's wallet, or null for a logged-out visitor. */
  coins: number | null;
};

export type WarChestResponse = { type: 'warChest'; chest: WarChest };

export type DonateRequest = { amount: number };

export type DonateResponse = {
  type: 'warChestDonate';
  chest: WarChest;
  profile: Profile;
  message: string;
};

/** Wear an unlocked flair in the subreddit, or null to take it off. */
export type EquipFlairRequest = { flairId: string | null };

export type ErrorResponse = { status: 'error'; message: string };
