/**
 * The battle engine. One battle is one location on the map: 3-5 waves drawn
 * from that location's pool, the last of them always its elite. One turn
 * resolves in the order stepGearLink uses:
 * payout -> attack -> block -> heal -> kill check -> enemy beat -> death.
 *
 * `Run` owns the RNG stream and nothing else that mutates, so constructing one
 * from a seed and replaying the same moves always lands on the same state. The
 * server relies on exactly that to verify a submitted score.
 */
import {
  AFFIX_FREE_WAVES,
  AFFIX_TABLE,
  ARMOR_CUT_X100,
  ARMOR_MIN_DAMAGE,
  BLOCK_CAP_OF_STRENGTH_X100,
  BLOCK_HARD_CAP_OF_STRENGTH_X100,
  BLOCK_OVERFLOW_X100,
  BOMB_CENTER_MULT_X100,
  BOMB_MULT_X100,
  BRUTE_STR_X100,
  CELLS,
  COMBO_BONUS,
  ELITE_HEAVY_EVERY,
  ELITE_HEAVY_X100,
  ELITE_HP_X100,
  ELITE_STR_X100,
  GLASS_KNIGHT_HP,
  LEECH_HEAL_X100,
  MAX_DETONATION_STAGES,
  PERIOD_BANDS,
  PERIOD_FLOOR,
  REFILL_WEIGHT,
  SUPER_FLAG,
  SUPER_MIN_LINK,
  SWARM_HP_X100,
  WARDEN_BLOCK_CAP_X100,
  WAVE_BASE_HP_MAX,
  WAVE_BASE_HP_MIN,
  WAVE_BASE_STR_MAX,
  WAVE_BASE_STR_MIN,
  BATTLE_CLEAR_BONUS,
  LOCATION_SCORE_STEP_X100,
  WAVE_CLEAR_BONUS,
  WAVE_STR_GROWTH_BANDS,
} from './constants.js';
import {
  ASCENSION_HP_X100,
  ASCENSION_SCORE_X100,
  ASCENSION_STR_X100,
  FIRST_LOCATION,
  KING_HP_X100,
  KING_STR_X100,
  compoundX100,
  difficultyStep,
  locationById,
  locationIndex,
  planBattle,
} from './campaign.js';
import type { Location, WavePlan } from './campaign.js';
import {
  bombCells,
  chainType,
  clearAndCollapse,
  collapseShift,
  isSuper,
  magnitudeFor,
  orbTypeOf,
  randOrb,
} from './board.js';
import {
  HERO_PERKS,
  NO_STATUS,
  markMultX100,
  resolveLoadout,
  riderOf,
} from './gear.js';
import { clampContainers, maxHpFor } from './hearts.js';
import { MONSTER_BASE_HP } from './monsters.js';
import { hash32, mulberry32 } from './rng.js';
import type {
  DetonationStage,
  Enemy,
  Gear,
  HeroClass,
  Mutators,
  Rider,
  RiderKind,
  RunBase,
  RunState,
  Status,
  StepResult,
} from './types.js';

export const NO_MUTATORS: Mutators = {
  swiftEnemy: false,
  noSupers: false,
  brittleBlock: false,
  chainFrenzy: false,
  glassKnight: false,
};

const growthFor = (bands: { u: number; x: number }[], wave: number): number => {
  for (const b of bands) if (wave < b.u) return b.x;
  return bands[bands.length - 1]!.x;
};
const rampedStat = (
  base: number,
  bands: { u: number; x: number }[],
  wave: number
): number => {
  let v = base;
  for (let w = 2; w <= wave; w++) v = v * (growthFor(bands, w) / 1000);
  return Math.round(v);
};
const basePeriodForWave = (w: number): number => {
  for (const b of PERIOD_BANDS) if (w < b.u) return b.p;
  return PERIOD_FLOOR;
};

