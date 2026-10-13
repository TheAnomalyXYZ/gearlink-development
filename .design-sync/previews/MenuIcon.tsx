import { MenuIcon } from 'gearlink-ds';
import '../preview-kit/game.module.css';

const KINDS = [
  ['map', 'WORLD MAP'],
  ['board', 'LEADERBOARD'],
  ['chest', 'WAR CHEST'],
  ['flair', 'FLAIR'],
  ['settings', 'SETTINGS'],
  ['home', 'HOME'],
] as const;

/** The home menu's rows, laid out as the game draws them. */
export const HomeMenu = () => (
  <div style={{ margin: '0 auto', width: 220, padding: 8, background: '#FDFDFD' }}>
    {KINDS.map(([kind, label]) => (
      <div
        key={kind}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 38,
          padding: '0 8px',
          fontFamily: 'VolterTitle,Volter,monospace',
          fontSize: 12,
          color: '#2B3E60',
        }}
      >
        <MenuIcon kind={kind} />
        {label}
      </div>
    ))}
  </div>
);

/** Black on the end screen's lemon buttons; unknown kinds draw a "?". */
export const OnButtons = () => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: 16 }}>
    {(['home', 'board', 'map', 'mystery'] as const).map((kind) => (
      <div
        key={kind}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 40,
          border: '3px solid #000',
          borderRadius: '8px 2px 8px 2px',
          background: '#FCE270',
          boxShadow: '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset',
        }}
      >
        <MenuIcon kind={kind} color="#000000" />
      </div>
    ))}
  </div>
);
