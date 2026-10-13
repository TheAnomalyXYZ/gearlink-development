// Builds `.design-sync/dist/` - the package the design-sync converter reads:
// index.js + style.css (Vite), fonts/, the .d.ts tree (tsc), package.json.
// Run from the repo root: node .design-sync/build/build.mjs
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const OUT = '.design-sync/dist';
const run = (bin, args) =>
  execFileSync(join('node_modules/.bin', bin), args, { stdio: 'inherit' });

run('vite', ['build', '--config', '.design-sync/build/vite.ds.config.ts']);
run('tsc', ['-p', '.design-sync/build/tsconfig.json']);

const FONTS = 'public/art/NeuraKnights/Fonts';
mkdirSync(join(OUT, 'fonts'), { recursive: true });
for (const f of readdirSync(FONTS)) copyFileSync(join(FONTS, f), join(OUT, 'fonts', f));
// The game's @font-face rules point at the Devvit public dir; the converter
// ships fonts from paths relative to the stylesheet.
const CSS = join(OUT, 'style.css');
writeFileSync(
  CSS,
  readFileSync(CSS, 'utf8').replaceAll('/art/NeuraKnights/Fonts/', './fonts/')
);

writeFileSync(
  join(OUT, 'package.json'),
  JSON.stringify(
    {
      name: 'gearlink-ds',
      version: '0.1.0',
      private: true,
      type: 'module',
      module: './index.js',
      main: './index.js',
      types: './types/.design-sync/build/entry.d.ts',
      style: './style.css',
      exports: {
        '.': {
          types: './types/.design-sync/build/entry.d.ts',
          import: './index.js',
        },
        './style.css': './style.css',
      },
    },
    null,
    2
  ) + '\n'
);
console.log('built ' + OUT);
