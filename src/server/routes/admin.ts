/**
 * The moderator admin panel: analytics, player lookup, gifts and resets.
 *
 * Every route here is behind the moderator check below. The panel itself is
 * only offered to moderators by the client, but that is a convenience - this
 * middleware is what actually keeps everyone else out.
 */
import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { context, redis } from '@devvit/web/server';
import type {
  AdminActionResponse,
  AdminDashboardResponse,
  AdminExportResponse,
  AdminGiftRequest,
  AdminUserResponse,
  AdminUserRow,
  AdminUsersResponse,
} from '../../shared/admin.js';
import {
  DASHBOARD_DAYS,
  MAX_GIFT_AMOUNT,
  STATS_RETENTION_DAYS,
} from '../../shared/admin.js';
import type { ErrorResponse } from '../../shared/api.js';
import { packById } from '../../shared/engine/economy.js';
import { isModerator } from '../core/mods.js';
import { loadProfile, profileKey, saveProfile } from '../core/profile.js';
import { removeFromPool, isInPool } from '../core/duelpool.js';
import { resetQuests } from '../core/quests.js';
import {
  PLAYERS_FIRST,
  PLAYERS_HANDLES,
  PLAYERS_NAMES,
  PLAYERS_SEEN,
  computePopulation,
  isEmptyDay,
  readDays,
  readRecentPurchases,
} from '../core/stats.js';

export const admin = new Hono();

const fail = (c: HonoContext, message: string, status: 400 | 401 | 404 | 500) =>
  c.json<ErrorResponse>({ status: 'error', message }, status);

admin.use('*', async (c, next) => {
  try {
    if (await isModerator(context.userId)) return await next();
  } catch (err) {
    console.error('admin auth failed: ' + String(err));
  }
  return fail(c, 'Moderators only.', 401);
});

/** Any thrown error becomes a JSON 500 the panel can show. */
admin.onError((err, c) => {
  console.error('admin route failed: ' + String(err));
  return fail(c, err instanceof Error ? err.message : String(err), 500);
});

/* ---------- analytics ---------- */

admin.get('/dashboard', async (c) => {
  const [days, population, recentPurchases] = await Promise.all([
    readDays(DASHBOARD_DAYS),
    computePopulation(),
    readRecentPurchases(),
  ]);
  return c.json<AdminDashboardResponse>({
    type: 'adminDashboard',
    days,
    population,
    recentPurchases,
  });
});

/**
 * Every day still kept, as one JSON document. Counts only: no user ids or
 * names, so the recent-purchases log is left out.
 */
admin.get('/export', async (c) => {
  const days = await readDays(STATS_RETENTION_DAYS);
  const first = days.findIndex((d) => !isEmptyDay(d));
  return c.json<AdminExportResponse>({
    type: 'adminExport',
    format: 'gearlink-analytics',
    version: 1,
    exportedAt: new Date().toISOString(),
    days: first === -1 ? [] : days.slice(first),
    population: await computePopulation(),
  });
});

/* ---------- players ---------- */

const PAGE_SIZE = 20;
const SEARCH_LIMIT = 20;

const rowsFor = async (ids: string[]): Promise<AdminUserRow[]> =>
  Promise.all(
    ids.map(async (userId) => {
      const [first, seen, handle] = await Promise.all([
        redis.zScore(PLAYERS_FIRST, userId),
        redis.zScore(PLAYERS_SEEN, userId),
        redis.hGet(PLAYERS_HANDLES, userId),
      ]);
      return {
        userId,
        username: handle ?? userId,
        firstSeen: first ?? null,
        lastSeen: seen ?? null,
      };
    })
  );

/** Most recently seen first. */
admin.get('/users', async (c) => {
  const raw = Number(c.req.query('offset'));
  const offset = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  const page = await redis.zRange(PLAYERS_SEEN, offset, offset + PAGE_SIZE, {
    by: 'rank',
    reverse: true,
  });
  const ids = page.slice(0, PAGE_SIZE).map((e) => e.member);
  return c.json<AdminUsersResponse>({
    type: 'adminUsers',
    users: await rowsFor(ids),
    more: page.length > PAGE_SIZE,
  });
});

admin.get('/users/search', async (c) => {
  const q = (c.req.query('q') ?? '').toLowerCase().trim();
  if (!q)
    return c.json<AdminUsersResponse>({
      type: 'adminUsers',
      users: [],
      more: false,
    });
  const all = (await redis.hGetAll(PLAYERS_NAMES)) ?? {};
  const hits = Object.entries(all)
    .filter(([name]) => name.includes(q))
    // An exact handle first, then the shortest matches.
    .sort(
      ([a], [b]) => Number(b === q) - Number(a === q) || a.length - b.length
    );
  const ids = [...new Set(hits.map(([, id]) => id))];
  return c.json<AdminUsersResponse>({
    type: 'adminUsers',
    users: await rowsFor(ids.slice(0, SEARCH_LIMIT)),
    more: ids.length > SEARCH_LIMIT,
  });
});

