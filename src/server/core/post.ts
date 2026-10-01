import { reddit } from '@devvit/web/server';
import type { ChallengeCard } from '../../shared/api.js';
import {
  EFFECT_TINTS,
  GEAR_BY_ID,
  HERO_PERKS,
  getGearImageUrl,
  leagueOf,
  loadoutIsLegal,
  skillForTrophies,
} from '../../shared/engine/index.js';
import type { DuelFoe } from '../../shared/engine/duel.js';
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
  /** Reddit id of the poster. Missing on posts made before it was recorded,
   *  which are resolved by handle instead. */
  userId?: string;
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
  userId: string,
  username: string,
  trophies: number,
  cls: HeroClass,
  picked: string[],
  avatar: string
) => {
  const league = leagueOf(trophies);
  const data: ChallengeData = {
    challenge: 1,
    userId,
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

/** The poster's snoovatar, looked up live. The card carries one from the
 *  moment it was posted, but that lookup can come back empty - a brand-new
 *  account, a transient failure - and the face is the whole point of the card,
 *  so a missing one is asked for again when the card is read rather than
 *  written off. A failure here is not an error: the card falls back to
 *  Reddit's default snoo, which is still a Reddit face. */
const snoovatarOf = async (username: string): Promise<string> => {
  try {
    return (await reddit.getSnoovatarUrl(username)) ?? '';
  } catch {
    return '';
  }
};

const isClass = (v: unknown): v is HeroClass =>
  v === 'Hero' || v === 'Archer' || v === 'Mage';

/** A post's raw postData, or undefined when it has none or cannot be read. */
export const readPostData = async (postId: string): Promise<unknown> => {
  try {
    const post = await reddit.getPostById(postId as never);
    return await post?.getPostData();
  } catch {
    return undefined;
  }
};

/** A post's challenge data, normalised, or null for an ordinary post. */
const readChallengeData = async (
  postId: string
): Promise<(ChallengeData & { trophies: number }) | null> => {
  const raw = await readPostData(postId);
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<ChallengeData>;
  if (!d.challenge || typeof d.username !== 'string' || !isClass(d.cls))
    return null;
  const trophies = Number(d.trophies);
  return {
    challenge: 1,
    ...(typeof d.userId === 'string' ? { userId: d.userId } : {}),
    username: d.username,
    avatar: typeof d.avatar === 'string' ? d.avatar : '',
    trophies: Number.isFinite(trophies) ? trophies : 0,
    cls: d.cls,
    picked: Array.isArray(d.picked)
      ? d.picked.filter((x): x is string => typeof x === 'string')
      : [],
  };
};

/**
 * Read a post's challenge card, or null if it is an ordinary GearLink post.
 *
 * Everything the feed view draws is finished here - image paths, tints, the
 * rank sprite - because the inline view carries no engine and no card table.
 */
export const readChallengeCard = async (
  postId: string
): Promise<ChallengeCard | null> => {
  const d = await readChallengeData(postId);
  if (!d) return null;

  const league = leagueOf(d.trophies);
  const perk = HERO_PERKS[d.cls];

  // Same rule the gear slots use: the tint is per archetype, darkening for the
  // second and third piece of a kind, so two attack orbs never read as one.
  const seen: Record<string, number> = {};
  const gear = d.picked
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
    avatar: d.avatar || (await snoovatarOf(d.username)),
    trophies: d.trophies,
    leagueName: league.name,
    leagueIcon: league.icon,
    leagueNumeral: league.numeral,
    leagueColor: league.color,
    leagueShade: league.shade,
    cls: d.cls,
    heroPerk: perk.line,
    gear,
  };
};

/**
 * The poster of a challenge post as a duel opponent, so ACCEPT lands the
 * reader in the lobby with that exact duellist waiting. They fight with the
 * five the post was made with - the kit the card showed is the kit you face.
 * Null for an ordinary post, and for the poster reading their own challenge.
 */
export const readChallengeFoe = async (
  postId: string,
  viewerId: string,
  viewerName: string
): Promise<DuelFoe | null> => {
  const d = await readChallengeData(postId);
  if (!d) return null;
  if (d.userId === viewerId || d.username === viewerName) return null;
  let id = d.userId ?? '';
  if (!id) {
    try {
      id = (await reddit.getUserByUsername(d.username))?.id ?? '';
    } catch {
      id = '';
    }
  }
  return {
    kind: 'player',
    id: id || 'post:' + postId,
    name: d.username,
    cls: d.cls,
    rating: d.trophies,
    skill: skillForTrophies(d.trophies),
    blurb: leagueOf(d.trophies).name + ' - duels as ' + d.cls,
    avatar: d.avatar || (await snoovatarOf(d.username)),
    picked: loadoutIsLegal(d.picked, d.cls) ? d.picked : [],
  };
};
