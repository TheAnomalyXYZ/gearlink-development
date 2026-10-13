import { useState } from 'react';
import { SpeakerIcon, VolumeSlider } from 'gearlink-ds';
import '../preview-kit/game.module.css';

/** One settings row as the game lays it out: label, speaker glyph, slider. */
const Row = ({ label, initial }: { label: string; initial: number }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 'bold', color: '#4B6A85' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SpeakerIcon value={value} />
        <VolumeSlider label={label} value={value} onChange={setValue} />
      </div>
    </>
  );
};

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      width: 300,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: 16,
      background: '#FDFDFD',
      borderRadius: 2,
      fontFamily: 'Volter,ui-monospace,monospace',
    }}
  >
    {children}
  </div>
);

/** The settings panel's two sliders, draggable. */
export const SettingsPanel = () => (
  <Panel>
    <Row label="MUSIC" initial={70} />
    <div style={{ marginTop: 4 }} />
    <Row label="SOUND EFFECTS" initial={35} />
  </Panel>
);

/** The three levels the speaker glyph tracks: off, low, high. */
export const Levels = () => (
  <Panel>
    <Row label="MUTED" initial={0} />
    <Row label="LOW" initial={30} />
    <Row label="FULL" initial={100} />
  </Panel>
);