export type RunConfig = {
  seed: number;
  heroClass: HeroClass;
  picked: string[];
  mutators?: Mutators;
  /** Which map node this battle is. Defaults to the first. */
  locationId?: string;
  /** How many times the player has put The King down. Scales everything. */
  ascension?: number;
  /** Heart containers this hero has banked. The engine takes the COUNT, never
   *  a max-HP figure, so a forged pool cannot be submitted. */
  hearts?: number;
};

export class Run {
  readonly seed: number;
  readonly heroClass: HeroClass;
  readonly picked: string[];
  readonly mutators: Mutators;
  readonly loadout: Gear[];
  readonly weights: number[];
  readonly base: RunBase;
  readonly location: Location;
  readonly locIndex: number;
  readonly ascension: number;
  readonly hearts: number;
  /** The whole battle, rolled once at construction. Its length is the number
   *  of waves this location fields, and its last entry is always the boss. */
  readonly plan: WavePlan[];
  private rng: () => number;

  constructor(cfg: RunConfig) {
    this.seed = cfg.seed >>> 0;
    this.heroClass = cfg.heroClass;
    this.picked = cfg.picked;
    this.mutators = cfg.mutators ?? NO_MUTATORS;
    this.loadout = resolveLoadout(cfg.picked);
    this.weights = this.loadout.map((o) => REFILL_WEIGHT[o.effect]);
    this.rng = mulberry32(this.seed);
    // Draw order matters for replay: the base roll consumes the first two
    // numbers off the stream, then the opening board consumes CELLS more.
    this.base = {
      hp:
        WAVE_BASE_HP_MIN +
        Math.floor(this.rng() * (WAVE_BASE_HP_MAX - WAVE_BASE_HP_MIN + 1)),
      strength:
        WAVE_BASE_STR_MIN +
        Math.floor(this.rng() * (WAVE_BASE_STR_MAX - WAVE_BASE_STR_MIN + 1)),
    };
    // Then the battle plan, then the opening board. Any reordering here
    // desyncs every replay, so the three draws stay in this order.
    this.location = locationById(cfg.locationId ?? FIRST_LOCATION);
    this.locIndex = locationIndex(this.location.id);
    this.ascension = Math.max(0, Math.floor(cfg.ascension ?? 0));
    this.hearts = clampContainers(cfg.hearts ?? 0);
    this.plan = planBattle(this.location, this.rng);
  }

  /** How many waves this battle runs. */
  get waveCount(): number {
    return this.plan.length;
  }
  /** Past the last wave there is no monster left: the battle is won. */
  planFor(wave: number): WavePlan {
    return this.plan[Math.min(Math.max(1, wave), this.waveCount) - 1]!;
  }
  isBossWave(wave: number): boolean {
    return wave >= this.waveCount;
  }

  get perk() {
    return HERO_PERKS[this.heroClass] ?? HERO_PERKS.Hero;
  }
  /** GLASS KNIGHT is a fixed handicap, so it overrides the upgrade rather than
   *  scaling with it - the mutator's whole point is a pool you cannot grow. */
  maxHp(): number {
    return this.mutators.glassKnight ? GLASS_KNIGHT_HP : maxHpFor(this.hearts);
  }

  /** The opening state. Must be called exactly once, straight after
   *  construction, or the RNG stream desyncs from a replay. */
  start(): RunState {
    const board = Array.from({ length: CELLS }, () =>
      randOrb(this.rng, this.weights)
    );
    const first = this.enemyForWave(1);
    return {
      board,
      wave: 1,
      enemyHp: first.hp,
      playerHp: this.maxHp(),
      block: this.perk.startBlock,
      meter: first.charged ? Math.max(0, first.period - 1) : 0,
      waveHits: 0,
      damageDealt: 0,
      maxChain: 0,
      wavesCleared: 0,
      waveBonus: 0,
      turnsUsed: 0,
      pv: {
        enrage: 0,
        summonUsed: false,
        stunUsed: false,
        curse: 0,
        lockType: -1,
        lock: 0,
      },
      stx: { ...NO_STATUS },
    };
  }

