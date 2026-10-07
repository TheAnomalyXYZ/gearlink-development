/**
 * Subreddit user flair, earned by play.
 *
 * Like quests, the catalogue is static and only what each player has UNLOCKED
 * lives in Redis. Every unlock rule reads facts the server already holds about
 * the player (its own replayed runs, its own trophy count), so a flair can never
 * be earned by anything the client merely claims.
 *
 * An unlock is kept for good once earned. Trophies fall at the weekly reset and
 * a fresh ascension walks the map back to zero, but the flair that marked
 * getting there stays the player's to wear.
 *
 * Wearing one is a separate choice: the player picks it from what they have
 * unlocked, and the server sets it as their flair in the subreddit.
 */
import { PATRON_DONATED } from './warchest.js';

export type FlairTextColor = 'dark' | 'light';

/** What a flair asks of a player. Each kind is a threshold on one fact. */
export type FlairUnlock =
  /** Open to everyone who has played. */
  | { kind: 'free' }
  /** Locations taken on the current climb. */
  | { kind: 'progress'; min: number }
  /** Times The King has fallen. */
  | { kind: 'ascension'; min: number }
  /** Best run score. */
  | { kind: 'bestScore'; min: number }
  /** Longest link in the best run. */
  | { kind: 'bestChain'; min: number }
  /** Duel trophies, as currently held. */
  | { kind: 'trophies'; min: number }
  /** Coins given to the subreddit's war chest, over all weeks. */
  | { kind: 'donated'; min: number };

export type FlairDef = {
  /** Stored against unlocks, so a retuned flair keeps its id and one that is
   *  replaced gets a new one. */
  id: string;
  /** Shown on Reddit next to the player's name. Reddit caps this at 64. */
  text: string;
  /** How the unlock reads in the picker. */
  blurb: string;
  unlock: FlairUnlock;
  textColor: FlairTextColor;
  /** A hex colour, or 'transparent'. */
  backgroundColor: string;
  /** A subreddit flair template to apply instead of free text, when the mods
   *  have made one. Templates differ per subreddit, so this is optional. */
  templateId?: string;
};

/** The facts a flair can be unlocked by, read off the player's profile. */
export type FlairFacts = {
  progress: number;
  ascension: number;
  bestScore: number;
  bestChain: number;
  trophies: number;
  donated: number;
};

export const FLAIR_TEXT_MAX = 64;

/**
 * PLACEHOLDER catalogue - the real set is still to be decided. These exist so
 * the unlock, picker and Reddit plumbing can be exercised end to end.
 */
export const FLAIRS: FlairDef[] = [
  {
    id: 'apprentice',
    text: 'Apprentice Smith',
    blurb: 'Play GearLink.',
    unlock: { kind: 'free' },
    textColor: 'dark',
    backgroundColor: '#B5C0FF',
  },
  {
    id: 'kingslayer',
    text: 'Kingslayer',
    blurb: 'Defeat The King.',
    unlock: { kind: 'ascension', min: 1 },
    textColor: 'dark',
    backgroundColor: '#FFC24B',
  },
  {
    id: 'patron',
    text: 'War Chest Patron',
    blurb: 'Give ' + PATRON_DONATED.toLocaleString('en-US') + ' coins to the war chest.',
    unlock: { kind: 'donated', min: PATRON_DONATED },
    textColor: 'dark',
    backgroundColor: '#AEE45D',
  },
];

export const flairById = (id: string): FlairDef | null =>
  FLAIRS.find((f) => f.id === id) ?? null;

export const flairUnlocked = (def: FlairDef, facts: FlairFacts): boolean => {
  const u = def.unlock;
  switch (u.kind) {
    case 'free':
      return true;
    case 'progress':
      return facts.progress >= u.min;
    case 'ascension':
      return facts.ascension >= u.min;
    case 'bestScore':
      return facts.bestScore >= u.min;
    case 'bestChain':
      return facts.bestChain >= u.min;
    case 'trophies':
      return facts.trophies >= u.min;
    case 'donated':
      return facts.donated >= u.min;
  }
};

/** Flairs the facts earn that are not already in `owned`, in catalogue order. */
export const newlyUnlockedFlairs = (
  facts: FlairFacts,
  owned: readonly string[]
): string[] =>
  FLAIRS.filter((f) => !owned.includes(f.id) && flairUnlocked(f, facts)).map(
    (f) => f.id
  );
