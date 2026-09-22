import { reddit } from '@devvit/web/server';
import type { HeroClass } from '../../shared/engine/types.js';
import { leagueOf } from '../../shared/engine/league.js';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'GearLink Battle - link your gear, break the wave',
  });
};

/**
 * The challenge post a player shares when they list a new duel loadout.
 *
 * It is an ordinary GearLink post, so anyone who opens it is already in the
 * app and one tap from the lobby - and `postData` carries who is being
 * challenged, which is what lets the post read as theirs rather than as a
 * generic invitation.
 */
export const createChallengePost = async (
  username: string,
  trophies: number,
  cls: HeroClass
) => {
  const league = leagueOf(trophies).name;
  return await reddit.submitCustomPost({
    title:
      'u/' +
      username +
      ' is taking duels - ' +
      league +
      ', ' +
      trophies +
      ' trophies. Come and break their link.',
    postData: { challenger: username, trophies, cls },
    textFallback: {
      text:
        'u/' +
        username +
        ' has listed a new GearLink duel loadout (' +
        cls +
        ', ' +
        league +
        '). Open the post to duel them.',
    },
  });
};
