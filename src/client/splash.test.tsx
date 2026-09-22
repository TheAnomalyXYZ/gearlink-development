import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Challenge } from './splash-card.js';
import {
  GEAR_BY_ID,
  EFFECT_TINTS,
  HERO_PERKS,
  defaultLoadout,
  getGearImageUrl,
  leagueOf,
} from '../shared/engine/index.js';
import type { ChallengeCard } from '../shared/api.js';

/**
 * The inline view of a challenge post. It is the first thing anyone sees of a
 * duellist, and it renders from a payload the server built - so the check that
 * matters is that every part of that payload actually reaches the markup.
 */
const cardFor = (trophies: number): ChallengeCard => {
  const league = leagueOf(trophies);
  const seen: Record<string, number> = {};
  return {
    username: 'duellist',
    avatar: '',
    trophies,
    leagueName: league.name,
    leagueIcon: league.icon,
    leagueNumeral: league.numeral,
    leagueColor: league.color,
    leagueShade: league.shade,
    cls: 'Archer',
    heroImg: HERO_PERKS.Archer.img,
    heroPerk: HERO_PERKS.Archer.line,
    gear: defaultLoadout('Archer').map((id) => {
      const g = GEAR_BY_ID[id]!;
      const ord = seen[g.effect] ?? 0;
      seen[g.effect] = ord + 1;
      return {
        icon: getGearImageUrl(g.id),
        tint: EFFECT_TINTS[g.effect]![Math.min(ord, 2)]!,
        name: g.name,
      };
    }),
  };
};

void test('a challenge post shows the duellist, not the game splash', () => {
  const card = cardFor(1620);
  const html = renderToStaticMarkup(<Challenge card={card} />);
  assert.ok(html.includes('u/duellist'), 'the handle is missing');
  assert.ok(html.includes('GOLD 2'), 'the league is missing');
  assert.ok(html.includes(card.leagueIcon), 'the rank icon is missing');
  assert.ok(html.includes('II'), 'the league numeral is missing');
  assert.ok(html.includes('1620'), 'the trophy count is missing');
  assert.ok(html.includes('ARCHER'), 'the character is missing');
  assert.ok(
    html.includes(HERO_PERKS.Archer.img),
    'the character art is missing'
  );
  for (const g of card.gear)
    assert.ok(html.includes(g.icon), 'gear art ' + g.name + ' is missing');
  assert.ok(
    !html.includes('GEARLINK BATTLE'),
    'the plain splash leaked into a challenge post'
  );
});

void test('a missing snoovatar falls back to the character art', () => {
  const html = renderToStaticMarkup(<Challenge card={cardFor(500)} />);
  assert.ok(
    html.includes(`src="${HERO_PERKS.Archer.img}"`),
    'the avatar did not fall back'
  );
  // Knight is the only rung with no numeral; Bronze 1 must still show one.
  assert.ok(html.includes('>I<'), 'Bronze 1 lost its numeral');
});
