/* Board tile palette for v3: every orb type on a board gets its own hue, drawn
 * from a family that still reads as its category (warm = attack, cool = block,
 * green = effect). Client-only; the engine never sees colour. */

/** [face, lip, top, rim] for one hue family. */
type FamilySwatch = readonly [string, string, string, string];

export const FAMILIES = {
  red: ['#8E2A36', '#561520', '#B23A44', '#FF8A80'],
  amber: ['#74400F', '#46250A', '#8A4E16', '#FFC266'],
  magenta: ['#82285F', '#4E1338', '#A33479', '#FF8AD8'],
  blue: ['#2847A0', '#142663', '#3459C2', '#8AB4FF'],
  teal: ['#16707A', '#0A4048', '#1C8C96', '#7FF0EA'],
  violet: ['#5A3299', '#331A5E', '#6E40B8', '#C29BFF'],
  green: ['#2F7A3A', '#174520', '#3B9447', '#9CF08F'],
} satisfies Record<string, FamilySwatch>;

export type FamilyName = keyof typeof FAMILIES;

const FAMILY_NAMES: readonly FamilyName[] = [
  'red',
  'amber',
  'magenta',
  'blue',
  'teal',
  'violet',
  'green',
];

const POOLS: Record<'attack' | 'block' | 'effect', readonly FamilyName[]> = {
  attack: ['red', 'amber', 'magenta'],
  block: ['blue', 'teal', 'violet'],
  effect: ['green', 'violet', 'amber'],
};

/** Colours for one tile frame. `fam` names the family (or junk/empty/bomb). */
export type TilePalette = {
  fam: string;
  face: string;
  lip: string;
  top: string;
  rim: string;
};

/* v4: faces and top bands run ~10% less saturated (HSL) so the icon owns the
   brightest pixels on every tile; lips and rims keep their colour. */
const tone = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2;
  if (mx === mn) return hex;
  const d = mx - mn;
  const s = (l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)) * 0.9;
  const h =
    (mx === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : mx === g
        ? (b - r) / d + 2
        : (r - g) / d + 4) / 6;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
    p = 2 * l - q;
  const f = (t: number): string => {
    t = ((t % 1) + 1) % 1;
    const v =
      t < 1 / 6
        ? p + (q - p) * 6 * t
        : t < 1 / 2
          ? q
          : t < 2 / 3
            ? p + (q - p) * (2 / 3 - t) * 6
            : p;
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return '#' + f(h + 1 / 3) + f(h) + f(h - 1 / 3);
};
const fam = (name: FamilyName): TilePalette => {
  const [face, lip, top, rim] = FAMILIES[name];
  return { fam: name, face: tone(face), lip, top: tone(top), rim };
};
export const JUNK_PAL: TilePalette = {
  fam: 'junk',
  face: tone('#3E4657'),
  lip: '#20262F',
  top: tone('#4A5366'),
  rim: '#6A7387',
};
export const JUNK_CRACKED: TilePalette = {
  fam: 'junk',
  face: tone('#6A7387'),
  lip: '#3E4657',
  top: tone('#7C869B'),
  rim: '#A3ADC2',
};
export const EMPTY_PAL: TilePalette = {
  fam: 'empty',
  face: tone('#141D2E'),
  lip: '#0B0D1A',
  top: tone('#18233A'),
  rim: '#24314D',
};
/** Bombs share the frame and lip; they read as special by their ember rim and glow. */
export const BOMB_PAL: TilePalette = {
  fam: 'bomb',
  face: '#2A2A3A',
  lip: '#15151F',
  top: '#3A3A4E',
  rim: '#FFB84D',
};

/** Anything with an effect category: a gear piece, an orb. */
export type PaletteSlot = { effect: string } | null | undefined;

const isPoolKey = (k: string): k is keyof typeof POOLS => k in POOLS;

const cache = new WeakMap<readonly PaletteSlot[], (TilePalette | null)[]>();
/** Walk the loadout in order; each slot takes the first free hue in its pool. */
export const paletteFor = (
  loadout: readonly PaletteSlot[] | null | undefined
): (TilePalette | null)[] => {
  if (!loadout) return [];
  const hit = cache.get(loadout);
  if (hit) return hit;
  const used = new Set<FamilyName>();
  const out = loadout.map((g) => {
    if (!g) return null;
    const pool = isPoolKey(g.effect) ? POOLS[g.effect] : POOLS.effect;
    const name: FamilyName =
      pool.find((f) => !used.has(f)) ??
      FAMILY_NAMES.find((f) => !used.has(f)) ??
      pool[0] ??
      'green';
    used.add(name);
    return fam(name);
  });
  cache.set(loadout, out);
  return out;
};

export type TileVars = {
  face: string;
  lip: string;
  top: string;
  rimC: string;
  lipW: string;
  iconLift: string;
  bg: string;
};

/** Template values for one tile frame. A lifted (chained) tile gets a white rim
 *  and a deeper lip. */
export const tileVars = (pal: TilePalette, lifted: boolean): TileVars => ({
  face: pal.face,
  lip: pal.lip,
  top: pal.top,
  rimC: lifted ? '#FFFFFF' : pal.rim,
  lipW: lifted ? '8px' : '6px',
  iconLift: lifted ? '-2px' : '0px',
  bg: pal.face,
});

/** Picked tiles lift and tilt a little, the tilt seeded by the cell so it is
 *  stable while dragging. */
export const liftT = (i: number): string => {
  const j = ((i * 9301 + 49297) % 233280) / 233280;
  return (
    'translateY(-3px) scale(1.08) rotate(' + (j * 6 - 3).toFixed(2) + 'deg)'
  );
};

/** [url, artPx]: an icon source and its size in whole art pixels. */
export type TileIcon = readonly [string, number];

/* Tile icons, normalised to whole art pixels (public/fx/icons). Gear card art
   is 32 art px stored at 2x. Keys are the engine's EFFECT_ICON / JUNK_ICON urls. */
const P = '/art/PocketKnights/';
const NORM: Record<string, TileIcon> = {
  [P + 'Battle/Intent/Attack.png']: ['/fx/icons/attack.png', 18],
  [P + 'Battle/Effects/Shield.png']: ['/fx/icons/block.png', 9],
  [P + 'Item/RegularHealthPotion_v1.png']: ['/fx/icons/effect.png', 31],
  [P + 'Battle/Effects/Ignore.png']: ['/fx/icons/junk.png', 10],
};
export const BOMB_TILE: TileIcon = ['/fx/icons/bomb.png', 17];

/** [url, artPx] for a tile icon (crispIcon.ts trims and upscales it). */
export const tileIcon = (url: string, isBomb: boolean): TileIcon =>
  isBomb ? BOMB_TILE : (NORM[url] ?? [url, 32]);

const dprNow = (): number =>
  (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
export const snapPx = (px: number): number => {
  const d = dprNow();
  return Math.floor(px * d) / d;
};

/** Resolve stagger: step(k) = max(28, 70 - 7k), accumulated. */
export const stepDelays = (n: number): number[] => {
  const d = [0];
  for (let k = 1; k < n; k++)
    d.push((d[k - 1] ?? 0) + Math.max(28, 70 - 7 * k));
  return d;
};
