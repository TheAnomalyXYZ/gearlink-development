/**
 * DUEL - sabotage rules. No monsters, no waves: two boards, two HP pools, both
 * sides linking on the SAME clock.
 *   - attack links hit THEIR hp
 *   - block links soak the hit coming back at you
 *   - heal links restore your own
 *   - any link of 5+ dumps JUNK orbs into their grid
 * Junk cannot be linked. It only cracks when a clear happens orthogonally
 * beside it, so a grid full of junk is a grid with no moves - that is the
 * pressure, and running out of legal links loses on the spot.
 */
import {
  areAdjacent,
  bombCells,
  chainType,
  clearAndCollapse,
  colOf,
  isJunk,
  isSuper,
  magnitudeFor,
  orbTypeOf,
  randOrb,
  rowOf,
} from './board.js';
import {
  BOMB_CENTER_MULT_X100,
  BOMB_MULT_X100,
  CELLS,
  GRID_COLS,
  GRID_ROWS,
  JUNK_FLAG,
  MAX_DETONATION_STAGES,
  MIN_LINK,
  REFILL_WEIGHT,
  SUPER_FLAG,
  SUPER_MIN_LINK,
} from './constants.js';
import {
  HERO_PERKS,
  NO_STATUS,
  defaultLoadout,
  loadoutIsLegal,
  markMultX100,
  resolveLoadout,
  riderOf,
} from './gear.js';
import type { Gear, HeroClass, Mutators, Rider, Status } from './types.js';
import { LEAGUES, TOP_LEAGUE, TROPHY_FLOOR, tierRange } from './league.js';
import { NO_MUTATORS } from './run.js';

export const DUEL_HP = 60;
export const DUEL_JUNK_MIN_LINK = 5;
export const DUEL_JUNK_CAP = 5;
export const DUEL_BOMB_JUNK = 2;
export const DUEL_MATCH_SECONDS = 180;

/** Real time, not turns: both duellists act on the same clock. The foe is an
 *  AI, so a turn timer only ever punished the human - instead the AI pays for
 *  its move in thinking time, the way a person would. */
export const DUEL_THINK_MIN = 1500;
export const DUEL_THINK_SPREAD = 1500;
export const DUEL_THINK_SKILL = 1300;
/** Beat lengths for a foe move, so its play is readable rather than instant. */
export const FOE_LINK_MS = 800;
export const FOE_CLEAR_MS = 460;
export const FOE_LAND_MS = 780;

export const DUEL_WIN_TROPHIES = 22;
export const DUEL_LOSS_TROPHIES = 12;
/** Below this arena height two equal boards would both be tiny, so the duel
 *  falls back to one full-size player board and a thumbnail of theirs. */
export const DUEL_STACK_MIN_H = 576;

/** Junk reuses the library's Ignore sprite - there is no junk art in the
 *  collection, and "ignore" is the right read for a tile you cannot link. */
export const JUNK_ICON = '/art/PocketKnights/Battle/Effects/Ignore.png';

/** Junk is ARMOURED: a clear beside it only cracks it, and only an orthogonal
 *  clear counts. Two passes to break one cell, or a bomb through it. The value
 *  carries the damage taken, so 200 is fresh and 201 is cracked. */
export const JUNK_HP = 2;
export const junkDamage = (v: number) => v - JUNK_FLAG;

/** Junk sent by a link of this length. */
export const junkFor = (len: number): number =>
  len < DUEL_JUNK_MIN_LINK
    ? 0
    : Math.min(DUEL_JUNK_CAP, len - (DUEL_JUNK_MIN_LINK - 1));

/**
 * An opponent in the lobby. A duel is always played against the LOCAL bot -
 * there is no live socket between two Reddit clients - but who that bot is
 * playing as changes: `kind: 'player'` carries a real, opted-in Reddit
 * account's duel loadout, avatar and trophy count, and the bot drives their
 * kit on their behalf. `kind: 'bot'` is the house roster, used to pad the
 * list out when the pool has nobody at your rating yet.
 */