const userJson = async (userId: string): Promise<AdminUserResponse | null> => {
  const [raw, [row]] = await Promise.all([
    redis.hGetAll(profileKey(userId)),
    rowsFor([userId]),
  ]);
  const indexed = row && (row.firstSeen !== null || row.lastSeen !== null);
  if (!row || (!indexed && !Object.keys(raw ?? {}).length)) return null;
  return {
    type: 'adminUser',
    user: row,
    raw: raw ?? {},
    inPool: await isInPool(userId),
  };
};

admin.get('/user/:userId', async (c) => {
  const body = await userJson(c.req.param('userId'));
  if (!body) return fail(c, 'No such player.', 404);
  return c.json<AdminUserResponse>(body);
});

const giftAmount = (v: unknown): number | 'bad' | 0 => {
  if (v === undefined || v === null || v === 0) return 0;
  return typeof v === 'number' &&
    Number.isInteger(v) &&
    v > 0 &&
    v <= MAX_GIFT_AMOUNT
    ? v
    : 'bad';
};

/**
 * Add currency, heart pieces or unopened packs to a player. Additive only:
 * there is no way to take anything away here, so a typo costs a moderator a
 * gift, never a player their collection.
 */
admin.post('/user/:userId/gift', async (c) => {
  const userId = c.req.param('userId');
  const body: unknown = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') return fail(c, 'bad body', 400);
  const field = (k: keyof AdminGiftRequest): unknown => Reflect.get(body, k);

  const amounts: Record<'coins' | 'gems' | 'heartPieces', number> = {
    coins: 0,
    gems: 0,
    heartPieces: 0,
  };
  for (const name of ['coins', 'gems', 'heartPieces'] as const) {
    const n = giftAmount(field(name));
    if (n === 'bad')
      return fail(
        c,
        name + ' must be a whole number from 1 to ' + MAX_GIFT_AMOUNT,
        400
      );
    amounts[name] = n;
  }
  const packs: Record<string, number> = {};
  const rawPacks = field('packs');
  if (rawPacks !== undefined && (!rawPacks || typeof rawPacks !== 'object'))
    return fail(c, 'packs must be an object', 400);
  for (const [id, v] of Object.entries(rawPacks ?? {})) {
    if (!packById(id)) return fail(c, 'no such pack: ' + id, 400);
    const n = giftAmount(v);
    if (n === 'bad') return fail(c, 'bad pack count for ' + id, 400);
    if (n) packs[id] = n;
  }
  if (
    !amounts.coins &&
    !amounts.gems &&
    !amounts.heartPieces &&
    !Object.keys(packs).length
  )
    return fail(c, 'Nothing to gift.', 400);

  const user = await userJson(userId);
  if (!user) return fail(c, 'No such player.', 404);

  const profile = await loadProfile(userId, user.user.username);
  const nextPacks = { ...profile.packs };
  for (const [id, n] of Object.entries(packs))
    nextPacks[id] = (nextPacks[id] ?? 0) + n;
  await saveProfile(userId, {
    coins: profile.coins + amounts.coins,
    gems: profile.gems + amounts.gems,
    heartPieces: profile.heartPieces + amounts.heartPieces,
    packs: nextPacks,
  });

  const parts = [
    amounts.coins && '+' + amounts.coins + ' coins',
    amounts.gems && '+' + amounts.gems + ' gems',
    amounts.heartPieces && '+' + amounts.heartPieces + ' heart pieces',
    ...Object.entries(packs).map(
      ([id, n]) => '+' + n + ' ' + (packById(id)?.name ?? id)
    ),
  ].filter(Boolean);
  console.log(
    'admin gift by ' +
      context.username +
      ' to ' +
      userId +
      ': ' +
      parts.join(', ')
  );
  return c.json<AdminActionResponse>({
    type: 'adminAction',
    message: 'Gifted ' + user.user.username + ': ' + parts.join(', ') + '.',
  });
});

/**
 * Wipe a player back to a fresh account: profile, this period's quests, any
 * half-open pack, and their place in the duel pool. They stay in the player
 * index (they are still a player), and per-post ladder scores are kept. The
 * profile going takes `seenFtue` and the primers with it, so the next open
 * plays the first-run coaching from the top.
 */
const wipePlayer = async (userId: string): Promise<void> => {
  await redis.del(profileKey(userId), `open:${userId}`);
  await resetQuests(userId);
  await removeFromPool(userId);
};

admin.post('/user/:userId/reset', async (c) => {
  const userId = c.req.param('userId');
  const user = await userJson(userId);
  if (!user) return fail(c, 'No such player.', 404);
  await wipePlayer(userId);
  console.log('admin reset by ' + context.username + ' of ' + userId);
  return c.json<AdminActionResponse>({
    type: 'adminAction',
    message: 'Progress reset for ' + user.user.username + '.',
  });
});

/**
 * The moderator's own account, back to day one - for reviewing the first-run
 * experience without hunting yourself down in the player list.
 */
admin.post('/me/reset', async (c) => {
  const userId = context.userId;
  if (!userId) return fail(c, 'Not logged in.', 401);
  await wipePlayer(userId);
  console.log('admin self-reset by ' + context.username);
  return c.json<AdminActionResponse>({
    type: 'adminAction',
    message: 'Your account is reset. Starting over from the beginning.',
  });
});
