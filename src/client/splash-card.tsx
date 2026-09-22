/**
 * The inline view of a CHALLENGE post: the duellist who made it, not the game.
 *
 * Its own module so it can be rendered in a test without pulling in the
 * stylesheet the feed entry point imports.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ChallengeCard } from '../shared/api.js';
import { SCRIM, SHELL, TITLE } from './splash-style.js';

/** The rank sprite with its level numeral over the corner, the way the Neura
 *  Knights battle rank icon draws it. Knight carries no numeral. */
const RankIcon = ({ card }: { card: ChallengeCard }) => (
  <div className="relative h-[42px] w-[42px] shrink-0">
    <img
      src={card.leagueIcon}
      alt={card.leagueName}
      className="h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
    {card.leagueNumeral ? (
      <div
        className="absolute -right-0.5 -bottom-1 leading-none"
        style={{
          fontFamily: "'Yoster Island',Volter,monospace",
          fontSize: 13,
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

/** The snoovatar, falling back to the duellist's class art if Reddit has none
 *  or the image will not load. */
const Avatar = ({ card }: { card: ChallengeCard }) => {
  const [broken, setBroken] = useState(false);
  const src = !card.avatar || broken ? card.heroImg : card.avatar;
  return (
    <img
      src={src}
      alt={card.username}
      onError={() => setBroken(true)}
      className="h-[46px] w-[46px] shrink-0 rounded-full object-cover"
      style={{
        background: 'rgba(0,0,0,.35)',
        border: '2px solid #3A4C74',
        imageRendering: broken || !card.avatar ? 'pixelated' : 'auto',
      }}
    />
  );
};

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
    className="relative flex h-full min-h-screen flex-col items-center justify-center gap-3 px-5 py-6 text-center"
    style={SHELL}
  >
    <div className="absolute inset-0" style={SCRIM} />

    <div
      className="relative"
      style={{ ...TITLE, fontSize: 'clamp(13px,3.4vw,17px)' }}
    >
      A DUEL CHALLENGE
    </div>

    <div
      className="relative flex w-full max-w-[380px] flex-col gap-3 p-3"
      style={{
        background: '#1D2956',
        border: '2px solid #3A4C74',
        borderRadius: '10px 0 10px 0',
      }}
    >
      {/* Who is challenging: handle, snoovatar, league. */}
      <div className="flex items-center gap-3 text-left">
        <Avatar card={card} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div
            className="truncate"
            style={{
              fontFamily: "'Yoster Island',Volter,monospace",
              fontSize: 14,
              color: '#FFFFFF',
            }}
          >
            u/{card.username}
          </div>
          <div className="flex items-center gap-1.5">
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
        <RankIcon card={card} />
      </div>

      {/* What they duel as. */}
      <div
        className="flex items-center gap-3 p-2 text-left"
        style={{ background: '#141D2E', borderRadius: '8px 0 8px 0' }}
      >
        <div
          className="h-[38px] w-[38px] shrink-0 bg-contain bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${card.heroImg})`,
            imageRendering: 'pixelated',
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div
            style={{
              fontFamily: "'Yoster Island',Volter,monospace",
              fontSize: 11,
              color: '#FFFFFF',
            }}
          >
            {card.cls.toUpperCase()}
          </div>
          <div style={{ fontSize: 8, color: '#8A9BBF' }}>{card.heroPerk}</div>
        </div>
      </div>

      {/* The five they defend with. */}
      <div className="flex flex-col gap-1.5">
        <div
          className="text-left"
          style={{ fontSize: 8, color: '#9DB4D4', letterSpacing: '.14em' }}
        >
          THEIR LOADOUT
        </div>
        {/* Square tiles, so the row reads as five equal slots at any width,
            with the sprite inset rather than bleeding to the tile's edge. */}
        <div className="flex gap-1.5">
          {card.gear.map((g, i) => (
            <div
              key={i}
              title={g.name}
              className="flex flex-1 items-center justify-center p-1.5"
              style={{
                aspectRatio: '1 / 1',
                borderRadius: '6px 0 6px 0',
                background: g.tint,
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
    </div>

    <div
      className="relative max-w-[34ch] text-xs leading-relaxed"
      style={{ color: '#CBD9EC' }}
    >
      Link your own five against theirs. Bury their board or beat them on HP.
    </div>
    {cta}
  </div>
);