export type DuelFoe = {
  kind: 'player' | 'bot';
  /** Reddit user id for a player, the roster id for a bot. */
  id: string;
  /** Reddit handle for a player (no u/ prefix), the bot's name otherwise. */
  name: string;
  cls: HeroClass;
  /** Trophies. Named `rating` since the arena header has always called it that. */
  rating: number;
  skill: number;
  blurb: string;
  /** Snoovatar for a player; empty for a bot, which falls back to class art. */
  avatar: string;
  /** Their five gear ids. Empty means "use the class default". */
  picked: string[];
};

/** The span of the ladder, Bronze 1's floor to Knight's - what a rating is
 *  measured against, so the numbers below move with the league table instead
 *  of hard-coding its ends twice. */
const LADDER_SPAN = TOP_LEAGUE.floor - TROPHY_FLOOR;

/** How well the bot plays a player's kit, by how far up the ladder they sit.
 *  A duel against someone's loadout should get harder as you climb, without
 *  the lobby needing to store a skill rating nobody earned. */
export const skillForTrophies = (trophies: number): number => {
  const up = Math.max(0, Math.min(LADDER_SPAN, trophies - TROPHY_FLOOR));
  return 0.62 + (up / LADDER_SPAN) * 0.35;
};

const BOT_NAMES = [
  'Sledge',
  'Quillon',
  'Emberwright',
  'Tallow',
  'Rookvane',
  'Coilspur',
  'Mirelight',
  'Harrowgate',
  'Voss',
  'Pellingrove',
  'Stagwick',
  'Thornmere',
  'Brackwater',
  'Ashcombe',
  'Gildrey',
  'Morrow',
  'Kestrel',
  'Dunhallow',
  'Ironsides',
  'Wrenfield',
  'Calder',
  'Oakhollow',
  'Sable',
  'Fennick',
  'Graymantle',
  'Hollis',
  'Blackthorn',
  'Vesper',
];
const BOT_BLURBS = [
  'Trades blows. Blocks late.',
  'Hunts long links for the junk.',
  'Burns, then buries you in junk.',
  'Digs out fast. Punishes a slow board.',
  'Holds block, then swings for the kill.',
  'Sends junk before it sends damage.',
];
const BOT_CLASSES: HeroClass[] = ['Hero', 'Archer', 'Mage'];

/** House bots per tier, Bronze up to Knight. Weighted to the bottom: the low
 *  tiers are where a new subreddit has nobody listed yet, and a player has to
 *  be able to climb out of Bronze without waiting for one. Higher up, the
 *  lobby leans on real duellists and the bots are only a last resort. */
export const BOTS_PER_TIER = [8, 6, 5, 4, 3, 2];

/** Knight has no ceiling; its bots spread over this many trophies above it. */
const KNIGHT_BOT_SPAN = 400;

/** The house roster, spread across every tier's levels so a lobby in any tier
 *  can always be filled. Deterministic: the same slot is always the same foe,
 *  so a refresh reshuffles who you see rather than reinventing them. */
export const DUEL_BOTS: DuelFoe[] = (() => {
  const out: DuelFoe[] = [];
  const tierFloors = LEAGUES.filter((l) => l.level <= 1);
  let n = 0;
  tierFloors.forEach((lo, t) => {
    const { min, max } = tierRange(lo.floor);
    const span = Number.isFinite(max) ? max - min : KNIGHT_BOT_SPAN;
    const count = BOTS_PER_TIER[t] ?? 1;
    for (let j = 0; j < count; j++, n++) {
      const name = BOT_NAMES[n % BOT_NAMES.length]!;
      const rating = min + Math.round(((j + 0.5) / count) * span);
      out.push({
        kind: 'bot',
        id: 'bot:' + name.toLowerCase(),
        name,
        cls: BOT_CLASSES[n % BOT_CLASSES.length]!,
        rating,
        skill: skillForTrophies(rating),
        blurb: BOT_BLURBS[n % BOT_BLURBS.length]!,
        avatar: '',
        picked: [],
      });
    }
  });
  return out;
})();

