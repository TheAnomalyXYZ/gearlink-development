export type EffectKind = 'attack' | 'block' | 'effect';
export type HeroClass = 'Hero' | 'Archer' | 'Mage';
export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type Slot = 'Weapon' | 'Off-Hand' | 'Chest' | 'Hat' | 'Necklace';
export type RiderKind = 'burn' | 'mark' | 'frost' | 'strength' | 'grit';

export type Gear = {
  id: string;
  cls: HeroClass;
  name: string;
  rarity: Rarity;
  effect: EffectKind;
  slot: Slot;
  power: number;
};

/** A rider only fires on a link of `at` orbs or longer - that threshold is what
 *  stops the picker from being "take the highest power". */
export type Rider = { r: RiderKind; v: number; at: number };

export type Status = {
  burn: number;
  mark: number;
  frost: number;
  strength: number;
  grit: number;
};

export type Enemy = {
  hp: number;
  strength: number;
  period: number;
  affix: string;
  armor: number;
  blockCap: number;
  healX100: number;
  heavyEvery: number;
  heavyX100: number;
  charged: boolean;
};

/** Per-wave transient state for monster specials. Kept for shape parity with
 *  the design; PVE waves carry no specials, so these stay inert in a run. */
export type WaveVars = {
  enrage: number;
  summonUsed: boolean;
  stunUsed: boolean;
  curse: number;
  lockType: number;
  lock: number;
};

export type RunState = {
  board: number[];
  wave: number;
  enemyHp: number;
  playerHp: number;
  block: number;
  meter: number;
  waveHits: number;
  damageDealt: number;
  maxChain: number;
  wavesCleared: number;
  waveBonus: number;
  turnsUsed: number;
  pv: WaveVars;
  stx: Status;
};

export type Mutators = {
  swiftEnemy: boolean;
  noSupers: boolean;
  brittleBlock: boolean;
  chainFrenzy: boolean;
  glassKnight: boolean;
};

export type DetonationStage = {
  detonators: number[];
  blasted: number[];
  cleared: number[];
  before: number[];
  after: number[];
};

export type StepResult = {
  cleared: number[];
  superAfter: number | null;
  detonators: number[];
  blasted: number[];
  stages: DetonationStage[];
  attackDealt: number;
  blockGained: number;
  healed: number;
  detonations: number;
  waveCleared: boolean;
  /** The boss was the last wave: the location is taken and the run stops. */
  battleWon: boolean;
  enemyAttacked: boolean;
  enemyDamage: number;
  over: boolean;
  reflected: number;
  enemyHeavy: boolean;
  enemySwing: number;
  enemyBlocked: number;
  burnDealt: number;
  markSpent: number;
  fired: RiderKind[];
  bs: RunState;
};

/** The base roll a run opens on, derived from the run seed. */
export type RunBase = { hp: number; strength: number };
