import type { HeroClass } from './engine/types.js';
import type { PulledCard } from './engine/economy.js';

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
  /** Whether this account has been shown the first-run coaching. */
  seenFtue: boolean;
  seenDuelFtue: boolean;
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
};

export type SubmitRunResponse = {
  type: 'run';
  /** The score the server's replay produced. */
  score: number;
  waves: number;
  chain: number;
  coinsEarned: number;
  isBest: boolean;
  rank: number | null;
  profile: Profile;
  leaderboard: LeaderboardEntry[];
};

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

export type DuelResultRequest = {
  foe: string;
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
