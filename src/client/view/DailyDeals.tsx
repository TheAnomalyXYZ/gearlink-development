/**
 * The shop's DAILY DEALS strip: three offers that turn over at UTC midnight,
 * each buyable once. Pure render off `DealsUi` - every string, colour and
 * handler comes from buildView.
 *
 * The cards carry the same `data-fx-pack` / `data-fx-packimg` hooks as the
 * pack list, so the buy flight (coins into the art, the art lifts) and the
 * pack-open shared element work on a deal exactly as on a pack.
 */
import type { MouseEvent } from 'react';

const PIXEL = 'VolterTitle,Volter,monospace';

export type DealTileUi = {
  name: string;
  /** "RARE CARD", "PACK" - what kind of thing this is. */
  kindLabel: string;
  img: string;
  /** Gear art is pixel art on a tile; pack art is a standing box. */
  isGear: boolean;
  tint: string;
  curIcon: string;
  price: string;
  was: string;
  offLabel: string;
  sold: boolean;
  buy: (e: MouseEvent<HTMLElement>) => void;
  cursor: string;
  opacity: number;
  btnBg: string;
  btnShadow: string;
  btnLabel: string;
  inAnim: string;
};

export type DealsUi = {
  display: string;
  resetLabel: string;
  tiles: DealTileUi[];
};

export const DailyDeals = ({ ui }: { ui: DealsUi }) => (
  <div
    style={{
      display: ui.display,
      flexDirection: 'column',
      gap: '6px',
      flexShrink: '0',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '8px',
      }}
    >
      <div
        style={{
          fontFamily: PIXEL,
          fontSize: '15px',
          color: '#FFC24B',
          WebkitTextStroke: '4px #000000',
          paintOrder: 'stroke fill',
        }}
      >
        DAILY DEALS
      </div>
      <div style={{ fontSize: '8px', color: '#9DB4D4' }}>{ui.resetLabel}</div>
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '6px',
      }}
    >
      {ui.tiles.map((t, i) => (
        <div
          key={i}
          data-fx-pack
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            minWidth: '0',
            padding: '8px 5px 6px',
            background: 'linear-gradient(180deg,#22305E 0%,#1A2448 100%)',
            border: `2px solid ${t.sold ? '#3A4C74' : t.tint}`,
            borderRadius: '8px 2px 8px 2px',
            opacity: t.sold ? 0.6 : 1,
            animation: t.inAnim,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-4px',
              display: t.sold || !t.offLabel ? 'none' : 'block',
              padding: '1px 4px',
              background: '#FF5A5A',
              border: '1px solid #000000',
              borderRadius: '3px',
              fontFamily: PIXEL,
              fontSize: '10px',
              color: '#FFFFFF',
              transform: 'rotate(6deg)',
            }}
          >
            {t.offLabel}
          </div>
          <div
            data-fx-packimg
            style={{
              width: t.isGear ? '40px' : '38px',
              height: '46px',
              flexShrink: '0',
              background: `url(${t.img}) center/contain no-repeat`,
              imageRendering: 'pixelated',
              filter: t.sold ? 'grayscale(1)' : 'none',
            }}
          ></div>
          <div style={{ fontSize: '7px', color: t.tint }}>{t.kindLabel}</div>
          <div
            style={{
              width: '100%',
              fontFamily: PIXEL,
              fontSize: '11px',
              lineHeight: '1.1',
              color: '#FFFFFF',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.name}
          </div>
          <div
            style={{
              fontSize: '8px',
              color: '#8A9BBF',
              textDecoration: 'line-through',
              visibility: t.sold || !t.was ? 'hidden' : 'visible',
            }}
          >
            {t.was}
          </div>
          <div
            onClick={t.sold ? undefined : t.buy}
            style={{
              cursor: t.cursor,
              marginTop: 'auto',
              width: '100%',
              opacity: t.opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '28px',
              border: '2px solid #000000',
              borderRadius: '8px 2px 8px 2px',
              background: t.btnBg,
              boxShadow: t.btnShadow,
              color: '#000000',
              fontFamily: PIXEL,
              fontSize: '13px',
              lineHeight: '1',
            }}
          >
            <div
              style={{
                display: t.sold ? 'none' : 'block',
                width: '12px',
                height: '12px',
                backgroundImage: `url(${t.curIcon})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
              }}
            ></div>
            <span>{t.btnLabel}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);