/** The house bots in the same tier as `trophies`, nearest first. */
export const botsInTier = (trophies: number): DuelFoe[] => {
  const { min, max } = tierRange(trophies);
  return DUEL_BOTS.filter((b) => b.rating >= min && b.rating <= max).sort(
    (a, b) => Math.abs(a.rating - trophies) - Math.abs(b.rating - trophies)
  );
};

/** How many opponents the lobby shows at once. */
export const DUEL_LOBBY_SIZE = 5;

/** Lobby REFRESHes a player gets free each UTC day. Past that, each one costs
 *  DUEL_REFRESH_COST coins, so walking the whole tier for the weakest name in
 *  it is a price, not a habit. */
export const DUEL_FREE_REFRESHES = 5;
export const DUEL_REFRESH_COST = 20;

/** What the refresh numbered `n` today (1-based) costs. */
export const duelRefreshCost = (n: number): number =>
  n > DUEL_FREE_REFRESHES ? DUEL_REFRESH_COST : 0;

/**
 * Setup coaching, shown once before a player's first duel. It runs BEFORE the
 * lobby rather than inside a match: a duel loadout is a thing you keep and put
 * your name to, so the first thing the mode asks for is the build, not a fight.
 * The last step is the opt-in, which is a real choice and so has no Next.
 */
export const DUEL_SETUP_STEPS = [
  {
    title: 'Duels are a different fight',
    body: 'No monsters and no waves. Two boards, two HP pools, and everything you link either hits your opponent or buries their grid.',
  },
  {
    title: 'Pick who you duel as',
    body: 'Your duel hero is kept separately from your campaign run, so climbing the ladder never means rebuilding the run you like.',
  },
  {
    title: 'Build the five you defend with',
    body: 'These five pieces are what you attack with AND what the ladder hands your opponents when they challenge you while you are away.',
  },
  {
    title: 'Then decide whether to enter',
    body: "Entering this week's league puts your five in the opponent pool and makes your duels count for trophies and the weekly prize. Once in, you are locked in until the Monday reset. Stay out and your duels are friendly challenges.",
  },
];

export const DUEL_FTUE_STEPS = [
  {
    title: 'Both of you, at once',
    body: 'There are no turns. You and your opponent link on the same clock, so a fast reader gets more moves in. Your board is the big one at the bottom.',
  },
  {
    title: 'Hit them directly',
    body: 'Attack links damage their HP with no monster in between. Block soaks what comes back at you, and heal restores your own.',
  },
  {
    title: 'Bury them',
    body: 'Any link of 5 or more dumps junk into their grid. Junk is armoured: it cannot be linked, and only an orthogonal clear cracks it - two of them, or one bomb straight through.',
  },
  {
    title: 'Buried is beaten',
    body: 'Run out of legal links and you lose on the spot. Watch their board above yours, and watch your own junk. On time, whoever has more HP wins.',
  },
];

export type DuelSide = {
  cls: HeroClass;
  loadout: Gear[];
  skill: number;
  hp: number;
  block: number;
  stx: Status;
  board: number[];
};
export type DuelState = { me: DuelSide; foe: DuelSide };

export type DuelStepResult = {
  cleared: number[];
  superAfter: number | null;
  chainLen: number;
  chainOrb: Gear | null;
  attack: number;
  blockGain: number;
  heal: number;
  burnDealt: number;
  junkSend: number;
  over: boolean;
  state: DuelState;
};

export const makeDuelSide = (
  cls: HeroClass,
  loadout: Gear[],
  skill: number,
  rng: () => number
): DuelSide => ({
  cls,
  loadout,
  skill,
  hp: DUEL_HP,
  block: 0,
  stx: { ...NO_STATUS },
  board: Array.from({ length: CELLS }, () =>
    randOrb(
      rng,
      loadout.map((o) => REFILL_WEIGHT[o.effect])
    )
  ),
});

/** The five an opponent fights with. A listed player carries their own; a bot,
 *  or a listing too old to still resolve, falls back to the class default. */
