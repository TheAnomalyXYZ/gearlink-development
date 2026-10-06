/**
 * The settings panel's volume slider, its speaker glyph, and the home menu's
 * item icons - drawn to match the Neura Knights originals.
 *
 * The slider is hand-built rather than a styled `<input type="range">` because
 * the diamond thumb and the two-tone track can't be styled the same way across
 * WebKit, Blink and Gecko. It holds no state: the value comes in, every drag or
 * key press goes straight back out through `onChange`.
 */
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

const TRACK = '#1D2956';
const FILL = '#FCE370';

const valueAt = (e: ReactPointerEvent<HTMLDivElement>): number => {
  const r = e.currentTarget.getBoundingClientRect();
  if (r.width <= 0) return 0;
  return Math.round(
    Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 100
  );
};

export const VolumeSlider = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) => {
  const set = (n: number) => {
    const next = Math.min(100, Math.max(0, n));
    if (next !== value) onChange(next);
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture only keeps the drag alive off the track */
    }
    set(valueAt(e));
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) set(valueAt(e));
  };
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? -1
          : e.key === 'PageUp'
            ? 10
            : e.key === 'PageDown'
              ? -10
              : 0;
    if (e.key === 'Home') set(0);
    else if (e.key === 'End') set(100);
    else if (step) set(value + step);
    else return;
    e.preventDefault();
  };
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onKeyDown={onKey}
      style={{
        position: 'relative',
        flex: '1 1 auto',
        display: 'flex',
        alignItems: 'center',
        height: '20px',
        touchAction: 'none',
        userSelect: 'none',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '6px',
          overflow: 'hidden',
          borderRadius: '9999px',
          background: TRACK,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: '0',
            width: value + '%',
            borderRadius: '10px',
            background: FILL,
          }}
        ></div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: value + '%',
          width: '16px',
          height: '16px',
          boxSizing: 'border-box',
          border: '3px solid ' + TRACK,
          background: FILL,
          boxShadow: '0 1px 3px rgba(0,0,0,.25)',
          transform: 'translate(-50%,-50%) rotate(45deg)',
          pointerEvents: 'none',
        }}
      ></div>
    </div>
  );
};

