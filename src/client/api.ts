/**
 * Thin typed wrapper over the app's own endpoints.
 *
 * Every call that changes anything returns the profile the SERVER now holds, so
 * the client never has to guess what a purchase or a run did to the wallet - it
 * adopts what came back.
 */
import type {
  ApplyHeartRequest,
  UpgradeGearRequest,
  SalvageGearRequest,
  ChallengeResponse,
  ClaimQuestResponse,
  CollectPackRequest,
  DonateResponse,
  DuelChallengeResponse,
  DuelOpponentsResponse,
  DuelRefreshResponse,
  DuelResultRequest,
  DuelStartResponse,
  SaveDuelLoadoutRequest,
  InitResponse,
  LeaderboardResponse,
  SoloBoardsResponse,
  OpenPackResponse,
  ProfileResponse,
  QuestsResponse,
  ReviveRunRequest,
  RunSeedResponse,
  StreakClaimResponse,
  SubmitRunRequest,
  SubmitRunResponse,
  WarChestResponse,
} from '../shared/api.js';
import type {
  AdminActionResponse,
  AdminDashboardResponse,
  AdminExportResponse,
  AdminGiftRequest,
  AdminUserResponse,
  AdminUsersResponse,
} from '../shared/admin.js';
import type { HeroClass } from '../shared/engine/types.js';

class ApiError extends Error {
  /** Set when a run was refused for its seed: the one to fight on next. */
  readonly nextSeed: number | null;
  constructor(message: string, nextSeed: number | null = null) {
    super(message);
    this.nextSeed = nextSeed;
  }
}

/** A 409 with no seed attached means the player's previous write was still
 *  landing; the request never ran, so it is safe to send again. */
const BUSY_RETRIES = 2;
const BUSY_RETRY_MS = 400;

/** Tells one endpoint's answer apart from anything else that can come back on
 *  a 200 - a proxy's HTML, a stale route's shape. Every response carries its
 *  `type` tag, so checking the tag is the whole check; the payload behind it
 *  is the server's, which the client trusts anyway. */
type Guard<T> = (json: unknown) => json is T;

const tagged =
  <T extends { type: string }>(type: T['type']): Guard<T> =>
  (json): json is T =>
    typeof json === 'object' &&
    json !== null &&
    'type' in json &&
    json.type === type;

const isProfile = tagged<ProfileResponse>('profile');
const isOk: Guard<{ ok: boolean }> = (json): json is { ok: boolean } =>
  typeof json === 'object' &&
  json !== null &&
  'ok' in json &&
  typeof json.ok === 'boolean';

const call = async <T>(
  path: string,
  is: Guard<T>,
  body?: unknown
): Promise<T> => {
  const init: RequestInit =
    body === undefined
      ? { method: 'GET' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        };
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('/api' + path, init);
    const json: unknown = await res.json().catch(() => null);
    if (res.ok) {
      if (!is(json)) throw new ApiError('Unexpected response from ' + path);
      return json;
    }
    const nextSeed =
      json &&
      typeof json === 'object' &&
      'nextSeed' in json &&
      typeof json.nextSeed === 'number'
        ? json.nextSeed
        : null;
    if (res.status === 409 && nextSeed === null && attempt < BUSY_RETRIES) {
      await new Promise((r) => setTimeout(r, BUSY_RETRY_MS));
      continue;
    }
    const msg =
      json && typeof json === 'object' && 'message' in json
        ? String(json.message)
        : 'Request failed (' + res.status + ')';
    throw new ApiError(msg, nextSeed);
  }
};

