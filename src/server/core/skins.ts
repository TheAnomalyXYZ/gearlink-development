/**
 * Hero outfits: banking earned unlocks, selling the shop exclusives, and
 * choosing which one each class wears.
 *
 * Earned unlocks are re-derived from the profile after anything that can move
 * the facts they read (a run, a pack collected) and on every boot, the same way
 * flair is - so an outfit added later lands for everyone who already qualifies.
 */
import { redis } from '@devvit/web/server';
import type { Profile } from '../../shared/api.js';
import {
  newlyUnlockedSkins,
  skinById,
  skinOwned,
} from '../../shared/engine/skin.js';
import type { SkinFacts } from '../../shared/engine/skin.js';
import { syncFlairs } from './flair.js';
import { SKIN_FIELD, profileKey, saveProfile } from './profile.js';

export const skinFacts = (p: Profile): SkinFacts => ({
  level: p.level,
  ascension: p.ascension,
  gear: p.gear,
});

/**
 * Bank any outfit the profile now qualifies for. Runs AFTER whatever earned it
 * was saved and never fails it - one missed now is picked up on the next sync.
 */
export const syncSkins = async (
  userId: string,
  profile: Profile
): Promise<Profile> => {
  const earned = newlyUnlockedSkins(skinFacts(profile), profile.skins);
  if (!earned.length) return profile;
  try {
    await redis.hSet(
      profileKey(userId),
      Object.fromEntries(earned.map((id) => [SKIN_FIELD + id, '1']))
    );
    return { ...profile, skins: [...profile.skins, ...earned] };
  } catch (err) {
    console.error('skin unlock failed: ' + String(err));
    return profile;
  }
};

/** Flair and outfits both, for every place that re-reads a profile after
 *  something that could have earned either. */
export const syncUnlocks = async (
  userId: string,
  profile: Profile
): Promise<Profile> => syncSkins(userId, await syncFlairs(userId, profile));

export type SkinResult =
  { ok: true; message: string } | { ok: false; message: string };

/** Wear an owned outfit on the class it was made for. */
export const equipSkin = async (
  userId: string,
  profile: Profile,
  skinId: string
): Promise<SkinResult> => {
  const def = skinById(skinId);
  if (!def) return { ok: false, message: 'No such outfit.' };
  if (!skinOwned(def, profile.skins))
    return { ok: false, message: 'That outfit is still locked.' };
  await saveProfile(userId, {
    skinWorn: { ...profile.skinWorn, [def.cls]: def.id },
  });
  return { ok: true, message: 'Now wearing ' + def.name + '.' };
};

/**
 * Buy a shop-exclusive outfit and put it on. The field is claimed before the
 * gems come off, so two taps racing each other charge once.
 */
export const buySkin = async (
  userId: string,
  profile: Profile,
  skinId: string
): Promise<SkinResult & { price?: number }> => {
  const def = skinById(skinId);
  if (!def || def.unlock.kind !== 'gems')
    return { ok: false, message: 'That outfit is not for sale.' };
  if (profile.skins.includes(def.id))
    return { ok: false, message: 'You already own ' + def.name + '.' };
  const price = def.unlock.price;
  if (profile.gems < price)
    return {
      ok: false,
      message: 'Not enough gems. Gems are bought on the GEMS tab.',
    };
  const first = await redis.hSetNX(
    profileKey(userId),
    SKIN_FIELD + def.id,
    '1'
  );
  if (!first)
    return { ok: false, message: 'You already own ' + def.name + '.' };
  await saveProfile(userId, {
    gems: profile.gems - price,
    skinWorn: { ...profile.skinWorn, [def.cls]: def.id },
  });
  return { ok: true, message: def.name + ' unlocked!', price };
};
