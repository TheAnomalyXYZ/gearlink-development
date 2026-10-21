/**
 * The weekly leaderboard: its floating button on the map, the full sheet, and
 * the notice that pays out last week's placing. Pure render off `LbView` -
 * every string and flag comes from `leaderboardView.ts`.
 */
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { LbReward, LbRow, LbTierCard, LbView } from './leaderboardView.js';

const PIXEL = 'VolterTitle,Volter,monospace';
const BODY = 'Volter,ui-monospace,monospace';

/** The title font draws `#` as a star; set any `#` in Volter instead. */
const hashSafe = (text: string): ReactNode =>
  text.split('#').map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? <span style={{ fontFamily: BODY }}>#</span> : null}
      {part}
    </Fragment>
  ));

/** Fill, lip and deep shade for first, second and third. */
const MEDAL: Record<number, [string, string, string]> = {
  1: ['#FFC24B', '#C8901A', '#7A4E08'],
  2: ['#D9E2F2', '#8C9AB5', '#4A5876'],
  3: ['#E09A5A', '#A8642C', '#5E3412'],
};

const stroked = (size: string, color: string, stroke = 5) => ({
  fontFamily: PIXEL,
  fontSize: size,
  lineHeight: '1',
  color,
  WebkitTextStroke: stroke + 'px #000000',
  paintOrder: 'stroke fill' as const,
});

/** A tiny pixel sprite from a character map: `#` outline, `G` fill, `L` lip,
 *  `W` shine, `R`/`B` gems, `.` empty. */
export const Sprite = ({
  map,
  width,
  colors,
}: {
  map: string[];
  width: number;
  colors: Record<string, string>;
}) => {
  const w = map[0]!.length;
  const h = map.length;
  return (
    <svg
      width={width}
      height={(width * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: 'block' }}
    >
      {map.flatMap((line, y) =>
        [...line].map((ch, x) =>
          colors[ch] ? (
            <rect
              key={x + '-' + y}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={colors[ch]}
            />
          ) : null
        )
      )}
    </svg>
  );
};

const TROPHY = [
  '..############..',
  '###WGGGGGGGGL###',
  '#G#WGGGGGGGGL#G#',
  '#G#WGGGGGGGGL#G#',
  '#G#GGGGGGGGGL#G#',
  '.##GGGGGGGGGL##.',
  '..#GGGGGGGGLL#..',
  '...#GGGGGGLL#...',
  '....##GGGL##....',
  '......#GL#......',
  '......#GL#......',
  '.....##GL##.....',
  '....#GGGGLL#....',
  '...##########...',
  '...#GGGGGGLL#...',
  '...##########...',
];

const CROWN = [
  '#......##......#',
  '##....#GG#....##',
  '#G#..#GGGG#..#G#',
  '#GG##GGRRGG##GG#',
  '#GGGGGGRRGGGGGG#',
  '#GBGGGGGGGGGGBG#',
  '#GGGGGGGGGGGGGG#',
  '#LLLLLLLLLLLLLL#',
  '################',
];

export const TrophyIcon = ({
  size = 28,
  fill = '#FFC24B',
  lip = '#C8901A',
}: {
  size?: number;
  fill?: string;
  lip?: string;
}) => (
  <Sprite
    map={TROPHY}
    width={size}
    colors={{ '#': '#000000', G: fill, L: lip, W: '#FFF6D0' }}
  />
);

const Crown = ({ w = 28 }: { w?: number }) => (
  <Sprite
    map={CROWN}
    width={w}
    colors={{
      '#': '#000000',
      G: '#FFC24B',
      L: '#C8901A',
      R: '#FF4D6D',
      B: '#6FD3FF',
    }}
  />
);

const Avatar = ({
  src,
  size,
  ring,
}: {
  src: string;
  size: number;
  ring: string;
}) => (
  <div
    style={{
      position: 'relative',
      width: size + 'px',
      height: size + 'px',
      flex: 'none',
      boxSizing: 'border-box',
      border: '2px solid #000000',
      borderRadius: '8px 2px 8px 2px',
      background: `linear-gradient(180deg, ${ring} 0%, #1D2956 100%)`,
      boxShadow: `0 0 0 2px ${ring} inset`,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: '2px',
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        imageRendering: 'pixelated',
      }}
    />
  </div>
);

