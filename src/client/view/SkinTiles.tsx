/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The outfit cards: sprite, name, how it is earned, and its WEAR / buy button.
 * One grid for the outfit picker, the knights page and the shop's outfits tab,
 * fed by buildView's `skinTile`.
 */
const PIXEL = 'VolterTitle,Volter,monospace';

export const SkinTiles = ({
  skins,
  cols = 2,
}: {
  skins: any[];
  cols?: number;
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: '8px',
    }}
  >
    {skins.map((k: any, kI: number) => (
      <div
        key={kI}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 6px',
          background: '#FFFFFF',
          border: `2px solid ${k.bd}`,
          borderRadius: '6px 2px 6px 2px',
        }}
      >
        <img
          src={k.img}
          alt={k.name}
          style={{
            height: '96px',
            aspectRatio: k.ar,
            imageRendering: 'pixelated',
            filter: k.filter,
          }}
        />
        {k.sub ? (
          <div
            style={{
              fontFamily: PIXEL,
              fontSize: '9px',
              letterSpacing: '.06em',
              color: '#4B6A85',
              textAlign: 'center',
            }}
          >
            {k.sub}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: PIXEL,
            fontSize: '11px',
            color: '#1D2956',
            textAlign: 'center',
          }}
        >
          {k.name}
        </div>
        <div
          style={{
            minHeight: '26px',
            fontSize: '9px',
            lineHeight: '1.4',
            color: k.lineColor,
            textAlign: 'center',
            textWrap: 'balance',
          }}
        >
          {k.line}
        </div>
        {k.btn ? (
          <div
            onClick={k.btn.run}
            style={{
              alignSelf: 'stretch',
              cursor: k.btn.run ? 'pointer' : 'default',
              opacity: k.btn.opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '32px',
              border: '3px solid #000000',
              borderRadius: '8px 2px 8px 2px',
              background: k.btn.bg,
              boxShadow: k.btn.shadow,
              color: '#000000',
              fontFamily: PIXEL,
              fontSize: '11px',
              whiteSpace: 'nowrap',
            }}
          >
            {k.btn.icon ? (
              <img
                src={k.btn.icon}
                alt=""
                style={{ width: '14px', height: '14px' }}
              />
            ) : null}
            {k.btn.label}
          </div>
        ) : null}
      </div>
    ))}
  </div>
);