const STROKE = {
  stroke: 'black',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Speaker with no, one or two sound waves, for off / low / high. */
export const SpeakerIcon = ({ value }: { value: number }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    {value === 0 ? (
      <>
        <path
          {...STROKE}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.5328 9.46716L7.71351 16.287C7.53626 16.1844 7.36835 16.1191 7.21909 16.1097C5.92239 16.0164 5.41864 16.1657 4.70965 15.5593C3.9447 14.9062 4.00067 13.1616 4.00067 11.8835C4.00067 10.6054 3.9447 8.86075 4.70965 8.20769C5.41864 7.60128 5.92239 7.75988 7.21909 7.65725C8.51578 7.55463 11.2584 3.59894 13.3761 4.84909C14.2343 5.5488 14.4675 6.85492 14.5328 9.46716Z"
        />
        <path
          {...STROKE}
          d="M14.5329 13.9173C14.4956 16.7908 14.2717 18.1902 13.3762 18.9179C12.3966 19.4963 11.2865 18.9645 10.2417 18.2088"
        />
        <path
          {...STROKE}
          d="M4.00122 20.0001L7.71406 16.287L14.5334 9.46718L20 4.00012"
        />
      </>
    ) : value < 50 ? (
      <>
        <path
          {...STROKE}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.00185 12.0003C3.99906 13.2299 3.94419 14.9071 4.70494 15.534C5.41453 16.1188 5.91395 15.9682 7.20945 16.0632C8.50587 16.1592 11.242 19.9701 13.3512 18.7647C14.4393 17.909 14.5202 16.1152 14.5202 12.0003C14.5202 7.88528 14.4393 6.09147 13.3512 5.23583C11.242 4.0295 8.50587 7.84133 7.20945 7.9373C5.91395 8.03237 5.41453 7.88169 4.70494 8.46647C3.94419 9.0934 3.99906 10.7706 4.00185 12.0003Z"
        />
        <path
          {...STROKE}
          d="M18.5813 8.31451C19.8926 10.6052 19.8926 13.4026 18.5813 15.6861"
        />
      </>
    ) : (
      <>
        <path
          {...STROKE}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2.50185 12.0003C2.49906 13.2299 2.44419 14.9071 3.20494 15.534C3.91453 16.1188 4.41395 15.9682 5.70945 16.0632C7.00587 16.1592 9.74195 19.9701 11.8512 18.7647C12.9393 17.909 13.0202 16.1152 13.0202 12.0003C13.0202 7.88528 12.9393 6.09147 11.8512 5.23583C9.74195 4.0295 7.00587 7.84133 5.70945 7.9373C4.41395 8.03237 3.91453 7.88169 3.20494 8.46647C2.44419 9.0934 2.49906 10.7706 2.50185 12.0003Z"
        />
        <path
          {...STROKE}
          d="M19.5842 5.90411C22.1343 9.57513 22.1427 14.4175 19.5842 18.0957"
        />
        <path
          {...STROKE}
          d="M17.0813 8.31451C18.3926 10.6052 18.3926 13.4026 17.0813 15.6861"
        />
      </>
    )}
  </svg>
);

const MENU_BLUE = '#428FFB';

/** The leading glyph on a home menu row. */
export const MenuIcon = ({ kind }: { kind: string }) =>
  kind === 'board' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 21H2V9H7.5V21ZM14.75 3H9.25V21H14.75V3ZM22 11H16.5V21H22V11Z"
        fill={MENU_BLUE}
      />
    </svg>
  ) : kind === 'flair' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21.41 11.58L12.41 2.58C12.05 2.22 11.55 2 11 2H4C2.9 2 2 2.9 2 4V11C2 11.55 2.22 12.05 2.59 12.42L11.59 21.42C11.95 21.78 12.45 22 13 22C13.55 22 14.05 21.78 14.41 21.41L21.41 14.41C21.78 14.05 22 13.55 22 13C22 12.45 21.77 11.94 21.41 11.58ZM5.5 7C4.67 7 4 6.33 4 5.5C4 4.67 4.67 4 5.5 4C6.33 4 7 4.67 7 5.5C7 6.33 6.33 7 5.5 7Z"
        fill={MENU_BLUE}
      />
    </svg>
  ) : kind === 'settings' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19.1401 12.94C19.1801 12.64 19.2001 12.33 19.2001 12C19.2001 11.68 19.1801 11.36 19.1301 11.06L21.1601 9.48002C21.3401 9.34002 21.3901 9.07002 21.2801 8.87002L19.3601 5.55002C19.2401 5.33002 18.9901 5.26002 18.7701 5.33002L16.3801 6.29002C15.8801 5.91002 15.3501 5.59002 14.7601 5.35002L14.4001 2.81002C14.3601 2.57002 14.1601 2.40002 13.9201 2.40002H10.0801C9.84011 2.40002 9.65011 2.57002 9.61011 2.81002L9.25011 5.35002C8.66011 5.59002 8.12011 5.92002 7.63011 6.29002L5.24011 5.33002C5.02011 5.25002 4.77011 5.33002 4.65011 5.55002L2.74011 8.87002C2.62011 9.08002 2.66011 9.34002 2.86011 9.48002L4.89011 11.06C4.84011 11.36 4.80011 11.69 4.80011 12C4.80011 12.31 4.82011 12.64 4.87011 12.94L2.84011 14.52C2.66011 14.66 2.61011 14.93 2.72011 15.13L4.64011 18.45C4.76011 18.67 5.01011 18.74 5.23011 18.67L7.62011 17.71C8.12011 18.09 8.65011 18.41 9.24011 18.65L9.60011 21.19C9.65011 21.43 9.84011 21.6 10.0801 21.6H13.9201C14.1601 21.6 14.3601 21.43 14.3901 21.19L14.7501 18.65C15.3401 18.41 15.8801 18.09 16.3701 17.71L18.7601 18.67C18.9801 18.75 19.2301 18.67 19.3501 18.45L21.2701 15.13C21.3901 14.91 21.3401 14.66 21.1501 14.52L19.1401 12.94ZM12.0001 15.6C10.0201 15.6 8.40011 13.98 8.40011 12C8.40011 10.02 10.0201 8.40002 12.0001 8.40002C13.9801 8.40002 15.6001 10.02 15.6001 12C15.6001 13.98 13.9801 15.6 12.0001 15.6Z"
        fill={MENU_BLUE}
      />
    </svg>
  ) : (
    <div
      style={{
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'VolterTitle,Volter,monospace',
        fontSize: '18px',
        color: MENU_BLUE,
      }}
    >
      ?
    </div>
  );
