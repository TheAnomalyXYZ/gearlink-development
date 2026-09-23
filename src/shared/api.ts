import type { HeroClass } from './engine/types.js';
import type { Hearts } from './engine/hearts.js';
import type { PulledCard } from './engine/economy.js';
import type { DuelFoe } from './engine/duel.js';

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
  /** The duel loadout, kept apart from the gauntlet one so climbing the ladder
   *  never means rebuilding the run you like. Null until it is first built. */
  duelCls: HeroClass | null;
  duelPicked: string[];
  /** Listed in the opponent pool: other players can draw you as a foe. Opting
   *  out does not stop you duelling, it only hides you from their lobbies. */
  duelListed: boolean;
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

export type InitResponse = {
  type: 'init';
  postId: string;
  profile: Profile;
  leaderboard: LeaderboardEntry[];
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
  coinsEarned: number;
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
  /** Echoed back on REFRESH to walk past the rows just shown. */
  cursor: number;
  /** True when the pool had nobody close and the list was padded with bots. */
  padded: boolean;
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
  /** Snoovatar, or empty when the account has none. */
  avatar: string;
  trophies: number;
  leagueName: string;
  leagueIcon: string;
  /** I, II or III - empty at Knight, which is a single rung. */
  leagueNumeral: string;
  leagueColor: string;
  leagueShade: string;
  /** The duellist's class, and the art and perk line that go with it. */
  cls: HeroClass;
  heroImg: string;
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

export type ChallengeResponse = {
  type: 'challengeCard';
  /** Null on an ordinary GearLink post, which shows the plain splash. */
  card: ChallengeCard | null;
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

export type ErrorResponse = { status: 'error'; message: string };
