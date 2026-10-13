/**
 * The game's claim button, the call to action on every feed card. Its own
 * module so the cards' previews and tests can draw it without the entry
 * point's Devvit calls.
 */
import type { MouseEvent } from 'react';
import { PIXEL } from './splash-style.js';

/** The four-point star the Neura Knights claim button twinkles with. */
export const Sparkle = ({ size, cls }: { size: number; cls: string }) => (
  <svg
    className={`glk-star ${cls}`}
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M6.7853 0.558811L7.69829 3.18933C7.88019 3.71054 8.28946 4.11981 8.81067 4.3017L11.4412 5.21469C12.1863 5.47355 12.1863 6.52645 11.4412 6.78531L8.81067 7.6983C8.28946 7.88019 7.88019 8.28946 7.69829 8.81067L6.7853 11.4412C6.52645 12.1863 5.47355 12.1863 5.21469 11.4412L4.3017 8.81067C4.11981 8.28946 3.71053 7.88019 3.18933 7.6983L0.558811 6.78531C-0.18627 6.52645 -0.18627 5.47355 0.558811 5.21469L3.18933 4.3017C3.71053 4.11981 4.11981 3.71054 4.3017 3.18933L5.21469 0.558811C5.47355 -0.18627 6.52645 -0.18627 6.7853 0.558811Z"
      fill="currentColor"
    />
  </svg>
);

/**
 * The game's own claim button: the primary Neura Knights face - lemon
 * fill, hard black border, the orange lip and white gloss pressed in as inset
 * shadows, and the clipped corners on the other diagonal. A sheen sweeps
 * across it on a loop, because the button is the one thing on the card that
 * has to be pressed and nothing else on the card moves sideways.
 *
 * `sparkle` gives it the four twinkling stars a claimable quest wears, which
 * is the same signal: there is something here waiting to be taken. They sit on
 * a wrapper rather than the button, which clips its own sheen.
 */
export const Enter = ({
  label,
  sparkle = false,
  onClick,
}: {
  label: string;
  sparkle?: boolean;
  /** Opening the post is a host call, so the entry point passes it in and
   *  the button stays plain markup. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}) => (
  <div className="relative mt-1 overflow-visible">
    <button
      className="relative flex h-10 cursor-pointer items-center justify-center overflow-hidden px-5 transition-all duration-100 hover:brightness-110"
      style={{
        border: '3px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: '#FCE270',
        boxShadow:
          '0 -4px 0 0 #FF961D inset, 0 4px 0 0 #FFF inset, 0 2px 0 0 rgba(0,0,0,.25)',
        color: '#000',
        fontFamily: PIXEL,
        fontSize: 14,
        letterSpacing: '.04em',
      }}
      onClick={onClick}
    >
      <span className="relative uppercase">{label}</span>
      <span
        className="glk-sheen pointer-events-none absolute inset-y-0 w-10 -skew-x-12"
        style={{
          background:
            'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.75),rgba(255,255,255,0))',
        }}
      />
    </button>
    {sparkle ? (
      <>
        <Sparkle size={8} cls="glk-s1" />
        <Sparkle size={10} cls="glk-s2" />
        <Sparkle size={7} cls="glk-s3" />
        <Sparkle size={9} cls="glk-s4" />
      </>
    ) : null}
  </div>
);
