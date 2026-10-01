import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type {
  ApplyHeartRequest,
  BuyBundleRequest,
  BuyPackRequest,
  CollectPackRequest,
  ChallengeResponse,
  ClaimQuestRequest,
  ClaimQuestResponse,
  DuelChallengeResponse,
  DuelListedRequest,
  DuelOpponentsResponse,
  DuelResultRequest,
  SaveDuelLoadoutRequest,
  ErrorResponse,
  InitResponse,
  LeaderboardResponse,
  OpenPackRequest,
  OpenPackResponse,
  Profile,
  ProfileResponse,
  QuestsResponse,
  SubmitRunRequest,
  SubmitRunResponse,
} from '../../shared/api.js';
import {
  countDuel,
  dismissPrize,
  loadProfile,
  profileKey,
  saveProfile,
} from '../core/profile.js';
import { isModeratorSafe } from '../core/mods.js';
import {
  recordDuel,
  recordEvent,
  recordQuestClaim,
  recordRun,
  recordSpend,
  recordVisit,
} from '../core/stats.js';
import { coinBundleSku, packSku } from '../../shared/admin.js';
import { getLeaderboard, recordScore } from '../core/leaderboard.js';
import {
  listInPool,
  opponentsInTier,
  removeFromPool,
  syncPoolScore,
} from '../core/duelpool.js';
import {
  createChallengePost,
  readChallengeCard,
  readChallengeFoe,
} from '../core/post.js';
import { readPoster } from '../core/daily.js';
import {
  claimQuest,
  loadQuestBoard,
  recordQuestEvents,
} from '../core/quests.js';
import {
  COINS_PER_SCORE,
  COIN_BUNDLES,
  HEART_PIECES_PER_CONTAINER,
  LOCATIONS,
  MAP_LENGTH,
  MAX_ASCENSION,
  canApplyHeart,
  heartPiecesForBoss,
  heartsFor,
  locationIndex,
  DUEL_LOSS_TROPHIES,
  DUEL_MATCH_SECONDS,
  DUEL_WIN_TROPHIES,
  bundleById,
  loadoutIsLegal,
  packById,
  rollPack,
  runQuestEvents,
  applyDuelDelta,
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
  // Before the profile read: a first read writes the profile, and the visit
  // has to see whether one existed to know if this is a new player.
  await recordVisit(me.userId, me.username);
  const [profile, leaderboard, challenger, isModerator] = await Promise.all([
    loadProfile(me.userId, me.username),
    getLeaderboard(me.postId, me.userId),
    // A failed read only means the post opens like any other.
    readChallengeFoe(me.postId, me.userId, me.username).catch(() => null),
    isModeratorSafe(me.userId),
  ]);
  return c.json<InitResponse>({
    type: 'init',
    postId: me.postId,
    profile,
    leaderboard,
    challenger,
    isModerator,
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

  // The map is the server's to hand out: a location past the player's progress
  // is not theirs to fight, and the ascension has to be the one the profile
  // records or the replay would score different monsters than were fought.
  const locId = body.locationId ?? LOCATIONS[0]!.id;
  if (!LOCATIONS.some((l) => l.id === locId))
    return c.json<ErrorResponse>(
      { status: 'error', message: 'unknown location' },
      400
    );
  const locIdx = locationIndex(locId);
  if (locIdx > profile.progress)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'that location is still locked' },
      400
    );
  if (body.ascension !== profile.ascension)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'ascension mismatch' },
      400
    );
  const hearts = heartsFor(profile.hearts, body.heroClass);
  if (body.hearts !== hearts)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'heart containers mismatch' },
      400
    );

  const replay = verifyRun({
    seed: body.seed,
    heroClass: body.heroClass,
    picked: body.picked,
    moves: body.moves,
    locationId: locId,
    ascension: profile.ascension,
    hearts,
  });
  if (!replay.ok)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'run rejected: ' + replay.reason },
      400
    );

  const { score, state, won, waveCount } = replay;
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

  /* A win opens the NEXT location, and never closes one already open - a
     replayed early location must not walk the map backwards. The Castle is the
     exception: its win is an ascension, so the map starts over one tier up. */
  const isKing = won && locIdx === MAP_LENGTH - 1;
  /* Heart pieces drop on a location's FIRST clear this ascension only. The
     frontier is exactly `progress`, so re-fighting somewhere already taken
     pays nothing and the first location cannot be farmed for a bigger pool. */
  const firstClear = won && locIdx === profile.progress;
  const heartPiecesEarned = firstClear ? heartPiecesForBoss(locIdx) : 0;
  const ascended = isKing && profile.ascension < MAX_ASCENSION;
  const ascension = ascended ? profile.ascension + 1 : profile.ascension;
  const progress = isKing
    ? ascended
      ? 0
      : MAP_LENGTH
    : won
      ? Math.max(profile.progress, locIdx + 1)
      : profile.progress;

  await saveProfile(me.userId, {
    coins: profile.coins + coinsEarned,
    best,
    ascension,
    progress,
    heartPieces: profile.heartPieces + heartPiecesEarned,
  });
  await recordRun({
    heroClass: body.heroClass,
    locationId: locId,
    won,
    king: isKing,
    ascended,
  });
  await recordQuestEvents(
    me.userId,
    runQuestEvents({
      won,
      king: isKing,
      waves: state.wavesCleared,
      chain: state.maxChain,
      coins: coinsEarned,
    })
  );
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
    won,
    waveCount,
    ascended,
    heartPiecesEarned,
    profile: after,
    leaderboard,
  });
});