export const foeLoadout = (cls: HeroClass, picked?: string[]): Gear[] =>
  picked && loadoutIsLegal(picked, cls)
    ? resolveLoadout(picked)
    : resolveLoadout(defaultLoadout(cls));

/** Junk survives a collapse as junk, so the refill never overwrites it. */
const duelCollapse = (
  board: number[],
  cleared: number[],
  rng: () => number,
  weights: number[]
): number[] => clearAndCollapse(board, cleared, rng, weights);

/** A clear beside junk cracks it; two cracks destroy it. Only orthogonal. */
const crackJunk = (
  board: number[],
  cleared: number[]
): { board: number[]; destroyed: number[] } => {
  const next = board.slice();
  const destroyed: number[] = [];
  const hit = new Map<number, number>();
  for (const c of cleared) {
    const r = rowOf(c);
    const col = colOf(c);
    const neighbours = [
      r > 0 ? c - GRID_COLS : -1,
      r < GRID_ROWS - 1 ? c + GRID_COLS : -1,
      col > 0 ? c - 1 : -1,
      col < GRID_COLS - 1 ? c + 1 : -1,
    ];
    for (const n of neighbours) {
      if (n < 0 || !isJunk(next[n]!)) continue;
      hit.set(n, (hit.get(n) ?? 0) + 1);
    }
  }
  for (const [n, hits] of hit) {
    const dmg = junkDamage(next[n]!) + hits;
    if (dmg >= JUNK_HP) destroyed.push(n);
    else next[n] = JUNK_FLAG + dmg;
  }
  return { board: next, destroyed };
};

/** Drop junk as a mound centred on the column the sender's chain ENDED in, so
 *  where you finish a link decides where it lands on them. */
export const buryBoard = (
  board: number[],
  count: number,
  anchor: number | null
): number[] => {
  const b = board.slice();
  const home = anchor == null ? Math.floor(GRID_COLS / 2) : colOf(anchor);
  const cols = [home];
  for (let d = 1; d < GRID_COLS; d++) {
    if (home + d < GRID_COLS) cols.push(home + d);
    if (home - d >= 0) cols.push(home - d);
  }
  let left = count;
  // Spread across the mound before stacking it, so junk widens then deepens.
  for (let pass = 0; pass < GRID_ROWS && left > 0; pass++) {
    for (const c of cols) {
      if (left <= 0) break;
      for (let r = 0; r < GRID_ROWS; r++) {
        const i = r * GRID_COLS + c;
        if (!isJunk(b[i]!)) {
          b[i] = JUNK_FLAG;
          left--;
          break;
        }
      }
    }
  }
  return b;
};

/** One duel move. Same payout maths as a campaign link (magnitudeFor, perk
 *  scaling, riders) but resolved against a player instead of a wave. */
