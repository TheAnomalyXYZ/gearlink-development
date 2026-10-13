/**
 * Makes the game's root-absolute art paths work outside the Devvit host.
 *
 * In the game, `/art/...`, `/icons/...`, `/avatars/...` and `/fx/...` are
 * served from `public/`. Claude Design has no such server, and many of those
 * paths are built at runtime (`pin + '_' + state + '.png'`), so they can't be
 * rewritten at build time. Instead every image under `public/` ships as a
 * data URI (the `virtual:gl-assets` map). Image sources are swapped where
 * they are set (`img.src`, `setAttribute('src')`); CSS `url()`s are swapped
 * by a MutationObserver on `style` attributes, which runs before the next
 * paint. (Chromium exposes style properties through a named-property
 * interceptor, not prototype accessors, so they can't be wrapped.) Unknown
 * paths pass through untouched.
 */
import MAP from 'virtual:gl-assets';

const URL_RE = /url\((['"]?)(\/[^'")]+)\1\)/g;
const HAS_URL = /url\(['"]?\//;

/** The data URI for a `public/` image path, or the path itself if unknown. */
export const asset = (path: string): string => MAP[path] ?? path;

/** Every image path the bundle carries, e.g. `/art/NeuraKnights/Characters/Hero.png`. */
export const ASSET_PATHS: readonly string[] = Object.keys(MAP);

const css = (v: unknown): unknown =>
  typeof v === 'string' && v.includes('url(')
    ? v.replace(URL_RE, (m, q: string, p: string) =>
        MAP[p] ? 'url(' + q + MAP[p] + q + ')' : m
      )
    : v;

const src = (v: unknown): unknown =>
  typeof v === 'string' && MAP[v] ? MAP[v] : v;

const wrapSetter = (
  proto: object,
  prop: string,
  map: (v: unknown) => unknown
): void => {
  let p: object | null = proto;
  while (p) {
    const d = Object.getOwnPropertyDescriptor(p, prop);
    if (d?.set) {
      const set = d.set;
      Object.defineProperty(p, prop, {
        ...d,
        set(this: unknown, v: unknown) {
          set.call(this, map(v));
        },
      });
      return;
    }
    p = Object.getPrototypeOf(p);
  }
};

const fixStyle = (el: Element): void => {
  const v = el.getAttribute('style');
  // Chromium serialises style urls quoted: url("/art/...").
  if (!v || !HAS_URL.test(v)) return;
  const next = css(v);
  if (typeof next === 'string' && next !== v) el.setAttribute('style', next);
};

const fixTree = (node: Node): void => {
  if (!(node instanceof Element)) return;
  fixStyle(node);
  node.querySelectorAll('[style*="url("]').forEach(fixStyle);
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  wrapSetter(HTMLImageElement.prototype, 'src', src);
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name: string, value: string) {
    const n = name.toLowerCase();
    const v =
      n === 'src' || n === 'href' || n === 'xlink:href'
        ? src(value)
        : n === 'style'
          ? css(value)
          : value;
    setAttribute.call(this, name, String(v));
  };
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') fixStyle(r.target as Element);
      else r.addedNodes.forEach(fixTree);
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style'],
  });
}