/**
 * Spend three pieces on one more container for a class.
 *
 * The class is the caller's to choose and the pool is shared, so the ONLY
 * checks are that the pieces exist and the class is not already capped. The
 * write is a read-modify-write on one profile, which is the same shape every
 * other purchase here uses.
 */
api.post('/hearts/apply', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);

  const body = (await c.req
    .json()
    .catch(() => null)) as ApplyHeartRequest | null;
  const cls = body?.cls;
  if (cls !== 'Hero' && cls !== 'Archer' && cls !== 'Mage')
    return c.json<ErrorResponse>(
      { status: 'error', message: 'unknown hero class' },
      400
    );

  const profile = await loadProfile(me.userId, me.username);
  const have = heartsFor(profile.hearts, cls);
  if (!canApplyHeart(profile.heartPieces, have))
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message:
          profile.heartPieces < HEART_PIECES_PER_CONTAINER
            ? 'You need ' + HEART_PIECES_PER_CONTAINER + ' heart pieces.'
            : 'This hero is already at full health.',
      },
      400
    );

  const hearts = { ...profile.hearts, [cls]: have + 1 };
  await saveProfile(me.userId, {
    heartPieces: profile.heartPieces - HEART_PIECES_PER_CONTAINER,
    hearts,
  });
  await recordEvent('hearts_applied');
  const after = await loadProfile(me.userId, me.username);
  return c.json<ProfileResponse>(
    profileJson(after, cls + ' gained a heart container.')
  );
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
  await recordSpend(
    me.userId,
    me.username,
    packSku(pack.id),
    pack.cur === 'gems' ? 'gems' : 'coins',
    pack.price
  );
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
  await recordSpend(
    me.userId,
    me.username,
    coinBundleSku(b.id),
    'gems',
    b.gems
  );
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
  await recordQuestEvents(me.userId, [{ metric: 'packs', amount: 1 }]);
  await recordEvent('packs_opened');
  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});

/**
 * Save the duel loadout, and list or delist it in the opponent pool.
 *
 * The five are checked here the same way a run's are: owned, legal, and of the
 * hero's own class. A listed loadout is what OTHER people's lobbies hand their
 * bot, so a forged one would be a forged opponent for everybody.
 */
