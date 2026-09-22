/**
 * The map: six locations, each one a short battle of 3-5 waves, and the
 * ascension that starts the whole road again harder.
 *
 * A location is the unit of progression. Its waves are drawn from its own mob
 * pool, and its LAST wave is always the elite that guards it - the Castle's
 * being The King, whose fall is what an ascension is. Everything here is a
 * pure table plus a seeded roll, because the server replays a battle through
 * the same code to verify the score.
 */

export type Location = {
  id: string;
  /** The name the map card shows. */
  name: string;
  /** Background art key, matching `BG_FOR` in monsters.ts. */
  region: string;
  /** Drawn at random for every wave but the last. Each location's pool sits
   *  one tier above the one before it, so the HP a battle asks for climbs with
   *  the map rather than jumping about inside a location. */
  mobs: string[];
  /** The elite that ends the battle. */
  boss: string;
  minWaves: number;
  maxWaves: number;
  /** True only for the Castle: beating this boss is an ascension. */
  king?: boolean;
  /** One line for the map card. */
  blurb: string;
  /** The pin sprite's key under `/art/PocketKnights/Map/`. */
  pin: string;
  /** Where the pin sits on the map art, as percentages of it. The artwork is
   *  the same 384x852 Base.png Neura Knights uses, so these are its positions. */
  at: { top?: string; bottom?: string; left?: string; right?: string };
};

export const LOCATIONS: Location[] = [
  {
    id: 'forest',
    name: 'GREENWOOD',
    region: 'Forest',
    mobs: ['Bandit Scout'],
    boss: 'Bandit Leader',
    minWaves: 3,
    maxWaves: 3,
    blurb: 'Bandits on the road. Short, and it forgives a bad link.',
    pin: '02_Forest',
    at: { bottom: '19%', left: '7.75%' },
  },
  {
    id: 'bridge',
    name: 'OLD BRIDGE',
    region: 'Bridge',
    mobs: ['Bandit Scout', 'Bandit Leader'],
    boss: 'Bridge Troll',
    minWaves: 3,
    maxWaves: 4,
    blurb: 'The toll is paid in HP. The troll hits like a wall falling.',
    pin: '03_Bridge',
    at: { bottom: '35%', right: '8.75%' },
  },
  {
    id: 'caves',
    name: 'DRIPSTONE CAVES',
    region: 'Caves',
    mobs: ['Cave Bat', 'Slime'],
    boss: 'Cave Mother Slime',
    minWaves: 3,
    maxWaves: 4,
    blurb: 'Big pools, slow swings. Bring something that keeps hitting.',
    pin: '04_Caves',
    at: { bottom: '42.5%', left: '3%' },
  },
  {
    id: 'ghost',
    name: 'GHOST TOWN',
    region: 'Ghost Town',
    mobs: ['Wandering Spirit', 'Poltergeist'],
    boss: 'Phantom Warlord',
    minWaves: 4,
    maxWaves: 5,
    blurb: 'Five waves of dead men. Block is worth more than damage here.',
    pin: '05_Ghost_Town',
    at: { top: '27.75%', right: '2.75%' },
  },
  {
    id: 'mountain',
    name: 'FROSTSPIRE',
    region: 'Mountain',
    mobs: ['Ice Golem', 'Frost Dragonling'],
    boss: 'Ice Queen',
    minWaves: 4,
    maxWaves: 5,
    blurb: 'Armoured and patient. The Queen punishes a wasted turn.',
    pin: '06_Mountain',
    at: { top: '22.5%', left: '4%' },
  },
  {
    id: 'castle',
    name: 'THE CASTLE',
    region: 'Castle',
    mobs: ['Castle Guard', 'Champion Knight'],
    boss: 'The King',
    minWaves: 4,
    maxWaves: 5,
    king: true,
    blurb: 'The King holds the last wave. Put him down and you ascend.',
    pin: '07_Castle',
    at: { top: '2.5%', right: '1.25%' },
  },
];

export const FIRST_LOCATION = LOCATIONS[0]!.id;

export const locationIndex = (id: string): number => {
  const i = LOCATIONS.findIndex((l) => l.id === id);
  return i < 0 ? 0 : i;
};

export const locationById = (id: string): Location =>
  LOCATIONS[locationIndex(id)]!;

/** Every location is cleared, so the next kill of The King is what ascends. */
export const MAP_LENGTH = LOCATIONS.length;

/**
 * Ascension. Each one compounds the whole map: pools deepen, swings land
 * harder, and the score a battle is worth grows with them, so climbing again
 * is a bigger number rather than the same one twice.
 */
export const ASCENSION_HP_X100 = 132;
export const ASCENSION_STR_X100 = 118;
export const ASCENSION_SCORE_X100 = 125;
/** Past this the numbers stop meaning anything, so the ladder stops here. */
export const MAX_ASCENSION = 9;

export const compoundX100 = (x100: number, times: number): number => {
  let v = 1;
  for (let i = 0; i < times; i++) v = (v * x100) / 100;
  return v;
};

/** The battle's rung on the whole road, which is what the stat ramps read -
 *  waves restart at 1 every location, but difficulty must not. */
export const difficultyStep = (locIndex: number, wave: number): number =>
  locIndex * 3 + wave;

/** The King is the last wave of the last location. */
export const KING_LOCATION = LOCATIONS.find((l) => l.king)!.id;

export type WavePlan = {
  /** Monster name, as `MONSTER_BASE_HP` keys it. */
  name: string;
  boss: boolean;
};

/**
 * Roll the battle. Consumes exactly `1 + waves` numbers off the stream, always
 * in this order, so a replay of the same seed plans the same fight.
 */
export const planBattle = (loc: Location, rng: () => number): WavePlan[] => {
  const span = Math.max(1, loc.maxWaves - loc.minWaves + 1);
  const count = loc.minWaves + Math.floor(rng() * span);
  const plan: WavePlan[] = [];
  for (let w = 1; w <= count; w++) {
    const roll = Math.floor(rng() * loc.mobs.length);
    plan.push(
      w === count
        ? { name: loc.boss, boss: true }
        : { name: loc.mobs[Math.min(roll, loc.mobs.length - 1)]!, boss: false }
    );
  }
  return plan;
};

/** The King sits above an ordinary elite: he is the gate on an ascension, so
 *  he is meant to end a run that arrived underbuilt. */
export const KING_HP_X100 = 130;
export const KING_STR_X100 = 110;

/** The map artwork's native size. Pins are placed against these, and the image
 *  is scaled to COVER the viewport, so a percentage always lands on the same
 *  spot of the drawing whatever the shell is. */
export const MAP_ART = {
  url: '/art/PocketKnights/Map/Base.png',
  w: 384,
  h: 852,
};

export type PinState = 'Default' | 'Active' | 'Locked';

/** A location's pin sprite, in one of its three states. */
export const mapPinUrlFor = (pin: string, state: PinState): string =>
  '/art/PocketKnights/Map/' + pin + '_' + state + '.png';

/** Every pin sprite the map can draw - what the asset test and the art sync
 *  both walk. */
export const MAP_PIN_URLS: string[] = LOCATIONS.flatMap((l) =>
  (['Default', 'Active', 'Locked'] as PinState[]).map((st) =>
    mapPinUrlFor(l.pin, st)
  )
);
