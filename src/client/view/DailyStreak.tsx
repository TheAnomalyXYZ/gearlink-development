/**
 * The daily login reward: the seven-day calendar that greets a returning
 * player, and the strip on the quests screen that reopens it. Pure render off
 * `StreakUi` - every string and flag comes from `streakView.ts`.
 */
import { RewardChip, Sprite } from './Leaderboard.js';
import type { StreakSlotUi, StreakUi } from './streakView.js';

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

const FLAME = [
  '....#.....',
  '...#O#....',
  '...#OO#.#.',
  '..#OOO##O#',
  '..#OOYOOO#',
  '.#OOYYYOO#',
  '.#OYYWYYO#',
  '#OOYWWWYO#',
  '#OYYWWWYO#',
  '#OYWWWWYO#',
  '.#OYYYYO#.',
  '..######..',
];
const FLAME_LIT = { '#': '#000', O: '#FF6B1D', Y: '#FFC24B', W: '#FFF2B0' };
const FLAME_OUT = { '#': '#000', O: '#4A5876', Y: '#6B7A99', W: '#8C9AB5' };

const SHIELD = [
  '#########',
  '#WBBBBBL#',
  '#WBBBBBL#',
  '#WBBBBBL#',
  '#WBBBBBL#',
  '.#WBBBL#.',
  '.#WBBBL#.',
  '..#WBL#..',
  '...#L#...',
  '....#....',
];
const SHIELD_ON = { '#': '#000', W: '#BFE0FF', B: '#5EA8FF', L: '#2C6CC4' };
const SHIELD_OFF = { '#': '#000', W: '#3A4C74', B: '#2B3A62', L: '#1D2956' };

const CHECK = [
  '......#',
  '.....##',
  '#...##.',
  '##.##..',
  '.###...',
  '..#....',
];

const Flame = ({ size, lit }: { size: number; lit: boolean }) => (
  <Sprite map={FLAME} width={size} colors={lit ? FLAME_LIT : FLAME_OUT} />
);

