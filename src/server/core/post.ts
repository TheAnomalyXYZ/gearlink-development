import { reddit } from '@devvit/web/server';
import type { ChallengeCard } from '../../shared/api.js';
import {
  EFFECT_TINTS,
  GEAR_BY_ID,
  HERO_PERKS,
  getGearImageUrl,
  leagueOf,
} from '../../shared/engine/index.js';
import type { HeroClass } from '../../shared/engine/types.js';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'GearLink Battle - link your gear, break the wave',
  });
};

/** What a challenge post carries. Kept to ids and numbers: the art paths are
 *  resolved when the card is read, so a post made against an older card table
 *  still draws whatever that gear looks like now. */
type ChallengeData = {
  challenge: number;
  username: string;
  avatar: string;
  trophies: number;
  cls: HeroClass;
  picked: string[];
};

/**
 * The challenge post a player shares when they list a new duel loadout.
 *
 * The inline view of this post is not the game's splash - it is the duellist
 * themself: their handle and snoovatar, their league, their hero and the five
 * they defend with. That is the invitation. `postData` is what carries it, so
 * the card survives without a lookup against the pool.
 */
export const createChallengePost = async (
  username: string,
  trophies: number,
  cls: HeroClass,
  picked: string[],
  avatar: string
) => {
  const league = leagueOf(trophies);
  const data: ChallengeData = {
    challenge: 1,
    username,
    avatar,
    trophies,
    cls,
    picked,
  };
  return await reddit.submitCustomPost({
    title:
      'u/' +
      username +
      ' is taking duels - ' +
      league.name +
      ', ' +
      trophies +
      ' trophies. Come and break their link.',
    postData: { ...data },
    textFallback: {
      text:
        'u/' +
        username +
        ' has listed a new GearLink duel loadout (' +
        cls +
        ', ' +
        league.name +
        '). Open the post to duel them.',
    },
  });
};

const isClass = (v: unknown): v is HeroClass =>
  v === 'Hero' || v === 'Archer' || v === 'Mage';

/**
 * Read a post's challenge card, or null if it is an ordinary GearLink post.
 *
 * Everything the feed view draws is finished here - image paths, tints, the
 * rank sprite - because the inline view carries no engine and no card table.
 */
export const readChallengeCard = async (
  postId: string
): Promise<ChallengeCard | null> => {
  let raw: unknown;
  try {
    const post = await reddit.getPostById(postId as never);
    raw = await post?.getPostData();
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<ChallengeData>;
  if (!d.challenge || typeof d.username !== 'string' || !isClass(d.cls))
    return null;

  const trophies = Number(d.trophies);
  const league = leagueOf(Number.isFinite(trophies) ? trophies : 0);
  const perk = HERO_PERKS[d.cls];
  const picked = Array.isArray(d.picked)
    ? d.picked.filter((x): x is string => typeof x === 'string')
    : [];

  // Same rule the gear slots use: the tint is per archetype, darkening for the
  // second and third piece of a kind, so two attack orbs never read as one.
  const seen: Record<string, number> = {};
  const gear = picked
    .map((id) => GEAR_BY_ID[id])
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => {
      const ord = seen[g.effect] ?? 0;
      seen[g.effect] = ord + 1;
      return {
        icon: getGearImageUrl(g.id),
        tint: EFFECT_TINTS[g.effect]![Math.min(ord, 2)]!,
        name: g.name,
      };
    });

  return {
    username: d.username,
    avatar: typeof d.avatar === 'string' ? d.avatar : '',
    trophies: Number.isFinite(trophies) ? trophies : 0,
    leagueName: league.name,
    leagueIcon: league.icon,
    leagueNumeral: league.numeral,
    leagueColor: league.color,
    leagueShade: league.shade,
    cls: d.cls,
    heroImg: perk.img,
    heroPerk: perk.line,
    gear,
  };
};
