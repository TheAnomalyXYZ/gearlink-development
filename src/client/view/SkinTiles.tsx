/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The outfit cards: sprite, name, how it is earned, and its WEAR / buy button.
 * One grid for the outfit picker, the knights page and the shop's outfits tab,
 * fed by buildView's `skinTile`.
 *
 * Each card is a small display case: the sprite stands on a night-sky stage
 * with a lit floor under its feet, so the outfit reads as a hero on show
 * rather than a cut-out on paper.
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
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '4px 4px 6px',
          background: 'linear-gradient(180deg,#22305E 0%,#1A2448 100%)',
          border: `2px solid ${k.bd}`,
          borderRadius: '8px 2px 8px 2px',
          boxShadow:
            '0 3px 0 rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '104px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: '5px 1px 5px 1px',
            background: `radial-gradient(ellipse 70% 60% at 50% 62%, ${k.glow} 0%, rgba(0,0,0,0) 70%), linear-gradient(180deg,#0B1124 0%,#1F1C4A 58%,#2A2350 100%)`,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.6)',
          }}
        >
          {/* The floor the hero stands on. */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '6px',
              width: '62%',
              height: '10px',
              transform: 'translateX(-50%)',
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 70%)',
            }}
          ></div>
          <img
            src={k.img}
            alt={k.name}
            style={{
              position: 'relative',
              height: '92px',
              marginBottom: '9px',
              aspectRatio: k.ar,
              imageRendering: 'pixelated',
              filter: k.filter,
            }}
          />
          {k.badge ? (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                padding: '2px 4px',
                border: '1.5px solid #000000',
                borderRadius: '3px',
                background: k.badgeBg,
                fontFamily: PIXEL,
                fontSize: '8px',
                lineHeight: '1',
                color: '#000000',
              }}
            >
              {k.badge}
            </div>
          ) : null}
          {k.sub ? (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                padding: '2px 4px',
                borderRadius: '3px',
                background: 'rgba(8,12,24,.8)',
                fontFamily: PIXEL,
                fontSize: '8px',
                lineHeight: '1',
                letterSpacing: '.04em',
                color: '#CBD9EC',
              }}
            >
              {k.sub}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            padding: '0 2px',
          }}
        >
          <div
            style={{
              fontFamily: PIXEL,
              fontSize: '12px',
              lineHeight: '1.1',
              color: '#FFFFFF',
              WebkitTextStroke: '3px #000000',
              paintOrder: 'stroke fill',
              textAlign: 'center',
            }}
          >
            {k.name}
          </div>
          <div
            style={{
              minHeight: '24px',
              fontSize: '9px',
              lineHeight: '1.35',
              color: k.lineColor,
              textAlign: 'center',
              textWrap: 'balance',
            }}
          >
            {k.line}
          </div>
        </div>
        {k.btn ? (
          <div
            onClick={k.btn.run}
            style={{
              margin: '0 2px',
              cursor: k.btn.run ? 'pointer' : 'default',
              opacity: k.btn.opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '30px',
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
