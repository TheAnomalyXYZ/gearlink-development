/* Sharp-bilinear tile icons. Each source is trimmed to its visible pixels and
 * blown up nearest-neighbour by the smallest whole factor that takes its long
 * side to 256px or more; the browser's smooth downscale of that big source keeps
 * the art pixels even at any tile size, with at most a 1-device-px soft edge.
 * Trimming also evens out footprints: full-canvas weapons and padded armour fit
 * the same box. Cached per source URL; until a source is ready the original is
 * shown. */
const MIN_LONG = 256;
const cache = new Map<string, string>();
const pending = new Set<string>();
let notify: (() => void) | null = null;
let queued = false;

/** Called (batched per tick) when new crisp icons are ready. */
export const setCrispNotify = (fn: (() => void) | null): void => {
  notify = fn;
};

const ping = (): void => {
  if (queued || !notify) return;
  queued = true;
  setTimeout(() => {
    queued = false;
    if (notify) notify();
  }, 0);
};

const build = (src: string): Promise<string> =>
  new Promise<string>((ok, no) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth,
        h = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      if (!g) return ok(src);
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      let x0 = w,
        y0 = h,
        x1 = -1,
        y1 = -1;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if ((d[(y * w + x) * 4 + 3] ?? 0) > 8) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      if (x1 < 0) return ok(src);
      const tw = x1 - x0 + 1,
        th = y1 - y0 + 1;
      const k = Math.ceil(MIN_LONG / Math.max(tw, th));
      const o = document.createElement('canvas');
      o.width = tw * k;
      o.height = th * k;
      const og = o.getContext('2d');
      if (!og) return ok(src);
      og.imageSmoothingEnabled = false;
      og.drawImage(c, x0, y0, tw, th, 0, 0, tw * k, th * k);
      // blob URL, not a data URL: the template's style parser splits on ';'
      o.toBlob(
        (blob) => (blob ? ok(URL.createObjectURL(blob)) : ok(src)),
        'image/png'
      );
    };
    img.onerror = no;
    img.src = src;
  });

const load = (src: string): void => {
  if (!src || cache.has(src) || pending.has(src)) return;
  pending.add(src);
  build(src)
    .then((url) => {
      cache.set(src, url);
      pending.delete(src);
      ping();
    })
    .catch(() => {
      cache.set(src, src);
      pending.delete(src);
    });
};

/** The crisp version of `src` if it is ready, else `src` (and start on it). */
export const crisp = (src: string): string => {
  if (!src) return src;
  const u = cache.get(src);
  if (u) return u;
  load(src);
  return src;
};

/** Warm the cache for every icon a battle or duel can show. */
export const preloadCrisp = (srcs: Iterable<string>): void => {
  for (const s of srcs) load(s);
};