  /** The last wave of a location is ALWAYS its elite - that is what makes a
   *  battle read as a fight with an ending rather than a slice of a gauntlet.
   *  Everything before it draws from the affix table, with the opening waves
   *  of the first location left plain so a new player meets one rule at a
   *  time. */
  affixForWave(wave: number): string {
    if (this.isBossWave(wave)) return 'elite';
    if (this.locIndex === 0 && wave <= AFFIX_FREE_WAVES) return 'none';
    return AFFIX_TABLE[
      hash32(
        this.base.hp +
          ':' +
          this.base.strength +
          ':' +
          this.location.id +
          ':' +
          wave
      ) % AFFIX_TABLE.length
    ]!;
  }

  /** HP is the pool the PLANNED monster actually has, then compounded once per
   *  ascension. The monster table already ramps across the map, so no second
   *  per-wave growth is applied on top of it. */
  waveHp(wave: number): number {
    const plan = this.planFor(wave);
    let hp = MONSTER_BASE_HP[plan.name] ?? 30;
    if (plan.boss && this.location.king) hp = (hp * KING_HP_X100) / 100;
    hp = hp * compoundX100(ASCENSION_HP_X100, this.ascension);
    return Math.max(1, Math.round(hp));
  }

  enemyForWave(wave: number): Enemy {
    const m = this.mutators;
    const step = difficultyStep(this.locIndex, wave);
    let hp = this.waveHp(wave);
    let strength = rampedStat(this.base.strength, WAVE_STR_GROWTH_BANDS, step);
    if (this.planFor(wave).boss && this.location.king)
      strength = Math.round((strength * KING_STR_X100) / 100);
    strength = Math.round(
      strength * compoundX100(ASCENSION_STR_X100, this.ascension)
    );
    let period = basePeriodForWave(step);
    let armor = 0;
    let blockCap = 0;
    let healX100 = 100;
    let heavyEvery = 0;
    const affix = this.affixForWave(wave);
    if (affix === 'armored') armor = ARMOR_CUT_X100;
    else if (affix === 'brute') {
      strength = Math.round((strength * BRUTE_STR_X100) / 100);
      period += 1;
    } else if (affix === 'swarm') {
      hp = Math.round((hp * SWARM_HP_X100) / 100);
      period -= 1;
    } else if (affix === 'warden')
      blockCap = Math.round((strength * WARDEN_BLOCK_CAP_X100) / 100);
    else if (affix === 'leech') healX100 = LEECH_HEAL_X100;
    else if (affix === 'elite') {
      hp = Math.round((hp * ELITE_HP_X100) / 100);
      strength = Math.round((strength * ELITE_STR_X100) / 100);
      period += 1;
      heavyEvery = ELITE_HEAVY_EVERY;
    }
    return {
      hp: Math.max(1, hp),
      strength,
      period: Math.max(PERIOD_FLOOR, period),
      affix,
      armor,
      blockCap,
      healX100,
      heavyEvery,
      heavyX100: ELITE_HEAVY_X100,
      // SWIFT ENEMY: cadence cannot go below the floor, so the edge is that
      // every wave opens with its meter nearly full instead.
      charged: m.swiftEnemy,
    };
  }

  blockCapFor(e: Enemy): number {
    const global = Math.round((e.strength * BLOCK_CAP_OF_STRENGTH_X100) / 100);
    return e.blockCap > 0 ? Math.min(global, e.blockCap) : global;
  }
  blockHardCapFor(e: Enemy): number {
    const hard = Math.round(
      (e.strength * BLOCK_HARD_CAP_OF_STRENGTH_X100) / 100
    );
    return e.blockCap > 0 ? Math.min(hard, e.blockCap) : hard;
  }
  /** Block past the soft cap still lands, at a quarter rate, up to a hard cap -
   *  so an over-long block link is wasteful rather than worthless. */
  applyBlockGain(e: Enemy, block: number, gain: number): number {
    if (gain <= 0) return block;
    const soft = this.blockCapFor(e);
    const hard = this.blockHardCapFor(e);
    const underSoft = Math.max(0, Math.min(gain, soft - block));
    const overflow = gain - underSoft;
    const scaled =
      overflow > 0 ? Math.floor((overflow * BLOCK_OVERFLOW_X100) / 100) : 0;
    return Math.min(
      hard,
      block + underSoft + (overflow > 0 ? Math.max(1, scaled) : 0)
    );
  }