export const duelStep = (
  state: DuelState,
  side: 'me' | 'foe',
  move: number[],
  rng: () => number,
  mutators: Mutators = NO_MUTATORS
): DuelStepResult | null => {
  const foeKey = side === 'me' ? 'foe' : 'me';
  const me = { ...state[side] };
  const foe = { ...state[foeKey] };
  const loadout = me.loadout;
  const perk = HERO_PERKS[me.cls] ?? HERO_PERKS.Hero;
  const weights = loadout.map((o) => REFILL_WEIGHT[o.effect]);
  const board = me.board;

  let attack = 0;
  let blockGain = 0;
  let heal = 0;
  let chainLen = 0;
  let junkSend = 0;
  let superAfter: number | null = null;
  let chainOrb: Gear | null = null;
  const fired: Rider[] = [];
  const add = (effect: string, amount: number) => {
    const scale = (x: number) =>
      amount > 0 ? Math.max(1, Math.floor((amount * x) / 100)) : 0;
    if (effect === 'attack') attack += scale(perk.attackX100);
    else if (effect === 'block') blockGain += scale(perk.blockX100);
    else heal += scale(perk.healX100);
  };

  let cleared: number[] = [];
  let pending: number[];
  let staged = board;
  if (move.length === 1) {
    if (!isSuper(board[move[0]!]!)) return null;
    pending = [move[0]!];
  } else {
    const type = chainType(board, move);
    if (type === null) return null;
    const orb = loadout[type];
    if (!orb) return null;
    chainLen = move.length;
    chainOrb = orb;
    add(orb.effect, magnitudeFor(orb.power, chainLen, mutators));
    const rd = riderOf(orb.id);
    if (rd && chainLen >= rd.at) fired.push(rd);
    junkSend += junkFor(chainLen);
    let linkCleared = move.slice();
    if (!mutators.noSupers && chainLen >= SUPER_MIN_LINK) {
      let spawnAt = -1;
      for (let i = chainLen - 1; i >= 0; i--)
        if (!isSuper(board[move[i]!]!)) {
          spawnAt = i;
          break;
        }
      if (spawnAt >= 0) {
        staged = board.slice();
        staged[move[spawnAt]!] =
          orbTypeOf(staged[move[spawnAt]!]!) + SUPER_FLAG;
        superAfter = move[spawnAt]!;
        linkCleared = move.filter((_, i) => i !== spawnAt);
      }
    }
    const supers = linkCleared.filter((c) => isSuper(staged[c]!));
    cleared = linkCleared.filter((c) => supers.indexOf(c) < 0);
    pending = supers.slice();
  }

  let curBoard = staged;
  // Bombs chain, but resolve in ONE beat: a duel reads on tempo, so the
  // stage-by-stage playback the campaign uses would drag here.
  for (
    let stage = 0;
    pending.length > 0 && stage < MAX_DETONATION_STAGES;
    stage++
  ) {
    const firing = new Set(pending);
    const set = new Set(pending);
    const caught: number[] = [];
    for (const from of pending) {
      for (const cell of bombCells(from)) {
        if (firing.has(cell)) continue;
        if (isSuper(curBoard[cell]!)) {
          if (caught.indexOf(cell) < 0) caught.push(cell);
          continue;
        }
        set.add(cell);
      }
    }
    const stageCleared = Array.from(set);
    for (const cell of stageCleared) {
      if (isJunk(curBoard[cell]!)) continue;
      const blastOrb = loadout[orbTypeOf(curBoard[cell]!)];
      if (!blastOrb) continue;
      add(
        blastOrb.effect,
        Math.floor(
          (blastOrb.power *
            (firing.has(cell) ? BOMB_CENTER_MULT_X100 : BOMB_MULT_X100)) /
            100
        )
      );
    }
    junkSend += DUEL_BOMB_JUNK * pending.length;
    cleared = cleared.concat(
      stageCleared.filter((c) => cleared.indexOf(c) < 0)
    );
    pending = caught;
  }

  const cracked = crackJunk(curBoard, cleared);
  const allCleared = cleared.concat(cracked.destroyed);
  curBoard = cracked.board;

  const stx: Status = { ...NO_STATUS, ...me.stx };
  const foeStx: Status = { ...NO_STATUS, ...foe.stx };
  for (const rd of fired) {
    if (rd.r === 'strength') stx.strength += rd.v;
    else if (rd.r === 'grit') stx.grit += rd.v;
  }
  if (attack > 0 && stx.strength > 0) attack += stx.strength;
  if (blockGain > 0 && stx.grit > 0) blockGain += stx.grit;
  if (attack > 0 && foeStx.mark > 0) {
    attack = Math.ceil((attack * markMultX100(foeStx.mark)) / 100);
    foeStx.mark -= 1;
  }
  if (stx.frost > 0 && junkSend > 0) {
    junkSend = 0;
    stx.frost -= 1;
  }
  for (const rd of fired) {
    if (rd.r === 'burn') foeStx.burn += rd.v;
    else if (rd.r === 'mark') foeStx.mark += rd.v;
    // FROST chokes their sabotage rather than a charge meter they do not have:
    // their next link sends no junk.
    else if (rd.r === 'frost') foeStx.frost += rd.v;
  }

  let dealt = 0;
  if (attack > 0) {
    dealt = Math.max(0, attack - foe.block);
    foe.block = Math.max(0, foe.block - attack);
    foe.hp = Math.max(0, foe.hp - dealt);
  }
  me.block = me.block + blockGain;
  if (heal > 0) me.hp = Math.min(DUEL_HP, me.hp + heal);

  let burnDealt = 0;
  if (foeStx.burn > 0 && foe.hp > 0) {
    burnDealt = Math.min(foeStx.burn, foe.hp);
    foe.hp = Math.max(0, foe.hp - foeStx.burn);
    foeStx.burn = Math.max(0, foeStx.burn - 1);
  }

  me.board = duelCollapse(curBoard, allCleared, rng, weights);
  me.stx = stx;
  foe.stx = foeStx;
  if (junkSend > 0)
    foe.board = buryBoard(foe.board, junkSend, move[move.length - 1] ?? null);

  const next = { ...state, [side]: me, [foeKey]: foe } as DuelState;
  return {
    cleared: allCleared,
    superAfter,
    chainLen,
    chainOrb,
    attack: dealt,
    blockGain,
    heal,
    burnDealt,
    junkSend,
    over: foe.hp <= 0,
    state: next,
  };
};

