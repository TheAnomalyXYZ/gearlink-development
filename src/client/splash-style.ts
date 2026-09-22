/** The feed view's shared surfaces. Their own module so the card and the plain
 *  splash can both draw them without either file exporting a non-component. */
import type { CSSProperties } from 'react';

export const SHELL: CSSProperties = {
  backgroundColor: '#101528',
  backgroundImage: 'url(/art/PocketKnights/sky_v3.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center bottom',
  fontFamily: 'Volter,ui-monospace,monospace',
};

export const SCRIM: CSSProperties = {
  background:
    'linear-gradient(180deg,rgba(11,16,32,.72),rgba(11,16,32,.3) 40%,rgba(16,21,40,.96))',
};

export const TITLE: CSSProperties = {
  fontFamily: "'Yoster Island',Volter,monospace",
  color: '#FFF2B0',
  textShadow: '0 4px 0 #141D2E',
};
