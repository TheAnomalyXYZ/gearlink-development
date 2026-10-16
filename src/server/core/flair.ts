/**
 * Subreddit flair earned by play: banking unlocks, and wearing one on Reddit.
 *
 * Unlocks are re-derived from the profile after anything that can move the
 * facts they read (a run, a duel) and on every boot, so a flair added to the
 * catalogue later is handed to everyone who already qualifies the next time
 * they open the game.
 */
import { context, reddit, redis } from '@devvit/web/server';
import type { Profile } from '../../shared/api.js';
import {
  FLAIR_TEXT_MAX,
  flairById,
  isWeeklyFlair,
  newlyUnlockedFlairs,
  weeklyFlairFor,
} from '../../shared/engine/flair.js';
import type { FlairFacts } from '../../shared/engine/flair.js';
import { FLAIR_FIELD, profileKey, saveProfile } from './profile.js';
import { finalStanding, soloWeekNow, titleHolders } from './solo.js';

export const flairFacts = (p: Profile): FlairFacts => ({
  progress: p.progress,
  ascension: p.ascension,
  bestScore: p.best?.score ?? 0,
  bestChain: p.best?.chain ?? 0,
  trophies: p.trophies,
  donated: p.donated,
});

/**
 * Bank any flair the profile now qualifies for, and return the profile with
 * them added. Like quest progress, this runs AFTER the thing that earned it was
 * banked and is never allowed to fail it - a flair missed now is picked up on
 * the next sync.
 */
export const syncFlairs = async (
  userId: string,
  given: Profile
): Promise<Profile> => {
  const profile = await stripLapsedTitle(userId, given);
  const earned = newlyUnlockedFlairs(flairFacts(profile), profile.flairs);
  if (!earned.length) return profile;
  try {
    await redis.hSet(
      profileKey(userId),
      Object.fromEntries(earned.map((id) => [FLAIR_FIELD + id, '1']))
    );
    return { ...profile, flairs: [...profile.flairs, ...earned] };
  } catch (err) {
    console.error('flair unlock failed: ' + String(err));
    return profile;
  }
};

/**
 * A weekly title flair is only worn while the title is held. Once it lapses
 * the flair comes off Reddit - here for anyone who opens the game, and from the
 * weekly scheduler for holders who never come back to see it go.
 */
const stripLapsedTitle = async (
  userId: string,
  profile: Profile
): Promise<Profile> => {
  const worn = profile.flair ? flairById(profile.flair) : null;
  if (!worn || !isWeeklyFlair(worn) || profile.flairs.includes(worn.id))
    return profile;
  return (await removeTitleFlair(userId, profile.username, worn.id))
    ? { ...profile, flair: null }
    : profile;
};

/** Take a lapsed weekly flair off one player. True once it is gone. */
export const removeTitleFlair = async (
  userId: string,
  username: string,
  flairId: string
): Promise<boolean> => {
  const subredditName = context.subredditName;
  if (!subredditName) return false;
  try {
    await reddit.removeUserFlair(subredditName, username);
  } catch (err) {
    console.error('title flair remove failed: ' + String(err));
    return false;
  }
  await saveProfile(userId, { flair: null });
  console.log('[solo] lapsed ' + flairId + ' removed from u/' + username);
  return true;
};

/**
 * Monday's sweep: everyone who held a title LAST week loses it now, unless last
 * week's ladder handed them the same one again. Only players actually wearing
 * the lapsed flair are touched.
 */
export const lapseTitles = async (): Promise<{ removed: number }> => {
  const week = soloWeekNow();
  let removed = 0;
  for (const h of await titleHolders(week - 2)) {
    const worn = await redis.hGet(profileKey(h.userId), 'flair');
    if (worn !== h.tier.flairId) continue;
    const again = await finalStanding(week - 1, h.userId);
    if (again && weeklyFlairFor(again.tier.id)?.id === worn) continue;
    if (await removeTitleFlair(h.userId, h.username, worn)) removed++;
  }
  return { removed };
};

export type EquipResult =
  { ok: true; message: string } | { ok: false; message: string };

/**
 * Wear an unlocked flair in this subreddit, or take it off with null.
 *
 * Reddit is written first and the profile only after, so the choice the game
 * remembers is never one Reddit refused. Taking flair off clears whatever the
 * player has in this subreddit, including flair a moderator set by hand - so
 * that only happens when they are wearing one of ours.
 */
export const equipFlair = async (
  userId: string,
  username: string,
  profile: Profile,
  flairId: string | null
): Promise<EquipResult> => {
  const subredditName = context.subredditName;
  if (!subredditName) return { ok: false, message: 'No subreddit to flair.' };

  if (flairId === null) {
    if (!profile.flair) return { ok: true, message: 'No flair to remove.' };
    try {
      await reddit.removeUserFlair(subredditName, username);
    } catch (err) {
      console.error('flair remove failed: ' + String(err));
      return { ok: false, message: 'Reddit would not remove your flair.' };
    }
    await saveProfile(userId, { flair: null });
    return { ok: true, message: 'Flair removed.' };
  }

  const def = flairById(flairId);
  if (!def) return { ok: false, message: 'No such flair.' };
  if (!profile.flairs.includes(def.id))
    return { ok: false, message: 'That flair is still locked.' };

  try {
    await reddit.setUserFlair({
      subredditName,
      username,
      text: def.text.slice(0, FLAIR_TEXT_MAX),
      textColor: def.textColor,
      backgroundColor: def.backgroundColor,
      ...(def.templateId ? { flairTemplateId: def.templateId } : {}),
    });
  } catch (err) {
    console.error('flair set failed: ' + String(err));
    return { ok: false, message: 'Reddit would not set your flair.' };
  }
  await saveProfile(userId, { flair: def.id });
  return { ok: true, message: 'Now wearing ' + def.text + '.' };
};