const Slot = ({ s }: { s: StreakSlotUi }) => {
  const today = s.state === 'today';
  const claimed = s.state === 'claimed';
  return (
    <div
      className={today ? 'gl-streak-today' : undefined}
      style={{
        position: 'relative',
        gridColumn: s.big ? 'span 2' : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4px',
        minHeight: '78px',
        boxSizing: 'border-box',
        padding: '5px 3px',
        border: '2px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: today
          ? 'linear-gradient(180deg, #4A4A8A 0%, #2B3A7A 100%)'
          : s.big
            ? 'linear-gradient(180deg, #3A2E6A 0%, #1D2956 100%)'
            : '#1D2956',
        boxShadow: today
          ? '0 0 0 2px #FCE370 inset'
          : s.big
            ? '0 0 0 2px #A46BE8 inset'
            : '0 -3px 0 0 rgba(0,0,0,.35) inset',
        fontFamily: BODY,
      }}
    >
      <div
        style={{
          fontSize: '7px',
          letterSpacing: '.1em',
          color: today ? '#FCE370' : '#9DB4D4',
        }}
      >
        {today ? 'TODAY' : s.label}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: claimed ? 0.35 : 1,
        }}
      >
        {s.rewards.map((r, i) => (
          <div
            key={i}
            style={{
              width: s.big ? '30px' : '24px',
              height: s.big ? '30px' : '24px',
              backgroundImage: `url(${r.icon})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              imageRendering: 'pixelated',
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: '7px',
          color: '#FFFFFF',
          textAlign: 'center',
          lineHeight: '1.3',
          opacity: claimed ? 0.35 : 1,
        }}
      >
        {s.rewards.map((r) => r.label).join(' + ')}
      </div>
      {claimed ? (
        <div
          className={s.pop ? 'gl-streak-stamp' : undefined}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '26px',
            height: '26px',
            marginTop: '-13px',
            marginLeft: '-13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #000',
            borderRadius: '50%',
            background: '#AEE45D',
            boxShadow: '0 -2px 0 0 #6E9E2B inset',
          }}
        >
          <Sprite map={CHECK} width={13} colors={{ '#': '#000' }} />
        </div>
      ) : null}
    </div>
  );
};

/** The calendar. It opens itself once a session when today's reward is
 *  waiting, and from the quests strip any time after. */
export const StreakNotice = ({
  sk,
  stop,
}: {
  sk: StreakUi;
  stop: (e: { stopPropagation: () => void }) => void;
}) =>
  sk.show ? (
    <div
      onClick={sk.close}
      style={{
        position: 'absolute',
        inset: '0',
        zIndex: '39',
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
          maxWidth: '340px',
          maxHeight: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          boxSizing: 'border-box',
          padding: '18px 14px 14px',
          border: '3px solid #000',
          borderRadius: '12px 4px 12px 4px',
          background: 'linear-gradient(180deg, #2B3A7A 0%, #1D2956 100%)',
          boxShadow: '0 0 0 2px #FF961D inset, 0 0 0 4px #000 inset',
          fontFamily: BODY,
        }}
      >
        <div
          onClick={sk.close}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '8px',
            right: '10px',
            cursor: 'pointer',
            fontFamily: PIXEL,
            fontSize: '14px',
            color: '#9DB4D4',
            padding: '2px 4px',
          }}
        >
          X
        </div>
        <div
          style={{ fontSize: '9px', letterSpacing: '.14em', color: '#9DB4D4' }}
        >
          DAILY REWARDS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={sk.count > 0 ? 'gl-streak-flame' : undefined}>
            <Flame size={40} lit={sk.count > 0} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}
            >
              <span style={stroked('30px', '#FFC24B', 6)}>{sk.count}</span>
              <span style={stroked('14px', '#FFFFFF', 4)}>{sk.countLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '8px', color: '#9DB4D4' }}>
                {sk.bestLabel}
              </span>
              <span style={{ display: 'flex', gap: '3px' }}>
                {sk.shields.map((on, i) => (
                  <Sprite
                    key={i}
                    map={SHIELD}
                    width={12}
                    colors={on ? SHIELD_ON : SHIELD_OFF}
                  />
                ))}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: '8px',
            lineHeight: '1.6',
            color: sk.noteColor,
            textAlign: 'center',
          }}
        >
          {sk.note}
        </div>
        <div
          style={{
            alignSelf: 'stretch',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '5px',
          }}
        >
          {sk.slots.map((s) => (
            <Slot key={s.key} s={s} />
          ))}
        </div>
        <div
          style={{
            alignSelf: 'stretch',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '7px',
            lineHeight: '1.5',
            color: '#9DB4D4',
          }}
        >
          <Sprite map={SHIELD} width={10} colors={SHIELD_ON} />
          <span>
            Finish a week to earn a shield. A shield saves your streak if you
            miss a day.
          </span>
        </div>
        {sk.milestoneLabel ? (
          <div
            style={{
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              padding: '6px 8px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,.35)',
            }}
          >
            <span style={{ fontSize: '8px', color: '#FCE370' }}>
              {sk.milestoneLabel}
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {sk.milestoneRewards.map((r, i) => (
                <RewardChip key={i} r={r} />
              ))}
            </span>
          </div>
        ) : null}
        <div
          onClick={sk.claimable ? sk.claim : sk.close}
          style={{
            cursor: 'pointer',
            alignSelf: 'stretch',
            minHeight: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #000',
            borderRadius: '8px 2px 8px 2px',
            background: sk.claimable ? '#FCE270' : '#B5C0FF',
            boxShadow: sk.claimable
              ? '0 -3px 0 0 #FF961D inset, 0 2px 0 0 #FFF inset'
              : '0 -3px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
            fontFamily: PIXEL,
            fontSize: '16px',
            color: '#000',
            opacity: sk.claiming ? 0.6 : 1,
            animation:
              sk.claimable && !sk.claiming
                ? 'glClaimBounce 2s ease-in-out infinite'
                : undefined,
          }}
        >
          {sk.claimLabel}
        </div>
      </div>
    </div>
  ) : null;

/** The quests screen's way back into the calendar. */
export const StreakStrip = ({ sk }: { sk: StreakUi }) =>
  sk.ready ? (
    <div
      onClick={sk.open}
      className={sk.claimable ? 'gl-streak-today' : undefined}
      style={{
        cursor: 'pointer',
        flexShrink: '0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        border: '2px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: 'linear-gradient(180deg, #2B3A7A 0%, #1D2956 100%)',
        boxShadow: sk.claimable
          ? '0 0 0 2px #FCE370 inset'
          : '0 0 0 1px #3A4C74 inset',
        fontFamily: BODY,
      }}
    >
      <Flame size={20} lit={sk.count > 0} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{ fontFamily: PIXEL, fontSize: '13px', color: '#FFF2B0' }}>
          {sk.count} {sk.countLabel}
        </span>
        <span
          style={{
            fontSize: '8px',
            color: sk.claimable ? '#AEE45D' : '#9DB4D4',
          }}
        >
          {sk.stripLabel}
        </span>
      </div>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          minHeight: '26px',
          padding: '0 10px',
          border: '1px solid #000',
          borderRadius: '8px 2px 8px 2px',
          background: sk.claimable ? '#FCE270' : '#B5C0FF',
          boxShadow: sk.claimable
            ? '0 -2px 0 0 #FF961D inset, 0 2px 0 0 #FFF inset'
            : '0 -2px 0 0 #7E84E6 inset, 0 2px 0 0 #FFF inset',
          fontFamily: PIXEL,
          fontSize: '13px',
          color: '#000',
        }}
      >
        {sk.claimable ? 'CLAIM' : 'VIEW'}
      </div>
    </div>
  ) : null;
