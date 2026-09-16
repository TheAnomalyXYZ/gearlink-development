/**
 * The gauntlet run engine. One turn resolves in the order stepGearLink uses:
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
  ELITE_EVERY,
  ELITE_HEAVY_EVERY,
  ELITE_HEAVY_X100,
  ELITE_HP_X100,
  ELITE_STR_X100,
  GLASS_KNIGHT_HP,
  LEECH_HEAL_X100,
  MAX_DETONATION_STAGES,
  PERIOD_BANDS,
  PERIOD_FLOOR,
  PLAYER_HP,
  REFILL_WEIGHT,
  SUPER_FLAG,
  SUPER_MIN_LINK,
  SWARM_HP_X100,
  WARDEN_BLOCK_CAP_X100,
  WAVE_BASE_HP_MAX,
  WAVE_BASE_HP_MIN,
  WAVE_BASE_STR_MAX,
  WAVE_BASE_STR_MIN,
  WAVE_CLEAR_BONUS,
  WAVE_HP_GROWTH_BANDS,
  WAVE_STR_GROWTH_BANDS,
} from './constants.js';
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
import { MONSTER_BASE_HP, WAVE_ENEMIES } from './monsters.js';
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
};

export class Run {
  readonly seed: number;
  readonly heroClass: HeroClass;
  readonly picked: string[];
  readonly mutators: Mutators;
  readonly loadout: Gear[];
  readonly weights: number[];
  readonly base: RunBase;
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
  }

  get perk() {
    return HERO_PERKS[this.heroClass] ?? HERO_PERKS.Hero;
  }
  maxHp(): number {
    return this.mutators.glassKnight ? GLASS_KNIGHT_HP : PLAYER_HP;
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

  affixForWave(wave: number): string {
    if (wave % ELITE_EVERY === 0) return 'elite';
    if (wave <= AFFIX_FREE_WAVES) return 'none';
    return AFFIX_TABLE[
      hash32(this.base.hp + ':' + this.base.strength + ':' + wave) %
        AFFIX_TABLE.length
    ]!;
  }

  /** HP comes from the monster table rather than one ramped number, so each
   *  wave is the pool that monster actually has. */
  waveHp(wave: number): number {
    const n = WAVE_ENEMIES.length;
    const name = WAVE_ENEMIES[Math.min(wave - 1, n - 1)]![0];
    let hp = MONSTER_BASE_HP[name] ?? 30;
    for (let w = n + 1; w <= wave; w++)
      hp = hp * (growthFor(WAVE_HP_GROWTH_BANDS, w) / 1000);
    return Math.max(1, Math.round(hp));
  }

  enemyForWave(wave: number): Enemy {
    const m = this.mutators;
    let hp = this.waveHp(wave);
    let strength = rampedStat(this.base.strength, WAVE_STR_GROWTH_BANDS, wave);
    let period = basePeriodForWave(wave);
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
      const nextEnemy = this.enemyForWave(wave);
      enemyHp = nextEnemy.hp;
      if (nextEnemy.charged) meter = Math.max(0, nextEnemy.period - 1);
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
