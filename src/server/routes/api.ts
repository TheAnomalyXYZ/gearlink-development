import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { context, redis } from '@devvit/web/server';
import type {
  BuyBundleRequest,
  BuyPackRequest,
  CollectPackRequest,
  DuelResultRequest,
  ErrorResponse,
  InitResponse,
  LeaderboardResponse,
  OpenPackRequest,
  OpenPackResponse,
  Profile,
  ProfileResponse,
  SubmitRunRequest,
  SubmitRunResponse,
} from '../../shared/api.js';
import { loadProfile, saveProfile } from '../core/profile.js';
import { getLeaderboard, recordScore } from '../core/leaderboard.js';
import {
  COINS_PER_SCORE,
  COIN_BUNDLES,
  DUEL_LOSS_TROPHIES,
  DUEL_MATCH_SECONDS,
  DUEL_WIN_TROPHIES,
  bundleById,
  packById,
  rollPack,
  verifyRun,
} from '../../shared/engine/index.js';
import type { PulledCard } from '../../shared/engine/economy.js';

export const api = new Hono();

type Who = { userId: string; username: string; postId: string };

/** Every route needs the same three things, and a logged-out visitor has no
 *  profile to read or write - so resolve once and bail here rather than in each
 *  handler. */
const who = (): Who | null => {
  const { userId, username, postId } = context;
  if (!userId || !postId) return null;
  return { userId, username: username ?? 'anonymous', postId };
};

const unauthorised = (c: HonoContext) =>
  c.json<ErrorResponse>(
    { status: 'error', message: 'Log in to Reddit to play GearLink.' },
    401
  );

api.get('/init', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const [profile, leaderboard] = await Promise.all([
    loadProfile(me.userId, me.username),
    getLeaderboard(me.postId, me.userId),
  ]);
  return c.json<InitResponse>({
    type: 'init',
    postId: me.postId,
    profile,
    leaderboard,
  });
});

api.get('/leaderboard', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  return c.json<LeaderboardResponse>({
    type: 'leaderboard',
    leaderboard: await getLeaderboard(me.postId, me.userId),
  });
});

/**
 * Submit a finished run. The body carries the seed, the loadout and the exact
 * moves; the server replays them through the shared engine and uses ITS score.
 * Nothing the client claims about the outcome is read.
 */
api.post('/run', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);

  const body = (await c.req
    .json()
    .catch(() => null)) as SubmitRunRequest | null;
  if (!body)
    return c.json<ErrorResponse>({ status: 'error', message: 'bad body' }, 400);

  const profile = await loadProfile(me.userId, me.username);

  // The loadout has to be gear this account actually owns, or a pack is
  // optional and the strongest cards are free.
  for (const id of body.picked ?? []) {
    if (!(profile.gear[id]! > 0))
      return c.json<ErrorResponse>(
        { status: 'error', message: 'loadout contains gear you do not own' },
        400
      );
  }

  const replay = verifyRun({
    seed: body.seed,
    heroClass: body.heroClass,
    picked: body.picked,
    moves: body.moves,
  });
  if (!replay.ok)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'run rejected: ' + replay.reason },
      400
    );

  const { score, state } = replay;
  const coinsEarned = Math.floor(score / COINS_PER_SCORE);
  const isNewBest = !profile.best || score > profile.best.score;
  const best = isNewBest
    ? {
        score,
        waves: state.wavesCleared,
        chain: state.maxChain,
        hero: body.heroClass,
      }
    : profile.best;

  await saveProfile(me.userId, { coins: profile.coins + coinsEarned, best });
  const { isBest, rank } = await recordScore(
    me.postId,
    me.userId,
    {
      username: me.username,
      waves: state.wavesCleared,
      chain: state.maxChain,
      hero: body.heroClass,
    },
    score
  );

  const [after, leaderboard] = await Promise.all([
    loadProfile(me.userId, me.username),
    getLeaderboard(me.postId, me.userId),
  ]);

  return c.json<SubmitRunResponse>({
    type: 'run',
    score,
    waves: state.wavesCleared,
    chain: state.maxChain,
    coinsEarned,
    isBest,
    rank,
    profile: after,
    leaderboard,
  });
});

const profileJson = (profile: Profile, message?: string) => {
  const body: ProfileResponse = { type: 'profile', profile };
  if (message !== undefined) body.message = message;
  return body;
};

api.post('/shop/pack', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req.json().catch(() => null)) as BuyPackRequest | null;
  const pack = packById(body?.packId ?? '');
  if (!pack)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'no such pack' },
      400
    );

  const profile = await loadProfile(me.userId, me.username);
  const balance = pack.cur === 'gems' ? profile.gems : profile.coins;
  if (balance < pack.price)
    return c.json(
      profileJson(
        profile,
        'Not enough ' +
          (pack.cur === 'gems' ? 'gems' : 'coins') +
          ' to open that pack.'
      )
    );

  const packs = {
    ...profile.packs,
    [pack.id]: (profile.packs[pack.id] ?? 0) + 1,
  };
  await saveProfile(me.userId, {
    packs,
    ...(pack.cur === 'gems'
      ? { gems: profile.gems - pack.price }
      : { coins: profile.coins - pack.price }),
  });
  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});