  intentFor(
    e: Enemy,
    meter: number,
    hits: number
  ): 'charge' | 'heavy' | 'attack' {
    if (meter + 1 < e.period) return 'charge';
    return e.heavyEvery > 0 && (hits + 1) % e.heavyEvery === 0
      ? 'heavy'
      : 'attack';
  }
  swingStrength(e: Enemy, hits: number): number {
    if (e.heavyEvery > 0 && (hits + 1) % e.heavyEvery === 0)
      return Math.round((e.strength * e.heavyX100) / 100);
    return e.strength;
  }

  /** One turn. `move` is either a drawn link of >= MIN_LINK cells, or a single
   *  cell holding a bomb. Returns null for an illegal move, which is how the
   *  server rejects a forged submission. */
  step(bs: RunState, move: number[]): StepResult | null {
    const m = this.mutators;
    const perk = this.perk;
    const loadout = this.loadout;
    const weights = this.weights;
    const rng = this.rng;
    const board = bs.board;

    let attack = 0;
    let blockGain = 0;
    let heal = 0;
    let superCell: number | null = null;
    let chainLen = 0;
    const add = (effect: string, amount: number) => {
      const scale = (x: number) =>
        amount > 0 ? Math.max(1, Math.floor((amount * x) / 100)) : 0;
      if (effect === 'attack') attack += scale(perk.attackX100);
      else if (effect === 'block') blockGain += scale(perk.blockX100);
      else heal += scale(perk.healX100);
    };

    let curBoard = board;
    let pending: number[] = [];
    let firstCleared: number[] = [];
    let superAfter: number | null = null;
    let firstDetonators: number[] = [];
    let firstBlasted: number[] = [];
    const stages: DetonationStage[] = [];
    // Riders fire off the DRAWN link only, never off a bomb blast - the
    // threshold is a link length, and a blast has no length to measure.
    const fired: Rider[] = [];

    if (move.length === 1) {
      const v = board[move[0]!];
      if (v == null || !isSuper(v)) return null;
      pending = [move[0]!];
    } else {
      const type = chainType(board, move);
      if (type === null) return null;
      const orb = loadout[type];
      if (!orb) return null;
      chainLen = move.length;
      add(orb.effect, magnitudeFor(orb.power, chainLen, m));
      const rd = riderOf(orb.id);
      if (rd && chainLen >= rd.at) fired.push(rd);

      let linkCleared: number[];
      if (!m.noSupers && chainLen >= SUPER_MIN_LINK) {
        let spawnAt = -1;
        for (let i = chainLen - 1; i >= 0; i--) {
          const v = board[move[i]!];
          if (v != null && !isSuper(v)) {
            spawnAt = i;
            break;
          }
        }
        if (spawnAt >= 0) {
          superCell = move[spawnAt]!;
          linkCleared = move.filter((_, i) => i !== spawnAt);
        } else linkCleared = move.slice();
      } else linkCleared = move.slice();

      const linkedSupers = linkCleared.filter(
        (c) => board[c] != null && isSuper(board[c]!)
      );
      const survives = new Set(linkedSupers);
      const stageCleared = linkCleared.filter((c) => !survives.has(c));
      let staged = board;
      if (superCell !== null) {
        staged = board.slice();
        staged[superCell] = orbTypeOf(staged[superCell]!) + SUPER_FLAG;
      }
      const lookup = new Set(stageCleared);
      firstCleared = stageCleared.slice();
      if (superCell !== null) superAfter = collapseShift(superCell, lookup);
      curBoard = clearAndCollapse(staged, stageCleared, rng, weights);
      if (linkedSupers.length > 0)
        pending = linkedSupers
          .map((c) => collapseShift(c, lookup))
          .sort((a, b) => a - b);
    }

    let detonations = 0;
    for (
      let stage = 0;
      pending.length > 0 && stage < MAX_DETONATION_STAGES;
      stage++
    ) {
      const detonators = pending;
      const firing = new Set(detonators);
      const clearedSet = new Set(detonators);
      const caught: number[] = [];
      for (const from of detonators) {
        for (const cell of bombCells(from)) {
          if (firing.has(cell)) continue;
          const cv = curBoard[cell];
          if (cv == null) continue;
          if (isSuper(cv)) {
            if (!caught.includes(cell)) caught.push(cell);
            continue;
          }
          clearedSet.add(cell);
        }
      }
      const stageCleared = Array.from(clearedSet).sort((a, b) => a - b);
      const stageBlasted = stageCleared.filter((c) => !firing.has(c));
      if (stage === 0) {
        firstDetonators = detonators.slice();
        firstBlasted = stageBlasted.slice();
      }
      for (const cell of stageCleared) {
        const blastOrb = loadout[orbTypeOf(curBoard[cell]!)];
        if (!blastOrb) continue;
        const mult = firing.has(cell) ? BOMB_CENTER_MULT_X100 : BOMB_MULT_X100;
        add(blastOrb.effect, Math.floor((blastOrb.power * mult) / 100));
      }
      detonations += detonators.length;
      const lookup = new Set(stageCleared);
      const boardBefore = curBoard;
      curBoard = clearAndCollapse(curBoard, stageCleared, rng, weights);
      stages.push({
        detonators: detonators.slice(),
        blasted: stageBlasted,
        cleared: stageCleared,
        before: boardBefore,
        after: curBoard,
      });
      pending = caught
        .map((c) => collapseShift(c, lookup))
        .sort((a, b) => a - b);
    }

    let {
      enemyHp,
      playerHp,
      block,
      meter,
      waveHits,
      wave,
      damageDealt,
      maxChain,
      wavesCleared,
      waveBonus,
      turnsUsed,
    } = bs;
    const current = this.enemyForWave(wave);
    const pv = { ...bs.pv };
    const stx: Status = { ...NO_STATUS, ...bs.stx };

    // Self-facing buffs land BEFORE the payout is spent, so a link that grants
    // Strength or Grit already benefits from it. The three monster-facing
    // statuses land after: a link must never consume the Mark it just applied,
    // or Mark degrades to a flat damage bonus and the setup decision vanishes.
    for (const rd of fired) {
      if (rd.r === 'strength') stx.strength += rd.v;
      else if (rd.r === 'grit') stx.grit += rd.v;
    }
    if (attack > 0 && stx.strength > 0) attack += stx.strength;
    if (blockGain > 0 && stx.grit > 0) blockGain += stx.grit;
    let markSpent = 0;
    if (attack > 0 && stx.mark > 0) {
      attack = Math.ceil((attack * markMultX100(stx.mark)) / 100);
      stx.mark -= 1;
      markSpent = 1;
    }

    let attackDealt = 0;
    if (attack > 0) {
      attackDealt =
        current.armor > 0
          ? Math.max(
              ARMOR_MIN_DAMAGE,
              attack - Math.ceil((attack * current.armor) / 100)
            )
          : attack;
      damageDealt += Math.min(attackDealt, enemyHp);
      enemyHp -= attackDealt;
    }

    const blockBefore = block;
    block = this.applyBlockGain(current, block, blockGain);
    const blockGained = block - blockBefore;

    let healed = 0;
    if (heal > 0) {
      const scaled = Math.floor((heal * current.healX100) / 100);
      const before = playerHp;
      playerHp = Math.min(this.maxHp(), playerHp + scaled);
      healed = playerHp - before;
    }

    // BURN ticks at end of turn, then decays - the monster can die to it. This
    // runs on the burn already standing, so a stack applied this turn starts
    // ticking next turn.
    let burnDealt = 0;
    if (stx.burn > 0 && enemyHp > 0) {
      burnDealt = Math.min(stx.burn, Math.max(0, enemyHp));
      damageDealt += burnDealt;
      enemyHp -= stx.burn;
      stx.burn = Math.max(0, stx.burn - 1);
    }
    for (const rd of fired) if (rd.r === 'burn') stx.burn += rd.v;
    for (const rd of fired) if (rd.r === 'mark') stx.mark += rd.v;
    if (chainLen > maxChain) maxChain = chainLen;
    turnsUsed++;

    let waveCleared = false;
    let battleWon = false;
    let enemyAttacked = false;
    let enemyDamage = 0;
    let over = false;
    let enemyHeavy = false;
    let enemySwing = 0;
    let enemyBlocked = 0;

    if (enemyHp <= 0) {
      waveCleared = true;
      wavesCleared++;
      waveBonus += WAVE_CLEAR_BONUS * wave;
      wave++;
      meter = 0;
      block = 0;
      waveHits = 0;
      pv.enrage = 0;
      pv.summonUsed = false;
      pv.stunUsed = false;
      pv.curse = 0;
      pv.lock = 0;
      pv.lockType = -1;
      // The monster's statuses die with it; your own buffs are the run's reward
      // for getting this far, so Strength and Grit carry over.
      stx.burn = 0;
      stx.mark = 0;
      stx.frost = 0;
      if (wave > this.waveCount) {
        // The boss was the last wave, so there is nothing to walk on. The
        // battle is won here; the caller stops the run rather than dealing
        // another enemy.
        battleWon = true;
        enemyHp = 0;
        waveBonus += BATTLE_CLEAR_BONUS;
      } else {
        const nextEnemy = this.enemyForWave(wave);
        enemyHp = nextEnemy.hp;
        if (nextEnemy.charged) meter = Math.max(0, nextEnemy.period - 1);
      }
    } else {
      // FROST stalls the charge instead of advancing it, one stack per turn.
      if (stx.frost > 0) stx.frost -= 1;
      else meter++;
      if (meter >= current.period) {
        enemyAttacked = true;
        let swing = current.strength;
        if (
          current.heavyEvery > 0 &&
          (waveHits + 1) % current.heavyEvery === 0
        ) {
          swing = Math.round((current.strength * current.heavyX100) / 100);
          enemyHeavy = true;
        }
        enemySwing = swing;
        enemyBlocked = Math.min(block, swing);
        enemyDamage = Math.max(swing - block, 0);
        playerHp -= enemyDamage;
        block = 0;
        meter = 0;
        waveHits++;
      }
      if (playerHp <= 0) over = true;
      // Frost applied by THIS link stalls the next charge, not the one that was
      // already resolving above.
      for (const rd of fired) if (rd.r === 'frost') stx.frost += rd.v;
    }
    if (m.brittleBlock) block = 0;

    return {
      cleared: firstCleared,
      superAfter,
      detonators: firstDetonators,
      blasted: firstBlasted,
      stages,
      attackDealt,
      blockGained,
      healed,
      detonations,
      waveCleared,
      battleWon,
      enemyAttacked,
      enemyDamage,
      over,
      reflected: 0,
      enemyHeavy,
      enemySwing,
      enemyBlocked,
      burnDealt,
      markSpent,
      fired: fired.map((f) => f.r) as RiderKind[],
      bs: {
        board: curBoard,
        wave,
        enemyHp,
        playerHp: Math.max(0, playerHp),
        block,
        meter,
        waveHits,
        damageDealt,
        maxChain,
        wavesCleared,
        waveBonus,
        turnsUsed,
        pv,
        stx,
      },
    };
  }
}

export const scoreOf = (bs: RunState): number =>
  bs.damageDealt + bs.waveBonus + COMBO_BONUS * bs.maxChain;

/** What the battle is worth once the map is taken into account: deeper
 *  locations and higher ascensions pay more for the same play, which is what
 *  makes climbing again worth doing. */
export const battleScore = (
  bs: RunState,
  locIndex: number,
  ascension: number
): number =>
  Math.round(
    scoreOf(bs) *
      (1 + locIndex * (LOCATION_SCORE_STEP_X100 / 100)) *
      compoundX100(ASCENSION_SCORE_X100, ascension)
  );
