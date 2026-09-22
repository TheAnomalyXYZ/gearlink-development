/**
 * The inline view of a CHALLENGE post: the duellist who made it, not the game.
 *
 * It is a poster, not a data sheet. The duellist stands full height in the
 * middle of an arena, lit and bobbing, with a VS plate between them and an
 * empty slot that is the reader - the point of the card is that the slot is
 * empty and the reader can fill it.
 *
 * Its own module so it can be rendered in a test without pulling in the
 * stylesheet the feed entry point imports.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ChallengeCard } from '../shared/api.js';
import { ARENA, ARENA_SCRIM, MOTION, PIXEL, TITLE } from './splash-style.js';

/** The rank sprite with its level numeral over the corner, the way the Neura
 *  Knights battle rank icon draws it. Knight carries no numeral. */
const RankIcon = ({ card }: { card: ChallengeCard }) => (
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
 * on the floor of the frame, never cropped into a bust. The class sprite is
 * the fallback when Reddit has no avatar or the image will not load, and it is
 * a pixel sprite, so it switches rendering with it.
 */
const Duellist = ({ card }: { card: ChallengeCard }) => {
  const [broken, setBroken] = useState(false);
  const pixel = broken || !card.avatar;
  const src = pixel ? card.heroImg : card.avatar;
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
        style={{
          imageRendering: pixel ? 'pixelated' : 'auto',
          filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.6))',
        }}
      />
    </div>
  );
};

/** The reader's side of the plate: a slot with nobody in it. */
const OpenSlot = () => (
  <div className="relative flex h-full w-full flex-col items-center justify-end gap-1">
    <div
      className="glk-blink absolute bottom-1 left-1/2 h-[22px] w-[80%] -translate-x-1/2"
      style={{
        background:
          'radial-gradient(50% 50% at 50% 50%,rgba(120,180,255,.5),rgba(120,180,255,0) 70%)',
      }}
    />
    <div
      className="relative flex flex-1 w-full items-center justify-center"
      style={{
        border: '2px dashed rgba(148,178,224,.5)',
        borderRadius: '10px 0 10px 0',
        background:
          'linear-gradient(180deg,rgba(90,130,200,.12),rgba(20,29,46,.5))',
      }}
    >
      <div
        className="glk-blink"
        style={{ fontFamily: PIXEL, fontSize: 30, color: '#9DB4D4' }}
      >
        ?
      </div>
    </div>
    <div
      className="relative"
      style={{ fontFamily: PIXEL, fontSize: 10, color: '#9DB4D4' }}
    >
      YOU
    </div>
  </div>
);

/* The call to action is passed in rather than built here: pressing it asks the
   host to expand the post, which is a Devvit client call this module stays
   clear of so it can be rendered anywhere. */
export const Challenge = ({
  card,
  cta,
}: {
  card: ChallengeCard;
  cta?: ReactNode;
}) => (
  <div
    className="relative flex h-full min-h-screen flex-col items-center justify-between overflow-hidden px-4 pt-3 pb-4 text-center"
    style={ARENA}
  >
    <style>{MOTION}</style>
    <div className="absolute inset-0" style={ARENA_SCRIM} />

    {/* Banner. */}
    <div className="glk-rise relative flex flex-col items-center gap-1">
      <div
        className="flex items-center gap-2 px-3 py-1"
        style={{
          border: '2px solid #000',
          borderRadius: '8px 2px 8px 2px',
          background: 'linear-gradient(180deg,#E8453C,#A81F22)',
          boxShadow:
            '0 3px 0 0 rgba(0,0,0,.35), 0 2px 0 0 rgba(255,255,255,.3) inset',
        }}
      >
        <span style={{ fontSize: 13 }}>⚔</span>
        <span
          style={{
            ...TITLE,
            color: '#FFF',
            fontSize: 'clamp(12px,3.2vw,15px)',
            letterSpacing: '.08em',
            textShadow: '0 2px 0 rgba(0,0,0,.55)',
          }}
        >
          YOU HAVE BEEN CHALLENGED
        </span>
        <span style={{ fontSize: 13 }}>⚔</span>
      </div>
    </div>

    {/* The duel plate: them, VS, and the empty slot that is the reader. */}
    <div className="relative flex w-full max-w-[420px] flex-1 items-stretch justify-center gap-1 py-2">
      <div className="glk-rise glk-d1 flex min-w-0 flex-1 flex-col items-center gap-1">
        <div className="min-h-0 w-full flex-1">
          <Duellist card={card} />
        </div>
        <div
          className="max-w-full truncate"
          style={{
            fontFamily: PIXEL,
            fontSize: 'clamp(11px,3vw,13px)',
            color: '#FFFFFF',
            textShadow: '0 2px 0 #141D2E',
          }}
        >
          u/{card.username}
        </div>
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
        <div style={{ fontSize: 8, color: '#8A9BBF' }}>
          {card.cls.toUpperCase()} - {card.heroPerk}
        </div>
      </div>

      {/* VS. */}
      <div className="flex shrink-0 flex-col items-center justify-center px-0.5">
        <div
          className="glk-pop"
          style={{
            fontFamily: PIXEL,
            fontSize: 'clamp(18px,5vw,26px)',
            color: '#FFD34E',
            WebkitTextStroke: '3px #000',
            paintOrder: 'stroke fill',
            textShadow: '0 0 14px rgba(255,180,60,.8)',
          }}
        >
          VS
        </div>
      </div>

      <div className="glk-rise glk-d2 flex min-w-0 flex-1 flex-col items-center gap-1">
        <div className="min-h-0 w-full flex-1 pb-1">
          <OpenSlot />
        </div>
        <div
          style={{
            fontFamily: PIXEL,
            fontSize: 'clamp(11px,3vw,13px)',
            color: '#9DB4D4',
            textShadow: '0 2px 0 #141D2E',
          }}
        >
          u/you
        </div>
        <div style={{ fontSize: 9, color: '#8A9BBF' }}>the seat is open</div>
      </div>
    </div>

    {/* The five they defend with. */}
    <div className="glk-rise glk-d3 relative flex w-full max-w-[380px] flex-col gap-1">
      <div style={{ fontSize: 8, color: '#9DB4D4', letterSpacing: '.14em' }}>
        THEIR LOADOUT
      </div>
      {/* Square tiles, so the row reads as five equal slots at any width,
          with the sprite inset rather than bleeding to the tile's edge. */}
      <div className="flex gap-1.5">
        {card.gear.map((g, i) => (
          <div
            key={i}
            title={g.name}
            className={`glk-rise glk-d${Math.min(i + 1, 5)} flex flex-1 items-center justify-center p-1.5`}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '6px 0 6px 0',
              background: g.tint,
              border: '2px solid rgba(0,0,0,.45)',
              boxShadow: '0 2px 0 0 rgba(0,0,0,.35)',
            }}
          >
            <img
              src={g.icon}
              alt={g.name}
              className="h-full w-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        ))}
      </div>
    </div>

    <div className="glk-rise glk-d4 relative flex flex-col items-center gap-1">
      <div
        className="max-w-[36ch] text-[11px] leading-snug"
        style={{ color: '#CBD9EC' }}
      >
        Link your own five against theirs. Bury their board or beat them on HP.
      </div>
      {cta}
    </div>
  </div>
);