api.post('/shop/coins', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req
    .json()
    .catch(() => null)) as BuyBundleRequest | null;
  const b = bundleById(COIN_BUNDLES, body?.bundleId ?? '');
  if (!b || b.gems === undefined)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'no such bundle' },
      400
    );
  const profile = await loadProfile(me.userId, me.username);
  if (profile.gems < b.gems)
    return c.json(
      profileJson(profile, 'Not enough gems. Gems are bought on the GEMS tab.')
    );
  await saveProfile(me.userId, {
    gems: profile.gems - b.gems,
    coins: profile.coins + b.amount,
  });
  return c.json(
    profileJson(
      await loadProfile(me.userId, me.username),
      '+' + b.amount + ' coins.'
    )
  );
});

/* Gems are NOT sold here. They come in only through Devvit payments, fulfilled
   in routes/payments.ts off an order Reddit has already taken money for - so
   there is deliberately no endpoint a client can call to grant itself any. */

const openKey = (userId: string) => `open:${userId}`;
/** A pending open lives long enough to watch the reveal animation, and no
 *  longer - an abandoned open must not sit on the pack forever. */
const OPEN_TTL_SECONDS = 600;

/**
 * Roll a pack's contents and hold them UNREVEALED against a one-shot token.
 * The roll happens here, not on the client, and the cards only land in the
 * collection when COLLECT presents the token back - so a half-watched open
 * cannot half-apply, and a replayed collect cannot duplicate a pull.
 */
api.post('/shop/open', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req.json().catch(() => null)) as OpenPackRequest | null;
  const pack = packById(body?.packId ?? '');
  if (!pack)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'no such pack' },
      400
    );

  const profile = await loadProfile(me.userId, me.username);
  if ((profile.packs[pack.id] ?? 0) <= 0)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'you have no ' + pack.name },
      400
    );

  const cards = rollPack(pack, profile.gear, Math.random);
  const token = `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
  await redis.set(
    openKey(me.userId),
    JSON.stringify({ token, packId: pack.id, cards }),
    {
      expiration: new Date(Date.now() + OPEN_TTL_SECONDS * 1000),
    }
  );

  return c.json<OpenPackResponse>({
    type: 'openPack',
    packId: pack.id,
    cards,
    token,
  });
});

api.post('/shop/collect', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req
    .json()
    .catch(() => null)) as CollectPackRequest | null;
  const raw = await redis.get(openKey(me.userId));
  if (!raw)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'that pack open has expired' },
      400
    );

  let held: { token: string; packId: string; cards: PulledCard[] };
  try {
    held = JSON.parse(raw) as typeof held;
  } catch {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'bad open state' },
      400
    );
  }
  if (!body || body.token !== held.token)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'stale open token' },
      400
    );

  // Burn the token first: a collect that is retried after this point finds
  // nothing to apply, which is what stops a double-grant.
  await redis.del(openKey(me.userId));

  const profile = await loadProfile(me.userId, me.username);
  if ((profile.packs[held.packId] ?? 0) <= 0)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'pack already spent' },
      400
    );

  const gear = { ...profile.gear };
  let refund = 0;
  for (const card of held.cards) {
    gear[card.id] = (gear[card.id] ?? 0) + 1;
    refund += card.refund;
  }
  const packs = {
    ...profile.packs,
    [held.packId]: Math.max(0, (profile.packs[held.packId] ?? 0) - 1),
  };
  await saveProfile(me.userId, { gear, packs, coins: profile.coins + refund });
  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});

/**
 * Duel outcome. A duel runs against a local AI on a real-time clock, so there
 * is no move list to replay - this is reported, not verified. It is bounded
 * instead: the trophy delta is fixed, and a "win" that arrives faster than a
 * duel can physically be played is refused.
 */
const DUEL_MIN_SECONDS = 10;

api.post('/duel/result', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req
    .json()
    .catch(() => null)) as DuelResultRequest | null;
  if (!body)
    return c.json<ErrorResponse>({ status: 'error', message: 'bad body' }, 400);

  const seconds = Number(body.seconds);
  const profile = await loadProfile(me.userId, me.username);
  const credible =
    Number.isFinite(seconds) &&
    seconds >= DUEL_MIN_SECONDS &&
    seconds <= DUEL_MATCH_SECONDS + 30;
  // An implausible win still costs nothing and gains nothing, rather than
  // erroring - the duel is already over on the client either way.
  const delta = !credible
    ? 0
    : body.won
      ? DUEL_WIN_TROPHIES
      : -DUEL_LOSS_TROPHIES;
  await saveProfile(me.userId, {
    trophies: Math.max(0, profile.trophies + delta),
  });
  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});

/** The two coaching flows are each seen once per ACCOUNT, not once per device. */
api.post('/ftue/seen', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req.json().catch(() => null)) as {
    which?: string;
  } | null;
  if (body?.which === 'duel')
    await saveProfile(me.userId, { seenDuelFtue: true });
  else await saveProfile(me.userId, { seenFtue: true });
  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});