/** Every legal link on a board, for the bot. Node-budgeted so a board with big
 *  same-colour clusters cannot stall the turn. */
const duelLinks = (board: number[], cap: number): number[][] => {
  const out: number[][] = [];
  let budget = 20000;
  const dfs = (path: number[]) => {
    if (budget-- <= 0) return;
    if (path.length >= MIN_LINK) out.push(path.slice());
    if (path.length >= cap) return;
    const last = path[path.length - 1]!;
    const type = orbTypeOf(board[path[0]!]!);
    for (let j = 0; j < CELLS; j++) {
      if (path.indexOf(j) >= 0 || !areAdjacent(last, j)) continue;
      if (
        isJunk(board[j]!) ||
        isSuper(board[j]!) ||
        orbTypeOf(board[j]!) !== type
      )
        continue;
      path.push(j);
      dfs(path);
      path.pop();
    }
  };
  for (let i = 0; i < CELLS; i++)
    if (!isJunk(board[i]!) && !isSuper(board[i]!)) dfs([i]);
  return out;
};

/** Greedy bot: a kill above all, then junk pressure, then tempo. Weaker foes
 *  misjudge - the noise is what makes them beatable. */
export const duelBestMove = (
  state: DuelState,
  side: 'me' | 'foe',
  mutators: Mutators = NO_MUTATORS
): number[] | null => {
  const me = state[side];
  const foe = state[side === 'me' ? 'foe' : 'me'];
  const board = me.board;
  for (let i = 0; i < CELLS; i++) if (isSuper(board[i]!)) return [i];
  const links = duelLinks(board, 7);
  if (!links.length) return null;
  const perk = HERO_PERKS[me.cls] ?? HERO_PERKS.Hero;
  const skill = me.skill ?? 0.85;
  let best: number[] | null = null;
  let bestScore = -1;
  for (const path of links) {
    const orb = me.loadout[orbTypeOf(board[path[0]!]!)];
    if (!orb) continue;
    const raw = magnitudeFor(orb.power, path.length, mutators);
    const x =
      orb.effect === 'attack'
        ? perk.attackX100
        : orb.effect === 'block'
          ? perk.blockX100
          : perk.healX100;
    const val = Math.max(1, Math.floor((raw * x) / 100));
    let sc = 0;
    if (orb.effect === 'attack') sc += val >= foe.hp ? 1000 : val * 1.7;
    else if (orb.effect === 'block') sc += val * 0.85;
    else sc += val * (me.hp < DUEL_HP * 0.4 ? 2.4 : 0.45);
    sc += junkFor(path.length) * 3.5;
    if (path.length >= SUPER_MIN_LINK) sc += 7;
    sc *= 1 - (1 - skill) * Math.random();
    if (sc > bestScore) {
      bestScore = sc;
      best = path;
    }
  }
  return best;
};
