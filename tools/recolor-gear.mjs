/**
 * Draw the art for flavoured gear variants by palette-swapping their base
 * piece's sprite, so a variant needs no hand-drawn art:
 *
 *   npm run test:unit   (or: tsc -p tools/tsconfig.test.json)
 *   node tools/recolor-gear.mjs
 *
 * Each variant takes the look of its rider from the design canvas's Variant
 * catalog: the base sprite run through that rider's CSS filter chain
 * (sepia / saturate / hue-rotate / brightness). The filters are applied with
 * the same colour matrices browsers use, so the PNG matches the catalog.
 * Zero dependencies: the sprites are small 8-bit RGBA PNGs, decoded and
 * re-encoded here with node:zlib.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import {
  GEAR,
  getGearImageUrl,
  riderOf,
} from '../dist/test/shared/engine/index.js';

const OUT = 'public';

/** The Variant catalog's filter per rider, verbatim. */
const FILTER = {
  burn: 'sepia(0.6) saturate(2.4) hue-rotate(-25deg) brightness(1.05)',
  frost: 'hue-rotate(170deg) saturate(1.4) brightness(1.1)',
  mark: 'hue-rotate(280deg) saturate(1.6)',
  strength: 'sepia(0.5) saturate(2) hue-rotate(5deg) brightness(1.1)',
  grit: 'hue-rotate(90deg) saturate(1.4)',
};

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const decode = (buf) => {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let at = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0)
        throw new Error('only 8-bit RGBA, non-interlaced');
    } else if (type === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[y * stride + x - 4] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
      let v = row[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = v & 0xff;
    }
  }
  return { width, height, px };
};

const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

const encode = ({ width, height, px }) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++)
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** The Filter Effects spec's matrices for the CSS filter functions. */
const MATRIX = {
  sepia: (a) => {
    const k = 1 - Math.min(1, a);
    return [
      [0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k],
      [0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k],
      [0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k],
    ];
  },
  saturate: (s) => [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
  ],
  'hue-rotate': (deg) => {
    const c = Math.cos((deg * Math.PI) / 180);
    const n = Math.sin((deg * Math.PI) / 180);
    return [
      [
        0.213 + c * 0.787 - n * 0.213,
        0.715 - c * 0.715 - n * 0.715,
        0.072 - c * 0.072 + n * 0.928,
      ],
      [
        0.213 - c * 0.213 + n * 0.143,
        0.715 + c * 0.285 + n * 0.14,
        0.072 - c * 0.072 - n * 0.283,
      ],
      [
        0.213 - c * 0.213 - n * 0.787,
        0.715 - c * 0.715 + n * 0.715,
        0.072 + c * 0.928 + n * 0.072,
      ],
    ];
  },
  brightness: (b) => [
    [b, 0, 0],
    [0, b, 0],
    [0, 0, b],
  ],
};

/** "sepia(0.6) hue-rotate(-25deg)" -> its matrices, in order. */
const parseFilter = (css) =>
  [...css.matchAll(/([a-z-]+)\(\s*(-?[\d.]+)(deg)?\s*\)/g)].map(([, fn, v]) => {
    const make = MATRIX[fn];
    if (!make) throw new Error('unsupported filter ' + fn);
    return make(Number(v));
  });

const clamp = (v) => Math.max(0, Math.min(1, v));

/** Each function runs on the clamped result of the one before, as in a
 *  browser. Alpha is untouched. */
const recolor = (img, css) => {
  const steps = parseFilter(css);
  const { px } = img;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    let rgb = [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255];
    for (const m of steps)
      rgb = m.map((row) =>
        clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])
      );
    px[i] = Math.round(rgb[0] * 255);
    px[i + 1] = Math.round(rgb[1] * 255);
    px[i + 2] = Math.round(rgb[2] * 255);
  }
  return img;
};

let written = 0;
for (const g of GEAR) {
  if (!g.variantOf) continue;
  const rider = riderOf(g.id);
  const filter = rider && FILTER[rider.r];
  if (!filter) throw new Error(g.id + ' has no rider to take a colour from');
  const src = join(OUT, getGearImageUrl(g.variantOf));
  const dest = join(OUT, getGearImageUrl(g.id));
  const img = recolor(decode(await readFile(src)), filter);
  await writeFile(dest, encode(img));
  written++;
  console.log('wrote ' + dest);
}
console.log('\n' + written + ' variant sprites written.');
