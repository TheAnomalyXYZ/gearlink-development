import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { devvit } from '@devvit/start/vite';

/** Shown in the settings panel, so a bug report says which build it came from. */
const buildId = (): string => {
  const date = new Date().toISOString().slice(0, 10);
  try {
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' });
    return sha.trim() + ' ' + date;
  } catch {
    return date;
  }
};

export default defineConfig({
  plugins: [react(), tailwind(), devvit()],
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
});