const Seat = ({ row, place }: { row: LbRow | null; place: number }) => {
  const [fill, lip, deep] = MEDAL[place]!;
  const first = place === 1;
  const size = first ? 64 : 50;
  const height = first ? 58 : place === 2 ? 42 : 30;
  return (
    <div
      className="gl-lb-seat"
      style={{
        flex: first ? '1.25' : '1',
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animationDelay: (first ? 260 : place === 2 ? 140 : 40) + 'ms',
        zIndex: first ? 2 : 1,
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          paddingBottom: '6px',
          minWidth: '0',
          width: '100%',
          opacity: row ? 1 : 0.35,
        }}
      >
        {first && row ? (
          <div
            className="gl-lb-rays"
            style={{
              position: 'absolute',
              top: '34px',
              left: '50%',
              width: '150px',
              height: '150px',
              pointerEvents: 'none',
            }}
          />
        ) : null}
        <div
          style={{
            height: first ? '18px' : '0',
            marginBottom: '-6px',
            zIndex: 2,
          }}
        >
          {first && row ? (
            <div className="gl-lb-crown">
              <Crown />
            </div>
          ) : null}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {row ? (
            <Avatar src={row.avatar} size={size} ring={fill} />
          ) : (
            <div
              style={{
                width: size + 'px',
                height: size + 'px',
                boxSizing: 'border-box',
                border: '2px dashed #3A4C74',
                borderRadius: '8px 2px 8px 2px',
              }}
            />
          )}
          {row?.isYou ? (
            <div
              style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '1px 4px',
                border: '1px solid #000',
                borderRadius: '3px',
                background: '#AEE45D',
                fontFamily: PIXEL,
                fontSize: '9px',
                color: '#000',
              }}
            >
              YOU
            </div>
          ) : null}
        </div>
        <div
          style={{
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: BODY,
            fontSize: first ? '11px' : '10px',
            color: row?.isYou ? '#AEE45D' : '#FFFFFF',
            marginTop: '2px',
            padding: '0 2px',
          }}
        >
          {row ? row.username : '---'}
        </div>
        <div style={stroked(first ? '15px' : '13px', fill, 4)}>
          {row ? row.value : '-'}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: height + 'px',
          boxSizing: 'border-box',
          border: '2px solid #000000',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          background: `linear-gradient(180deg, ${fill} 0%, ${lip} 100%)`,
          boxShadow: `0 3px 0 0 rgba(255,255,255,.55) inset, 0 -4px 0 0 ${deep} inset`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '4px',
        }}
      >
        <div style={stroked(first ? '24px' : '19px', '#FFFFFF', 5)}>
          {place}
        </div>
      </div>
    </div>
  );
};

const Row = ({ r, i }: { r: LbRow; i: number }) => (
  <div
    className="gl-lb-row"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minHeight: '46px',
      padding: '6px 8px',
      boxSizing: 'border-box',
      border: `2px solid ${r.isYou ? '#AEE45D' : '#000000'}`,
      borderRadius: '8px 2px 8px 2px',
      background: r.isYou
        ? 'linear-gradient(90deg, rgba(174,228,93,.22), rgba(29,41,86,.95) 60%)'
        : i % 2
          ? '#1A2550'
          : '#1D2956',
      boxShadow: '0 2px 0 0 rgba(255,255,255,.06) inset',
      animationDelay: Math.min(i, 12) * 30 + 'ms',
    }}
  >
    <div
      style={{
        width: '30px',
        flex: 'none',
        textAlign: 'center',
        ...stroked(r.rankLabel.length > 3 ? '12px' : '14px', '#CBD9EC', 3),
      }}
    >
      {hashSafe(r.rankLabel)}
    </div>
    <Avatar src={r.avatar} size={32} ring={r.isYou ? '#AEE45D' : '#3A4C74'} />
    <div style={{ flex: '1', minWidth: '0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          minWidth: '0',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: BODY,
            fontSize: '11px',
            color: r.isYou ? '#AEE45D' : '#FFFFFF',
          }}
        >
          {r.username}
        </div>
        {r.tierName ? (
          <div
            style={{
              flex: 'none',
              padding: '1px 4px',
              border: '1px solid #000',
              borderRadius: '3px',
              background: r.tierColor,
              fontFamily: PIXEL,
              fontSize: '8px',
              color: '#000',
            }}
          >
            {r.tierName}
          </div>
        ) : null}
      </div>
      <div
        style={{
          marginTop: '3px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: BODY,
          fontSize: '8px',
          color: '#9DB4D4',
        }}
      >
        {r.sub}
      </div>
    </div>
    <div style={{ flex: 'none', textAlign: 'right' }}>
      <div style={stroked('14px', '#FCE370', 3)}>{r.value}</div>
      <div
        style={{
          marginTop: '2px',
          fontFamily: BODY,
          fontSize: '7px',
          letterSpacing: '.12em',
          color: '#7F93B8',
        }}
      >
        {r.unit}
      </div>
    </div>
  </div>
);

