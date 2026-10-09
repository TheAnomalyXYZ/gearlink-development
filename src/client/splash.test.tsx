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
const cardFor = (trophies: number, avatar = ''): ChallengeCard => {
  const league = leagueOf(trophies);
  const seen: Record<string, number> = {};
  return {
    username: 'duellist',
    avatar,
    trophies,
    leagueName: league.name,
    leagueIcon: league.icon,
    leagueNumeral: league.numeral,
    leagueColor: league.color,
    leagueShade: league.shade,
    cls: 'Archer',
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
  for (const g of card.gear)
    assert.ok(html.includes(g.icon), 'gear art ' + g.name + ' is missing');
  assert.ok(
    !html.includes('take down every wave'),
    'the plain splash leaked into a challenge post'
  );
});

void test('the reader stands on the open side of the plate', () => {
  const card = cardFor(900);
  const html = renderToStaticMarkup(
    <Challenge card={card} viewer={{ username: 'reader', avatar: '/a.png' }} />
  );
  assert.ok(html.includes('u/reader'), 'the reader is not named');
  assert.ok(html.includes('src="/a.png"'), 'the reader has no face');
});

void test('a reader with no avatar gets plain Snoo, not a blank box', () => {
  const plain = renderToStaticMarkup(<Challenge card={cardFor(900)} />);
  assert.ok(
    plain.includes('/avatars/snoo-default.png'),
    'the anonymous seat has no snoo'
  );
  assert.ok(plain.includes('u/you'), 'the anonymous seat is not labelled');
  const noAvatar = renderToStaticMarkup(
    <Challenge
      card={cardFor(900)}
      viewer={{ username: 'reader', avatar: '' }}
    />
  );
  assert.ok(
    noAvatar.includes('/avatars/snoo-default.png'),
    "the reader's plain snoo is missing"
  );
  assert.ok(noAvatar.includes('u/reader'), 'the reader is not named');
});

void test('the banner carries the swords icon, not an emoji', () => {
  const html = renderToStaticMarkup(<Challenge card={cardFor(900)} />);
  assert.ok(
    html.includes('/icons/BattlePassIcon.svg'),
    'the swords icon is missing'
  );
  assert.ok(!html.includes('\u2694'), 'the swords emoji is still there');
});

void test('the duellist is the poster, snoovatar first', () => {
  const html = renderToStaticMarkup(
    <Challenge card={cardFor(900, '/poster.png')} />
  );
  assert.ok(html.includes('src="/poster.png"'), 'the poster has no face');
});

void test('a missing snoovatar falls back to plain Snoo, never the class art', () => {
  const card = cardFor(500);
  const html = renderToStaticMarkup(<Challenge card={card} />);
  assert.ok(
    html.includes('/avatars/snoo-default.png'),
    'the avatar did not fall back to plain Snoo'
  );
  assert.ok(
    !html.includes(HERO_PERKS.Archer.img),
    'the class art stood in for the poster'
  );
  // Knight is the only rung with no numeral; Bronze 1 must still show one.
  assert.ok(html.includes('>I<'), 'Bronze 1 lost its numeral');
});