api.post('/duel/loadout', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req
    .json()
    .catch(() => null)) as SaveDuelLoadoutRequest | null;
  if (!body || !loadoutIsLegal(body.picked ?? [], body.cls))
    return c.json<ErrorResponse>(
      { status: 'error', message: 'that is not a legal five' },
      400
    );

  const profile = await loadProfile(me.userId, me.username);
  for (const id of body.picked)
    if (!(profile.gear[id]! > 0))
      return c.json<ErrorResponse>(
        { status: 'error', message: 'loadout contains gear you do not own' },
        400
      );

  // Entry is locked for the week: a player already in this week's league can
  // change their five, but saving it never takes them back out.
  const listed = !!body.listed || profile.duelListed;
  await saveProfile(me.userId, {
    duelCls: body.cls,
    duelPicked: body.picked,
    duelListed: listed,
    seenDuelSetup: true,
  });
  if (listed && !profile.duelListed) await recordEvent('league_entries');
  if (listed)
    await listInPool(
      me.userId,
      me.username,
      profile.trophies,
      body.cls,
      body.picked
    );
  else await removeFromPool(me.userId);

  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});

/** Opt in or out without rebuilding. Opting out only hides you from other
 *  people's lobbies - it never stops you duelling. */
api.post('/duel/listed', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req
    .json()
    .catch(() => null)) as DuelListedRequest | null;
  const profile = await loadProfile(me.userId, me.username);
  const listed = !!body?.listed;
  // No leaving mid-week: hiding a lead from challengers is exactly what the
  // lock exists to stop. Entry lapses by itself at the Monday reset.
  if (!listed && profile.duelListed)
    return c.json(
      profileJson(
        profile,
        "You're in this week's league until the Monday reset."
      )
    );
  if (listed && (!profile.duelCls || profile.duelPicked.length !== 5))
    return c.json(
      profileJson(profile, 'Build a duel loadout before you list it.')
    );

  await saveProfile(me.userId, { duelListed: listed });
  if (listed && !profile.duelListed) await recordEvent('league_entries');
  if (listed)
    await listInPool(
      me.userId,
      me.username,
      profile.trophies,
      profile.duelCls!,
      profile.duelPicked
    );
  else await removeFromPool(me.userId);
  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});

/** Five opponents in the asker's tier. `cursor` is what REFRESH
 *  advances, so the button walks the neighbourhood instead of re-rolling it. */
api.get('/duel/opponents', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const raw = Number(c.req.query('cursor'));
  const cursor = Number.isFinite(raw) ? Math.floor(raw) : 0;
  const profile = await loadProfile(me.userId, me.username);
  const { opponents, padded } = await opponentsInTier(
    me.userId,
    profile.trophies,
    cursor
  );
  return c.json<DuelOpponentsResponse>({
    type: 'opponents',
    opponents,
    cursor,
    padded,
  });
});

/** The snoovatar a challenge post carries. A missing one is not an error - the
 *  card falls back to the duellist's class art. */
const snoovatarOf = async (username: string): Promise<string> => {
  try {
    return (await reddit.getSnoovatarUrl(username)) ?? '';
  } catch {
    return '';
  }
};

/** Share a new loadout as a post, so the challenge reaches people who are not
 *  in the app. Only a LISTED player can post one - a challenge nobody can
 *  answer from the lobby would be an empty invitation. */
