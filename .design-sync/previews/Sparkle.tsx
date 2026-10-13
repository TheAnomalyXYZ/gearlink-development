import { Sparkle } from 'gearlink-ds';
import '../preview-kit/game.module.css';

/** The four-point twinkle a claimable reward wears. `cls` picks a corner:
 *  glk-s1 top-left, glk-s2 top-right, glk-s3 bottom-left, glk-s4 bottom-right
 *  of the nearest positioned box. */
export const Corners = () => (
  <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
    <div
      style={{
        position: 'relative',
        width: 180,
        height: 44,
        border: '3px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: '#1D2956',
      }}
    >
      <Sparkle size={8} cls="glk-s1" />
      <Sparkle size={10} cls="glk-s2" />
      <Sparkle size={7} cls="glk-s3" />
      <Sparkle size={9} cls="glk-s4" />
    </div>
  </div>
);
