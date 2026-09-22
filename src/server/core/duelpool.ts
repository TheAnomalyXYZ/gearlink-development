/**
 * The opponent pool.
 *
 * Every player who has LISTED their duel loadout sits in one sorted set scored
 * by their trophy count, with a companion hash holding what the lobby needs to
 * draw them: handle, snoovatar, class and their five. A lobby is then just a
 * slice of that set either side of the asker's own score - which is what makes
 * the five rows "people near your rating" rather than a global top list.
 *
 * Nothing here plays a duel. The match is still driven by the local bot; what
 * the pool supplies is WHO it plays as.
 */
import { redis, reddit } from '@devvit/web/server';
import {
  DUEL_BOTS,
  DUEL_LOBBY_SIZE,
  DUEL_MATCH_BAND,
  skillForTrophies,
} from '../../shared/engine/duel.js';
import type { DuelFoe } from '../../shared/engine/duel.js';
import { leagueOf } from '../../shared/engine/league.js';
import { loadoutIsLegal } from '../../shared/engine/gear.js';
import type { HeroClass } from '../../shared/engine/types.js';

const POOL_KEY = 'duelpool';
const POOL_META = 'duelpoolmeta';

type PoolMeta = {
  username: string;
  cls: HeroClass;
  picked: string[];
  avatar: string;
};

/** A listed player's blurb is their league, not a personality line - the bot
 *  drives their kit, so promising a play style would be a lie. */
const blurbFor = (trophies: number, cls: HeroClass): string =>
  leagueOf(trophies).name + ' - duels as ' + cls;

const readMeta = (raw: string | undefined): PoolMeta | null => {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<PoolMeta>;
    const cls = p.cls;
    if (cls !== 'Hero' && cls !== 'Archer' && cls !== 'Mage') return null;
    const picked = Array.isArray(p.picked)
      ? p.picked.filter((x): x is string => typeof x === 'string')
      : [];
    return {
      username: typeof p.username === 'string' ? p.username : 'someone',
      cls,
      picked: loadoutIsLegal(picked, cls) ? picked : [],
      avatar: typeof p.avatar === 'string' ? p.avatar : '',
    };
  } catch {
    return null;
  }
};

/** Snoovatars are fetched once, when a loadout is listed, and kept on the pool
 *  row - a lobby draws five opponents and must not cost five extra round trips
 *  to Reddit to do it. */
const fetchAvatar = async (username: string): Promise<string> => {
  try {
    return (await reddit.getSnoovatarUrl(username)) ?? '';
  } catch {
    return '';
  }
};

export const listInPool = async (
  userId: string,
  username: string,
  trophies: number,
  cls: HeroClass,
  picked: string[]
): Promise<void> => {
  const avatar = await fetchAvatar(username);
  const meta: PoolMeta = { username, cls, picked, avatar };
  await redis.zAdd(POOL_KEY, { member: userId, score: trophies });
  await redis.hSet(POOL_META, { [userId]: JSON.stringify(meta) });
};

export const removeFromPool = async (userId: string): Promise<void> => {
  await redis.zRem(POOL_KEY, [userId]);
  await redis.hDel(POOL_META, [userId]);
};

/** Keep a listed player's pool score in step with their trophies, so the bands
 *  other people match against stay honest. A player who is not listed is left
 *  alone rather than silently added back. */
export const syncPoolScore = async (
  userId: string,
  trophies: number
): Promise<void> => {
  const at = await redis.zScore(POOL_KEY, userId);
  if (at === undefined) return;
  await redis.zAdd(POOL_KEY, { member: userId, score: trophies });
};

/** Bots nearest a rating, closest first. The house roster is what keeps a lobby
 *  from being empty in a subreddit where nobody has listed yet. */
const botsNear = (trophies: number): DuelFoe[] =>
  DUEL_BOTS.slice()
    .sort(
      (a, b) => Math.abs(a.rating - trophies) - Math.abs(b.rating - trophies)
    )
    .map((b) => ({ ...b, blurb: leagueOf(b.rating).name + ' - ' + b.blurb }));

/**
 * Five opponents near `trophies`, excluding the asker.
 *
 * The band widens rather than returning nothing: a subreddit with six listed
 * players should still fill a lobby, even if none of them are within 250. The
 * cursor is what REFRESH moves - it rotates the window through everyone the
 * widened band found, so pressing it walks the neighbourhood instead of
 * reshuffling the same five.
 */
export const opponentsNear = async (
  userId: string,
  trophies: number,
  cursor: number
): Promise<{ opponents: DuelFoe[]; padded: boolean }> => {
  let rows: { member: string; score: number }[] = [];
  for (const mult of [1, 3, 10]) {
    const band = DUEL_MATCH_BAND * mult;
    rows = await redis.zRange(
      POOL_KEY,
      Math.max(0, trophies - band),
      trophies + band,
      { by: 'score' }
    );
    rows = rows.filter((r) => r.member !== userId);
    if (rows.length >= DUEL_LOBBY_SIZE) break;
  }

  // Closest first, so a widened band still leads with the fairest matches.
  rows.sort(
    (a, b) => Math.abs(a.score - trophies) - Math.abs(b.score - trophies)
  );

  const window: { member: string; score: number }[] = [];
  if (rows.length) {
    const start = ((cursor % rows.length) + rows.length) % rows.length;
    for (let i = 0; i < Math.min(DUEL_LOBBY_SIZE, rows.length); i++)
      window.push(rows[(start + i) % rows.length]!);
  }

  const meta = window.length ? await redis.hGetAll(POOL_META) : {};
  const opponents: DuelFoe[] = [];
  for (const r of window) {
    const m = readMeta(meta[r.member]);
    if (!m) continue;
    opponents.push({
      kind: 'player',
      id: r.member,
      name: m.username,
      cls: m.cls,
      rating: Math.round(r.score),
      skill: skillForTrophies(r.score),
      blurb: blurbFor(r.score, m.cls),
      avatar: m.avatar,
      picked: m.picked,
    });
  }

  const padded = opponents.length < DUEL_LOBBY_SIZE;
  if (padded) {
    const bots = botsNear(trophies);
    // Rotate the bots too, so REFRESH changes the padding as well as the people.
    for (let i = 0; opponents.length < DUEL_LOBBY_SIZE && i < bots.length; i++)
      opponents.push(bots[(cursor + i) % bots.length]!);
  }

  return { opponents, padded };
};