api.post('/duel/challenge', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const profile = await loadProfile(me.userId, me.username);
  if (!profile.duelListed || !profile.duelCls)
    return c.json<ErrorResponse>(
      { status: 'error', message: 'list your loadout before challenging' },
      400
    );
  try {
    const post = await createChallengePost(
      me.userId,
      me.username,
      profile.trophies,
      profile.duelCls,
      profile.duelPicked,
      await snoovatarOf(me.username)
    );
    await recordEvent('challenge_posts');
    return c.json<DuelChallengeResponse>({
      type: 'challenge',
      url: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (e) {
    console.error('challenge post failed: ' + String(e));
    return c.json<ErrorResponse>(
      { status: 'error', message: 'could not post that challenge' },
      500
    );
  }
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
  // Only a player entered in this week's league plays for trophies; anyone
  // else's duel is a friendly one. Otherwise a lead could be kept by duelling from
  // outside the pool, where nobody can challenge it.
  const ranked = credible && profile.duelListed;
  const delta = !ranked
    ? 0
    : body.won
      ? DUEL_WIN_TROPHIES
      : -DUEL_LOSS_TROPHIES;
  // Held inside the current tier: crossing a tier line only happens at the
  // weekly reset, from level 3 up or level 1 down.
  const trophies = applyDuelDelta(profile.trophies, delta);
  await saveProfile(me.userId, { trophies });
  // The pool is scored by trophies, so a result that moves them has to move the
  // band this player is matched in - otherwise a climber keeps being offered to
  // the rung they left.
  if (trophies !== profile.trophies) await syncPoolScore(me.userId, trophies);
  // Quests count the same bounded result the trophies do, so an implausible
  // duel advances neither.
  if (ranked) await countDuel(me.userId);
  if (credible) await recordDuel(ranked, !!body.won);
  if (credible)
    await recordQuestEvents(me.userId, [
      { metric: 'duels', amount: 1 },
      { metric: 'duelWins', amount: body.won ? 1 : 0 },
    ]);
  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});

/**
 * What this post's inline view should draw. A challenge post answers with the
 * duellist who made it; every other GearLink post answers with null and gets
 * the plain splash. Deliberately unauthenticated: the feed shows this card to
 * logged-out visitors too, and it exposes nothing the post title does not.
 */
api.get('/challenge', async (c) => {
  const { postId, username } = context;
  if (!postId)
    return c.json<ChallengeResponse>({
      type: 'challengeCard',
      card: null,
      poster: null,
      viewer: null,
    });
  // The reader fills the open side of the plate, so they are looked up with
  // the card. A logged-out visitor has no handle and gets no face, which the
  // card already draws as the anonymous seat.
  const [card, poster, avatar] = await Promise.all([
    readChallengeCard(postId),
    readPoster(postId),
    username ? snoovatarOf(username) : Promise.resolve(''),
  ]);
  return c.json<ChallengeResponse>({
    type: 'challengeCard',
    card,
    poster: card ? null : poster,
    viewer: username ? { username, avatar } : null,
  });
});

/** The weekly prize was paid at the reset; this only clears its notice. */
api.post('/duel/prize/seen', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  await dismissPrize(me.userId);
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
  else if (body?.which === 'duelSetup')
    await saveProfile(me.userId, { seenDuelSetup: true });
  else {
    // Counted once per account: the coaching can be replayed, the first
    // finish only happens once.
    const seen = await redis.hGet(profileKey(me.userId), 'seenFtue');
    await saveProfile(me.userId, { seenFtue: true });
    if (seen !== '1') await recordEvent('ftue_done');
  }
  return c.json(profileJson(await loadProfile(me.userId, me.username)));
});

/* ---------- quests ---------- */

api.get('/quests', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  return c.json<QuestsResponse>({
    type: 'quests',
    board: await loadQuestBoard(me.userId),
  });
});

/** Pay out one finished quest. Progress is the server's own count, so the only
 *  thing the client names is which quest. */
api.post('/quests/claim', async (c) => {
  const me = who();
  if (!me) return unauthorised(c);
  const body = (await c.req
    .json()
    .catch(() => null)) as ClaimQuestRequest | null;
  const res = await claimQuest(me.userId, me.username, body?.questId ?? '');
  if (!res.ok)
    return c.json<ErrorResponse>(
      { status: 'error', message: res.message },
      400
    );
  await recordQuestClaim(body?.questId ?? '');
  const [profile, board] = await Promise.all([
    loadProfile(me.userId, me.username),
    loadQuestBoard(me.userId),
  ]);
  return c.json<ClaimQuestResponse>({
    type: 'questClaim',
    profile,
    board,
    message: res.message,
  });
});
