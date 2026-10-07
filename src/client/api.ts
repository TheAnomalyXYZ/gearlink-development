/**
 * Thin typed wrapper over the app's own endpoints.
 *
 * Every call that changes anything returns the profile the SERVER now holds, so
 * the client never has to guess what a purchase or a run did to the wallet - it
 * adopts what came back.
 */
import type {
  ApplyHeartRequest,
  ChallengeResponse,
  ClaimQuestResponse,
  CollectPackRequest,
  DonateResponse,
  DuelChallengeResponse,
  DuelOpponentsResponse,
  DuelResultRequest,
  SaveDuelLoadoutRequest,
  InitResponse,
  LeaderboardResponse,
  OpenPackResponse,
  ProfileResponse,
  QuestsResponse,
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

class ApiError extends Error {}

const call = async <T>(path: string, body?: unknown): Promise<T> => {
  const init: RequestInit =
    body === undefined
      ? { method: 'GET' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        };
  const res = await fetch('/api' + path, init);
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && 'message' in json
        ? String((json as { message: unknown }).message)
        : 'Request failed (' + res.status + ')';
    throw new ApiError(msg);
  }
  return json as T;
};

export const api = {
  init: () => call<InitResponse>('/init'),
  /** Re-read the wallet after a purchase Reddit fulfilled out of band. */
  profile: () => call<InitResponse>('/init'),
  leaderboard: () => call<LeaderboardResponse>('/leaderboard'),
  submitRun: (run: SubmitRunRequest) => call<SubmitRunResponse>('/run', run),
  buyPack: (packId: string) => call<ProfileResponse>('/shop/pack', { packId }),
  applyHeart: (req: ApplyHeartRequest) =>
    call<ProfileResponse>('/hearts/apply', req),
  buyCoins: (bundleId: string) =>
    call<ProfileResponse>('/shop/coins', { bundleId }),
  openPack: (packId: string) =>
    call<OpenPackResponse>('/shop/open', { packId }),
  collectPack: (req: CollectPackRequest) =>
    call<ProfileResponse>('/shop/collect', req),
  duelResult: (req: DuelResultRequest) =>
    call<ProfileResponse>('/duel/result', req),
  saveDuelLoadout: (req: SaveDuelLoadoutRequest) =>
    call<ProfileResponse>('/duel/loadout', req),
  setDuelListed: (listed: boolean) =>
    call<ProfileResponse>('/duel/listed', { listed }),
  duelOpponents: (cursor: number) =>
    call<DuelOpponentsResponse>('/duel/opponents?cursor=' + cursor),
  duelChallenge: () => call<DuelChallengeResponse>('/duel/challenge', {}),
  /** What this post's inline view should draw. Used by the splash only. */
  challengeCard: () => call<ChallengeResponse>('/challenge'),
  quests: () => call<QuestsResponse>('/quests'),
  claimQuest: (questId: string) =>
    call<ClaimQuestResponse>('/quests/claim', { questId }),
  ftueSeen: (which: 'run' | 'duel' | 'duelSetup') =>
    call<ProfileResponse>('/ftue/seen', { which }),
  prizeSeen: () => call<ProfileResponse>('/duel/prize/seen', {}),
  equipFlair: (flairId: string | null) =>
    call<ProfileResponse>('/flair/equip', { flairId }),
  warChest: () => call<WarChestResponse>('/warchest'),
  donate: (amount: number) =>
    call<DonateResponse>('/warchest/donate', { amount }),
};

/** The moderator panel. The server refuses every one of these for anyone else. */
export const adminApi = {
  dashboard: () => call<AdminDashboardResponse>('/admin/dashboard'),
  export: () => call<AdminExportResponse>('/admin/export'),
  users: (offset: number) =>
    call<AdminUsersResponse>('/admin/users?offset=' + offset),
  search: (q: string) =>
    call<AdminUsersResponse>('/admin/users/search?q=' + encodeURIComponent(q)),
  user: (userId: string) =>
    call<AdminUserResponse>('/admin/user/' + encodeURIComponent(userId)),
  gift: (userId: string, req: AdminGiftRequest) =>
    call<AdminActionResponse>(
      '/admin/user/' + encodeURIComponent(userId) + '/gift',
      req
    ),
  reset: (userId: string) =>
    call<AdminActionResponse>(
      '/admin/user/' + encodeURIComponent(userId) + '/reset',
      {}
    ),
};

export { ApiError };