export const RewardChip = ({ r }: { r: LbReward }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      height: '22px',
      padding: '0 6px 0 3px',
      border: '1px solid #000',
      borderRadius: '4px',
      background: 'rgba(0,0,0,.35)',
    }}
  >
    <div
      style={{
        width: '16px',
        height: '16px',
        backgroundImage: `url(${r.icon})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    />
    <div style={{ fontFamily: BODY, fontSize: '8px', color: '#FFFFFF' }}>
      {r.label}
    </div>
  </div>
);

/** How a flair reads next to a username on Reddit. */
const FlairPill = ({ text, bg }: { text: string; bg: string }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: '18px',
      padding: '0 7px',
      borderRadius: '9999px',
      background: bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontWeight: 600,
      color: '#1A1A1B',
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

const TierCard = ({ t, i }: { t: LbTierCard; i: number }) => (
  <div
    className="gl-lb-row"
    style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '10px',
      border: `2px solid ${t.held ? t.color : '#000000'}`,
      borderRadius: '8px 2px 8px 2px',
      background: `linear-gradient(135deg, ${t.color}33 0%, #1D2956 55%)`,
      animationDelay: i * 60 + 'ms',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          minWidth: '44px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #000',
          borderRadius: '6px 2px 6px 2px',
          background: t.color,
          boxShadow:
            '0 -3px 0 0 rgba(0,0,0,.25) inset, 0 2px 0 0 rgba(255,255,255,.6) inset',
          ...stroked('14px', '#FFFFFF', 4),
        }}
      >
        {hashSafe(t.ranks)}
      </div>
      <div style={{ flex: '1', minWidth: '0' }}>
        <div style={stroked('15px', t.color, 4)}>{t.name}</div>
        <div
          style={{
            marginTop: '3px',
            fontFamily: BODY,
            fontSize: '7px',
            color: '#7F93B8',
          }}
        >
          {t.note}
        </div>
      </div>
      {t.held ? (
        <div
          style={{
            padding: '2px 5px',
            border: '1px solid #000',
            borderRadius: '3px',
            background: '#AEE45D',
            fontFamily: PIXEL,
            fontSize: '9px',
            color: '#000',
          }}
        >
          HELD
        </div>
      ) : null}
    </div>
    {t.flairText ? (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          borderRadius: '4px',
          background: 'rgba(0,0,0,.3)',
        }}
      >
        <div
          style={{
            fontFamily: BODY,
            fontSize: '8px',
            color: '#9DB4D4',
            flex: 'none',
          }}
        >
          u/you
        </div>
        <FlairPill text={t.flairText} bg={t.flairBg} />
        <div
          style={{
            marginLeft: 'auto',
            fontFamily: BODY,
            fontSize: '7px',
            color: '#7F93B8',
          }}
        >
          1 WEEK
        </div>
      </div>
    ) : null}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {t.rewards.map((r, k) => (
        <RewardChip key={k} r={r} />
      ))}
    </div>
  </div>
);

const Rewards = ({ lb }: { lb: LbView }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {lb.lbTitleHeld ? (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px',
          border: '2px solid #000',
          borderRadius: '8px 2px 8px 2px',
          background: '#AEE45D',
          fontFamily: PIXEL,
          fontSize: '12px',
          color: '#000',
        }}
      >
        <TrophyIcon size={18} />
        {lb.lbTitleHeld}
      </div>
    ) : null}
    {lb.lbTiers.map((t, i) => (
      <TierCard key={t.id} t={t} i={i} />
    ))}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px',
        border: '2px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: '#141D2E',
      }}
    >
      <div style={stroked('13px', '#FCE370', 3)}>HOW IT WORKS</div>
      {lb.lbRules.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: '6px',
            fontFamily: BODY,
            fontSize: '9px',
            lineHeight: '1.55',
            color: '#CBD9EC',
          }}
        >
          <div style={{ color: '#FCE370', flex: 'none' }}>{'>'}</div>
          <div>{r}</div>
        </div>
      ))}
    </div>
  </div>
);

const Skeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="gl-lb-skel"
        style={{
          height: '46px',
          border: '2px solid #000',
          borderRadius: '8px 2px 8px 2px',
          animationDelay: i * 90 + 'ms',
        }}
      />
    ))}
  </div>
);

export const LeaderboardSheet = ({
  lb,
  stop,
}: {
  lb: LbView;
  stop: (e: { stopPropagation: () => void }) => void;
}) =>
  lb.lbOpen ? (
    <div
      data-pt-skip
      onClick={lb.closeBoard}
      style={{
        position: 'absolute',
        inset: '0',
        zIndex: '30',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        background: 'rgba(6,12,30,.78)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={stop}
        className="gl-lb-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          height: '100%',
          maxHeight: '720px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          border: '3px solid #000000',
          borderRadius: '12px 4px 12px 4px',
          background:
            'linear-gradient(180deg, #2B3A7A 0%, #1D2956 120px, #141D2E 100%)',
          boxShadow:
            '0 0 0 2px #FCE370 inset, 0 0 0 4px #000 inset, 0 10px 30px rgba(0,0,0,.5)',
          overflow: 'hidden',
          fontFamily: BODY,
          userSelect: 'none',
        }}
      >
        {/* header */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 14px 6px',
          }}
        >
          <div className="gl-lb-bob">
            <TrophyIcon size={30} />
          </div>
          <div style={{ flex: '1', minWidth: '0' }}>
            <div style={stroked('22px', '#FFF2B0', 5)}>LEADERBOARD</div>
            <div
              style={{
                marginTop: '5px',
                display: 'flex',
                gap: '8px',
                fontSize: '8px',
                letterSpacing: '.1em',
                color: '#9DB4D4',
              }}
            >
              <span style={{ color: '#FCE370' }}>{lb.lbSub}</span>
              {lb.lbPlayers ? <span>{lb.lbPlayers}</span> : null}
            </div>
          </div>
          <div
            onClick={lb.closeBoard}
            role="button"
            aria-label="Close"
            style={{
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              border: '2px solid #000',
              borderRadius: '8px 2px 8px 2px',
              background: '#FF6B6B',
              boxShadow: '0 -3px 0 0 #B83A3A inset, 0 2px 0 0 #FFC2C2 inset',
              ...stroked('16px', '#FFFFFF', 4),
            }}
          >
            X
          </div>
        </div>

        {/* tabs */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            margin: '6px 12px 8px',
            padding: '3px',
            border: '2px solid #000',
            borderRadius: '8px 2px 8px 2px',
            background: '#0E1530',
          }}
        >
          {lb.lbTabs.map((t) => (
            <div
              key={t.id}
              onClick={t.run}
              style={{
                cursor: 'pointer',
                flex: '1',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px 2px 6px 2px',
                border: t.active ? '2px solid #000' : '2px solid transparent',
                background: t.active ? '#428FFB' : 'transparent',
                boxShadow: t.active
                  ? '0 -3px 0 0 #2B63C0 inset, 0 2px 0 0 #9CC4FF inset'
                  : 'none',
                transition: 'background 120ms',
                ...(t.active
                  ? stroked('13px', '#FFFFFF', 4)
                  : { fontFamily: PIXEL, fontSize: '12px', color: '#7F93B8' }),
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* body */}
        <div
          key={lb.lbTab}
          className="gl-lb-scroll"
          style={{
            flex: '1',
            minHeight: '0',
            overflowY: 'auto',
            padding: '0 12px 12px',
          }}
        >
          {lb.lbTab === 'rewards' ? (
            <Rewards lb={lb} />
          ) : lb.lbLoading ? (
            <Skeleton />
          ) : lb.lbEmpty ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '40px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ opacity: 0.5 }}>
                <TrophyIcon size={56} fill="#6C7DA6" lip="#3A4C74" />
              </div>
              <div
                style={{
                  fontSize: '10px',
                  lineHeight: '1.6',
                  color: '#CBD9EC',
                }}
              >
                {lb.lbEmpty}
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '4px',
                  padding: '6px 6px 0',
                  margin: '0 -4px 8px',
                  borderBottom: '3px solid #000',
                  overflow: 'hidden',
                }}
              >
                <Seat row={lb.lbPodium[0] ?? null} place={2} />
                <Seat row={lb.lbPodium[1] ?? null} place={1} />
                <Seat row={lb.lbPodium[2] ?? null} place={3} />
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                {lb.lbRows.map((r, i) => (
                  <Row key={r.key} r={r} i={i} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* your standing */}
        {lb.lbYou || lb.lbYouNote ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px 12px 12px',
              borderTop: '3px solid #000',
              background: '#0E1530',
            }}
          >
            {lb.lbYou ? <Row r={lb.lbYou} i={0} /> : null}
            {lb.lbYouNote ? (
              <div
                style={{
                  fontSize: '8px',
                  lineHeight: '1.5',
                  color: '#CBD9EC',
                  textAlign: 'center',
                }}
              >
                {lb.lbYouNote}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

/** The map's floating way in, Neura Knights style: round, bottom right, above
 *  the nav bar. Glows while the player holds a title or is on course for one. */
export const LeaderboardFab = ({
  lb,
  transform,
  transition,
}: {
  lb: LbView;
  transform: string;
  transition: string;
}) =>
  lb.fabShow ? (
    <div
      data-fx="leaderboard"
      onClick={lb.openBoard}
      role="button"
      aria-label="Leaderboard"
      className="gl-lb-fab"
      style={{
        position: 'absolute',
        right: '14px',
        bottom: '100px',
        zIndex: '13',
        width: '58px',
        height: '58px',
        cursor: 'pointer',
        transform,
        transition,
      }}
    >
      {lb.fabGlow ? (
        <div
          className="gl-lb-ring"
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: `3px solid ${lb.fabTitleColor}`,
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <div
        className="gl-lb-fab-face"
        style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          border: '3px solid #000000',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 30%, #5B7BFF 0%, #2B3A9A 55%, #1D2956 100%)',
          boxShadow:
            '0 -4px 0 0 rgba(0,0,0,.35) inset, 0 3px 0 0 rgba(255,255,255,.35) inset, 0 4px 0 0 rgba(0,0,0,.45)',
        }}
      >
        <TrophyIcon size={32} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '-9px',
          transform: 'translateX(-50%)',
          minWidth: '30px',
          padding: '2px 5px',
          boxSizing: 'border-box',
          border: '2px solid #000',
          borderRadius: '4px',
          background: lb.fabRank ? '#FCE370' : '#B5C0FF',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontFamily: PIXEL,
          fontSize: '10px',
          lineHeight: '1',
          color: '#000',
        }}
      >
        {lb.fabRank ? hashSafe(lb.fabRank) : 'RANK'}
      </div>
      {lb.fabAlert ? (
        <div
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #000',
            borderRadius: '50%',
            background: '#FF5A4E',
            fontFamily: PIXEL,
            fontSize: '11px',
            lineHeight: '1',
            color: '#FFFFFF',
          }}
        >
          !
        </div>
      ) : null}
    </div>
  ) : null;

/** "u/foo passed you!" above the floating button: the nudge to come back and
 *  take the place again. Tapping it opens the board. */
export const SoloAlertBanner = ({
  lb,
  stop,
}: {
  lb: LbView;
  stop: (e: { stopPropagation: () => void }) => void;
}) =>
  lb.alertShow ? (
    <div
      onClick={lb.openSoloAlert}
      role="button"
      className="gl-lb-in"
      style={{
        position: 'absolute',
        right: '14px',
        bottom: '172px',
        zIndex: '13',
        width: '220px',
        maxWidth: 'calc(100% - 28px)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxSizing: 'border-box',
        padding: '8px 8px 8px 10px',
        border: '2px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: 'linear-gradient(135deg, #5A2440 0%, #1D2956 70%)',
        boxShadow: '0 0 0 2px #FF5A4E inset, 0 4px 0 0 rgba(0,0,0,.45)',
        cursor: 'pointer',
      }}
    >
      <TrophyIcon size={24} />
      <div style={{ flex: '1', minWidth: '0' }}>
        <div
          style={{
            fontFamily: BODY,
            fontSize: '9px',
            lineHeight: '1.4',
            color: '#FFFFFF',
            overflowWrap: 'anywhere',
          }}
        >
          {lb.alertTitle}
        </div>
        <div
          style={{
            marginTop: '3px',
            fontFamily: PIXEL,
            fontSize: '10px',
            color: '#FCE370',
          }}
        >
          {hashSafe(lb.alertSub)}
        </div>
      </div>
      <div
        onClick={(e) => {
          stop(e);
          lb.dismissSoloAlert();
        }}
        role="button"
        aria-label="Dismiss"
        style={{
          flex: 'none',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #000',
          borderRadius: '4px',
          background: 'rgba(0,0,0,.35)',
          fontFamily: PIXEL,
          fontSize: '11px',
          color: '#9DB4D4',
        }}
      >
        X
      </div>
    </div>
  ) : null;

/** Last week's placing. It was paid at the reset; this is when the player
 *  finds out, and where they can put the title flair on in one tap. */
export const SoloPrizeNotice = ({
  lb,
  stop,
}: {
  lb: LbView;
  stop: (e: { stopPropagation: () => void }) => void;
}) =>
  lb.soloPrizeShow ? (
    <div
      onClick={lb.dismissSoloPrize}
      style={{
        position: 'absolute',
        inset: '0',
        zIndex: '41',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(6,12,30,.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={stop}
        className="gl-lb-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxSizing: 'border-box',
          padding: '22px 16px 16px',
          border: '3px solid #000',
          borderRadius: '12px 4px 12px 4px',
          background: 'linear-gradient(180deg, #2B3A7A 0%, #1D2956 100%)',
          boxShadow: `0 0 0 2px ${lb.soloPrizeColor} inset, 0 0 0 4px #000 inset`,
          overflow: 'hidden',
          fontFamily: BODY,
        }}
      >
        <div
          className="gl-lb-rays"
          style={{
            position: 'absolute',
            top: '62px',
            left: '50%',
            width: '260px',
            height: '260px',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            fontSize: '9px',
            letterSpacing: '.14em',
            color: '#9DB4D4',
          }}
        >
          WEEKLY LEADERBOARD
        </div>
        <div className="gl-lb-bob" style={{ position: 'relative' }}>
          <TrophyIcon size={72} />
        </div>
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            ...stroked('24px', lb.soloPrizeColor, 6),
          }}
        >
          {lb.soloPrizeTier}
        </div>
        <div
          style={{
            position: 'relative',
            fontSize: '9px',
            lineHeight: '1.6',
            color: '#CBD9EC',
            textAlign: 'center',
          }}
        >
          You finished {hashSafe(lb.soloPrizeRank)} last week. Your prize is
          already in your bag.
        </div>
        {lb.soloPrizeFlair ? (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              alignSelf: 'stretch',
              padding: '8px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,.35)',
            }}
          >
            <div style={{ fontSize: '8px', color: '#9DB4D4' }}>
              TITLE FLAIR - THIS WEEK ONLY
            </div>
            <FlairPill text={lb.soloPrizeFlair} bg={lb.soloPrizeFlairBg} />
          </div>
        ) : null}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          {lb.soloPrizeRewards.map((r, i) => (
            <RewardChip key={i} r={r} />
          ))}
        </div>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            gap: '8px',
            alignSelf: 'stretch',
          }}
        >
          {lb.soloPrizeCanWear ? (
            <div
              onClick={lb.wearSoloTitle}
              style={{
                cursor: 'pointer',
                flex: '1',
                minHeight: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #000',
                borderRadius: '8px 2px 8px 2px',
                background: '#AEE45D',
                boxShadow: '0 -3px 0 0 #6E9E2B inset, 0 2px 0 0 #E6FFC0 inset',
                fontFamily: PIXEL,
                fontSize: '16px',
                color: '#000',
              }}
            >
              WEAR IT
            </div>
          ) : null}
          <div
            onClick={lb.dismissSoloPrize}
            style={{
              cursor: 'pointer',
              flex: '1',
              minHeight: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #000',
              borderRadius: '8px 2px 8px 2px',
              background: '#FCE270',
              boxShadow: '0 -3px 0 0 #FF961D inset, 0 2px 0 0 #FFF inset',
              fontFamily: PIXEL,
              fontSize: '16px',
              color: '#000',
            }}
          >
            COLLECT
          </div>
        </div>
      </div>
    </div>
  ) : null;
