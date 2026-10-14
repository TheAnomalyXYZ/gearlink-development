/**
 * The inline view of a CHALLENGE post: the duellist's board, thrown down.
 *
 * The puzzle is the poster. The duellist's five tiles fill the card as a
 * board with a link tracing through it; the duellist themself - snoovatar,
 * rank, class - faces the reader's open seat in a strip above it.
 *
 * Its own module so it can be rendered in a test without pulling in the
 * stylesheet the feed entry point imports.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ChallengeCard, ChallengeViewer } from '../shared/api.js';
import { hash32 } from '../shared/engine/rng.js';
import { BoardSlot, MiniBoard } from './splash-board.js';
import { ARENA, ARENA_SCRIM, MOTION, PIXEL, TITLE } from './splash-style.js';

/** The crossed swords the game's own duel tab is marked with. Referenced by
 *  path rather than imported, so the feed view carries no extra bytes. */
const SWORDS = '/icons/BattlePassIcon.svg';

/**
 * Plain Snoo, for an account that never dressed one up.
 *
 * Reddit's own bare avatar - no outfit, no square portrait tile - because it
 * has to stand in the arena next to real snoovatars, which are full-body
 * figures on a transparent background. Shipped with the app rather than
 * hotlinked so the feed view does not depend on a third-party fetch to draw a
 * face.
 */
const SNOO = '/avatars/snoo-default.png';

/** The rank sprite with its level numeral over the corner, the way the Neura
 *  Knights battle rank icon draws it. Knight carries no numeral. */
export const RankIcon = ({ card }: { card: ChallengeCard }) => (
  <div className="relative h-[34px] w-[34px] shrink-0">
    <img
      src={card.leagueIcon}
      alt={card.leagueName}
      className="h-full w-full object-contain"
      style={{
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 0 6px rgba(255,210,90,.55))',
      }}
    />
    {card.leagueNumeral ? (
      <div
        className="absolute -right-0.5 -bottom-1 leading-none"
        style={{
          fontFamily: PIXEL,
          fontSize: 12,
          color: '#FFFFFF',
          WebkitTextStroke: '1.5px #000',
          paintOrder: 'stroke fill',
        }}
      >
        {card.leagueNumeral}
      </div>
    ) : null}
  </div>
);

/**
 * The duellist, at full height.
 *
 * A snoovatar is a full-body figure, so it is drawn as one - contained, stood
 * on the floor of the frame, never cropped into a bust. When Reddit has no
 * avatar for them, or the image will not load, the fallback is Reddit's
 * default snoo and never the game's class art: the card introduces a REDDITOR
 * who plays GearLink, and a class sprite here reads as a bot, not a person.
 */
export const Duellist = ({ card }: { card: ChallengeCard }) => {
  const [broken, setBroken] = useState(false);
  const src = broken || !card.avatar ? SNOO : card.avatar;
  return (
    <div className="relative flex h-full w-full items-end justify-center">
      {/* The light they stand in, and the disc they stand on. */}
      <div
        className="glk-breathe absolute bottom-1 left-1/2 h-[26px] w-[86%] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 50%,rgba(255,196,84,.75),rgba(255,150,29,0) 70%)',
        }}
      />
      <div
        className="absolute bottom-[10px] left-1/2 h-[10px] w-[64%] -translate-x-1/2"
        style={{
          borderRadius: '50%',
          background: 'rgba(0,0,0,.45)',
          filter: 'blur(3px)',
        }}
      />
      <img
        src={src}
        alt={card.username}
        onError={() => setBroken(true)}
        className="glk-bob relative h-[92%] w-full object-contain object-bottom"
        style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.6))' }}
      />
    </div>
  );
};

/**
 * The reader's side of the plate.
 *
 * It is drawn the way the duellist is - a figure stood on the floor of the
 * frame, in its own cold light - so the two sides read as two people facing
 * each other rather than a person facing an empty box. The reader's own
 * snoovatar when Reddit gives one, Reddit's default snoo when it does not,
 * dimmed while the seat is still unclaimed.
 */
export const Reader = ({
  viewer,
}: {
  viewer?: ChallengeViewer | null | undefined;
}) => {
  const [broken, setBroken] = useState(false);
  const own = !!viewer?.avatar && !broken;
  return (
    <div className="relative flex h-full w-full items-end justify-center">
      <div
        className="glk-blink absolute bottom-1 left-1/2 h-[26px] w-[86%] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 50%,rgba(120,180,255,.55),rgba(120,180,255,0) 70%)',
        }}
      />
      <div
        className="absolute bottom-[10px] left-1/2 h-[10px] w-[64%] -translate-x-1/2"
        style={{
          borderRadius: '50%',
          background: 'rgba(0,0,0,.45)',
          filter: 'blur(3px)',
        }}
      />
      <img
        src={own ? viewer.avatar : SNOO}
        alt={viewer ? viewer.username : 'you'}
        onError={() => setBroken(true)}
        className="glk-bob relative h-[92%] w-full object-contain object-bottom"
        style={{
          // An unclaimed seat is not a person yet, so the placeholder stands
          // in shadow until the reader takes it.
          filter: viewer
            ? 'drop-shadow(0 6px 10px rgba(0,0,0,.6))'
            : 'drop-shadow(0 6px 10px rgba(0,0,0,.6)) brightness(.6) saturate(.35)',
        }}
      />
    </div>
  );
};

/** One side of the versus strip: a figure in its own small frame, its handle
 *  under it. The duellist is lit warm, the reader's open seat cold. */