export const api = {
  init: () => call('/init', tagged<InitResponse>('init')),
  /** Re-read the wallet after a purchase Reddit fulfilled out of band. */
  profile: () => call('/init', tagged<InitResponse>('init')),
  leaderboard: () =>
    call('/leaderboard', tagged<LeaderboardResponse>('leaderboard')),
  solo: () => call('/solo', tagged<SoloBoardsResponse>('solo')),
  soloPrizeSeen: () => call('/solo/prize/seen', isProfile, {}),
  soloAlertSeen: () => call('/solo/alert/seen', isOk, {}),
  /** The pending battle seed, for when the one handed over was lost. */
  runSeed: () => call('/run/seed', tagged<RunSeedResponse>('runSeed')),
  submitRun: (run: SubmitRunRequest) =>
    call('/run', tagged<SubmitRunResponse>('run'), run),
  reviveRun: (req: ReviveRunRequest) => call('/run/revive', isProfile, req),
  buyPack: (packId: string) => call('/shop/pack', isProfile, { packId }),
  applyHeart: (req: ApplyHeartRequest) => call('/hearts/apply', isProfile, req),
  upgradeGear: (req: UpgradeGearRequest) =>
    call('/gear/upgrade', isProfile, req),
  salvageGear: (req: SalvageGearRequest) =>
    call('/gear/salvage', isProfile, req),
  buyCoins: (bundleId: string) => call('/shop/coins', isProfile, { bundleId }),
  openPack: (packId: string, heroClass: HeroClass) =>
    call('/shop/open', tagged<OpenPackResponse>('openPack'), {
      packId,
      heroClass,
    }),
  collectPack: (req: CollectPackRequest) =>
    call('/shop/collect', isProfile, req),
  duelStart: () =>
    call('/duel/start', tagged<DuelStartResponse>('duelStart'), {}),
  duelResult: (req: DuelResultRequest) => call('/duel/result', isProfile, req),
  saveDuelLoadout: (req: SaveDuelLoadoutRequest) =>
    call('/duel/loadout', isProfile, req),
  setDuelListed: (listed: boolean) =>
    call('/duel/listed', isProfile, { listed }),
  duelOpponents: () =>
    call('/duel/opponents', tagged<DuelOpponentsResponse>('opponents')),
  duelRefresh: () =>
    call('/duel/refresh', tagged<DuelRefreshResponse>('refresh'), {}),
  duelChallenge: () =>
    call('/duel/challenge', tagged<DuelChallengeResponse>('challenge'), {}),
  /** What this post's inline view should draw. Used by the splash only. */
  challengeCard: () =>
    call('/challenge', tagged<ChallengeResponse>('challengeCard')),
  quests: () => call('/quests', tagged<QuestsResponse>('quests')),
  claimQuest: (questId: string) =>
    call('/quests/claim', tagged<ClaimQuestResponse>('questClaim'), {
      questId,
    }),
  claimStreak: () =>
    call('/streak/claim', tagged<StreakClaimResponse>('streakClaim'), {}),
  ftueSeen: (which: 'run' | 'fight' | 'duel' | 'duelSetup') =>
    call('/ftue/seen', isProfile, { which }),
  prizeSeen: () => call('/duel/prize/seen', isProfile, {}),
  equipFlair: (flairId: string | null) =>
    call('/flair/equip', isProfile, { flairId }),
  equipSkin: (skinId: string) => call('/skin/equip', isProfile, { skinId }),
  buySkin: (skinId: string) => call('/skin/buy', isProfile, { skinId }),
  warChest: () => call('/warchest', tagged<WarChestResponse>('warChest')),
  donate: (amount: number) =>
    call('/warchest/donate', tagged<DonateResponse>('warChestDonate'), {
      amount,
    }),
};

/** The moderator panel. The server refuses every one of these for anyone else. */
export const adminApi = {
  dashboard: () =>
    call('/admin/dashboard', tagged<AdminDashboardResponse>('adminDashboard')),
  export: () =>
    call('/admin/export', tagged<AdminExportResponse>('adminExport')),
  users: (offset: number) =>
    call(
      '/admin/users?offset=' + offset,
      tagged<AdminUsersResponse>('adminUsers')
    ),
  search: (q: string) =>
    call(
      '/admin/users/search?q=' + encodeURIComponent(q),
      tagged<AdminUsersResponse>('adminUsers')
    ),
  user: (userId: string) =>
    call(
      '/admin/user/' + encodeURIComponent(userId),
      tagged<AdminUserResponse>('adminUser')
    ),
  gift: (userId: string, req: AdminGiftRequest) =>
    call(
      '/admin/user/' + encodeURIComponent(userId) + '/gift',
      tagged<AdminActionResponse>('adminAction'),
      req
    ),
  reset: (userId: string) =>
    call(
      '/admin/user/' + encodeURIComponent(userId) + '/reset',
      tagged<AdminActionResponse>('adminAction'),
      {}
    ),
  resetMe: () =>
    call('/admin/me/reset', tagged<AdminActionResponse>('adminAction'), {}),
};

export { ApiError };
