/**
 * CONTINUE?: the offer over the frozen board after a death. Pure render off
 * `ReviveUi` - every string and flag comes from `reviveView.ts`.
 */
import type { ReviveUi } from './reviveView.js';

const PIXEL = 'VolterTitle,Volter,monospace';
const BODY = 'Volter,ui-monospace,monospace';

const stroked = (size: string, color: string, stroke = 5) => ({
  fontFamily: PIXEL,
  fontSize: size,
  lineHeight: '1',
  color,
  WebkitTextStroke: stroke + 'px #000000',
  paintOrder: 'stroke fill' as const,
});

export const ReviveOffer = ({
  rv,
  stop,
}: {
  rv: ReviveUi;
  stop: (e: { stopPropagation: () => void }) => void;
}) =>
  rv.show ? (
    <div
      onClick={stop}
      style={{
        position: 'absolute',
        inset: '0',
        zIndex: '38',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(30,6,12,.72)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="gl-lb-in"
        style={{
          width: '100%',
          maxWidth: '300px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          boxSizing: 'border-box',
          padding: '18px 14px 14px',
          border: '3px solid #000',
          borderRadius: '12px 4px 12px 4px',
          background: 'linear-gradient(180deg, #5A2433 0%, #2B1420 100%)',
          boxShadow: '0 0 0 2px #FF5A6A inset, 0 0 0 4px #000 inset',
          fontFamily: BODY,
        }}
      >
        <div style={stroked('28px', '#FF8A94', 6)}>DEFEATED</div>
        <div
          style={{
            fontSize: '9px',
            lineHeight: '1.6',
            color: '#F2D6DC',
            textAlign: 'center',
          }}
        >
          Get back up at full HP against the same monster. Your board and score
          stay.
        </div>
        <div
          style={{ fontSize: '8px', letterSpacing: '.12em', color: '#C79AA6' }}
        >
          {rv.leftLabel}
        </div>
        <div
          onClick={rv.affordable && !rv.paying ? rv.accept : undefined}
          style={{
            cursor: rv.affordable && !rv.paying ? 'pointer' : 'default',
            alignSelf: 'stretch',
            minHeight: '46px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: '2px solid #000',
            borderRadius: '8px 2px 8px 2px',
            background: rv.affordable ? '#FCE270' : '#8C8C9C',
            boxShadow: rv.affordable
              ? '0 -3px 0 0 #FF961D inset, 0 2px 0 0 #FFF inset'
              : '0 -3px 0 0 #5C5C6A inset, 0 2px 0 0 #C8C8D4 inset',
            fontFamily: PIXEL,
            fontSize: '16px',
            color: '#000',
            opacity: rv.paying ? 0.6 : 1,
            animation:
              rv.affordable && !rv.paying
                ? 'glClaimBounce 2s ease-in-out infinite'
                : undefined,
          }}
        >
          <span>{rv.affordable ? 'CONTINUE' : 'NOT ENOUGH'}</span>
          <img
            src={rv.coinIcon}
            alt=""
            width={18}
            height={18}
            style={{ imageRendering: 'pixelated' }}
          />
          <span>{rv.costLabel}</span>
        </div>
        <div style={{ fontSize: '8px', color: '#C79AA6' }}>
          {rv.balanceLabel}
        </div>
        <div
          onClick={rv.paying ? undefined : rv.decline}
          style={{
            cursor: rv.paying ? 'default' : 'pointer',
            alignSelf: 'stretch',
            minHeight: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #000',
            borderRadius: '8px 2px 8px 2px',
            background: '#1D2956',
            boxShadow: '0 -3px 0 0 #101836 inset, 0 2px 0 0 #3A4C74 inset',
            fontFamily: PIXEL,
            fontSize: '13px',
            color: '#CBD9EC',
          }}
        >
          GIVE UP
        </div>
      </div>
    </div>
  ) : null;