const Side = ({
  figure,
  name,
  dim,
  glow,
}: {
  figure: ReactNode;
  name: string;
  dim?: boolean;
  glow: string;
}) => (
  <div className="flex w-[clamp(56px,18vw,84px)] shrink-0 flex-col items-center">
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: 'clamp(46px,13vh,78px)',
        borderRadius: '8px 2px 8px 2px',
        border: '2px solid #000',
        background: `radial-gradient(90% 80% at 50% 90%,${glow},rgba(11,16,32,.9) 75%)`,
      }}
    >
      {figure}
    </div>
    <div
      className="mt-0.5 max-w-full truncate"
      style={{
        fontFamily: PIXEL,
        fontSize: 'clamp(9px,2.6vw,11px)',
        color: dim ? '#9DB4D4' : '#FFFFFF',
        textShadow: '0 2px 0 #141D2E',
      }}
    >
      u/{name}
    </div>
  </div>
);

/* The call to action is passed in rather than built here: pressing it asks the
   host to expand the post, which is a Devvit client call this module stays
   clear of so it can be rendered anywhere. */
/**
 * The challenge post leads with the puzzle: the duellist's own five tiles laid
 * out as a board, a link tracing through it on a loop. Who threw it - their
 * snoovatar, rank and class against the reader's open seat - is the strip
 * across the top, and the question is the headline: can you out-link them?
 */
export const Challenge = ({
  card,
  viewer,
  cta,
}: {
  card: ChallengeCard;
  viewer?: ChallengeViewer | null | undefined;
  cta?: ReactNode;
}) => (
  // The feed gives the card a fixed slot, so the board takes whatever height
  // the strip, the headline and the button leave - which is what keeps the
  // button on the card instead of below its bottom edge.
  <div
    className="relative flex h-screen max-h-screen w-full flex-col items-center gap-1.5 overflow-hidden px-4 pt-3 pb-3 text-center"
    style={ARENA}
  >
    <style>{MOTION}</style>
    <div className="absolute inset-0" style={ARENA_SCRIM} />

    {/* Banner. */}
    <div
      className="glk-rise relative flex shrink-0 items-center gap-2 px-3 py-1"
      style={{
        border: '2px solid #000',
        borderRadius: '8px 2px 8px 2px',
        background: 'linear-gradient(180deg,#E8453C,#A81F22)',
        boxShadow:
          '0 3px 0 0 rgba(0,0,0,.35), 0 2px 0 0 rgba(255,255,255,.3) inset',
      }}
    >
      <img
        src={SWORDS}
        alt=""
        className="h-[15px] w-[15px] shrink-0 object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
      <span
        style={{
          ...TITLE,
          color: '#FFF',
          fontSize: 'clamp(12px,3.2vw,15px)',
          letterSpacing: '.08em',
          textShadow: '0 2px 0 rgba(0,0,0,.55)',
        }}
      >
        BOARD CHALLENGE
      </span>
      <img
        src={SWORDS}
        alt=""
        className="h-[15px] w-[15px] shrink-0 object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>

    {/* Who threw it, and who it is thrown at. */}
    <div className="glk-rise glk-d1 relative flex w-full max-w-[420px] shrink-0 items-center justify-center gap-2">
      <Side
        figure={<Duellist card={card} />}
        name={card.username}
        glow="rgba(255,180,60,.55)"
      />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5">
          <RankIcon card={card} />
          <div className="flex flex-col items-start gap-0.5">
            <div
              className="px-1.5 py-px"
              style={{
                borderRadius: 4,
                background: card.leagueShade,
                color: card.leagueColor,
                fontSize: 8,
                letterSpacing: '.1em',
              }}
            >
              {card.leagueName.toUpperCase()}
            </div>
            <div style={{ fontSize: 9, color: '#FCE370' }}>
              {card.trophies} trophies
            </div>
          </div>
        </div>
        <div
          className="glk-pop"
          style={{
            fontFamily: PIXEL,
            fontSize: 'clamp(16px,4.6vw,22px)',
            color: '#FFD34E',
            WebkitTextStroke: '3px #000',
            paintOrder: 'stroke fill',
            textShadow: '0 0 14px rgba(255,180,60,.8)',
            lineHeight: 1,
          }}
        >
          VS
        </div>
        <div className="truncate" style={{ fontSize: 8, color: '#8A9BBF' }}>
          {card.cls.toUpperCase()} - {card.heroPerk}
        </div>
      </div>
      <Side
        figure={<Reader viewer={viewer} />}
        name={viewer ? viewer.username : 'you'}
        dim={!viewer}
        glow="rgba(120,180,255,.4)"
      />
    </div>

    {/* The headline: the puzzle, put as a dare. */}
    <div
      className="glk-rise glk-d2 relative max-w-full shrink-0 truncate"
      style={{
        ...TITLE,
        fontSize: 'clamp(13px,3.8vw,18px)',
        letterSpacing: '.04em',
      }}
    >
      CAN YOU OUT-LINK u/{card.username}?
    </div>

    {/* Their five tiles, as the board you will face. */}
    <BoardSlot className="glk-rise glk-d3">
      <MiniBoard
        tiles={card.gear}
        seed={hash32(card.username)}
        len={6}
        accent={card.leagueColor}
      />
    </BoardSlot>

    <div className="glk-rise glk-d4 relative flex shrink-0 flex-col items-center gap-1">
      <div
        className="max-w-[38ch] text-[10px] leading-snug"
        style={{ color: '#CBD9EC' }}
      >
        Their five tiles. Chain 3+ to strike - longer links pay more.
      </div>
      {cta}
    </div>
  </div>
);
