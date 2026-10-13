/**
 * Library build of `.design-sync/build/entry.ts` for Claude Design: one ESM
 * file with React external (the converter re-bundles it as an IIFE), and one
 * stylesheet with Tailwind compiled from the repo's sources. Images under
 * `public/` become the `virtual:gl-assets` data-URI map (fonts are handled
 * by build.mjs).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

const ROOT = resolve(import.meta.dirname, '../..');
const PUBLIC = join(ROOT, 'public');
const OUT = join(ROOT, '.design-sync/dist');

const MIME: Record<string, string> = {
  png: 'image/png',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const images = (): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const f of walk(PUBLIC).sort()) {
    const mime = MIME[f.split('.').pop()?.toLowerCase() ?? ''];
    if (!mime) continue;
    const path = '/' + relative(PUBLIC, f).split(sep).join('/');
    map[path] =
      'data:' + mime + ';base64,' + readFileSync(f).toString('base64');
  }
  return map;
};

const glAssets = (): Plugin => {
  const id = 'virtual:gl-assets';
  let map: Record<string, string> = {};
  return {
    name: 'gl-assets',
    buildStart() {
      map = images();
    },
    resolveId: (s) => (s === id ? '\0' + id : null),
    load: (s) =>
      s === '\0' + id ? 'export default ' + JSON.stringify(map) : null,
  };
};

export default defineConfig({
  root: ROOT,
  publicDir: false,
  plugins: [react(), tailwind(), glAssets()],
  define: { __BUILD_ID__: JSON.stringify('design-sync') },
  build: {
    outDir: OUT,
    emptyOutDir: true,
    copyPublicDir: false,
    cssCodeSplit: false,
    minify: false,
    lib: {
      entry: join(ROOT, '.design-sync/build/entry.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/],
    },
  },
});
