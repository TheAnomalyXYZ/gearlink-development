/**
 * The leaderboard sheet, its floating button and the weekly prize notice, as
 * plain data for `Leaderboard.tsx`. Kept out of buildView so the ladder's
 * wording and numbers can be read (and tested) on their own.
 */
import type { GearLinkApp } from '../GearLinkApp.js';
import type { AppState, BoardTab } from '../state/appState.js';
import type {
  LeaderboardEntry,
  SoloBoard,
  SoloEntry,
} from '../../shared/api.js';
import {
  COIN_ICON,
  GEM_ICON,
  HERO_PERKS,
  SOLO_MIN_RUNS,
  SOLO_TIERS,
  packById,
  rewardLabel,
  soloTierById,
  soloTierFor,
  weeklyFlairFor,
} from '../../shared/engine/index.js';
import type {
  HeroClass,
  QuestReward,
  SoloTier,
} from '../../shared/engine/index.js';

export type LbRow = {
  key: string;
  rank: number;
  rankLabel: string;
  username: string;
  sub: string;
  value: string;
  unit: string;
  avatar: string;
  isYou: boolean;
  /** The title this standing earns (or earned), if any. */
  tierName: string;
  tierColor: string;
};

export type LbReward = { label: string; icon: string };

export type LbTierCard = {
  id: string;
  ranks: string;
  name: string;
  color: string;
  flairText: string;
  flairBg: string;
  rewards: LbReward[];
  note: string;
  /** The viewer holds this one right now. */
  held: boolean;
};

export type LbView = {
  lbOpen: boolean;
  lbTab: BoardTab;
  lbTabs: { id: string; label: string; active: boolean; run: () => void }[];
  lbSub: string;
  lbPlayers: string;
  /** Seats in display order: second, first, third. Null for an empty seat. */
  lbPodium: (LbRow | null)[];
  lbRows: LbRow[];
  lbEmpty: string;
  lbLoading: boolean;
  lbYou: LbRow | null;
  lbYouNote: string;
  lbTiers: LbTierCard[];
  lbRules: string[];
  lbTitleHeld: string;
  closeBoard: () => void;

  fabShow: boolean;
  fabRank: string;
  fabGlow: boolean;
  fabTitleColor: string;
  /** Tucks off to the right while a map location is focused, like the nav. */
  fabT: string;
  openBoard: () => void;

  soloPrizeShow: boolean;
  soloPrizeTier: string;
  soloPrizeColor: string;
  soloPrizeRank: string;
  soloPrizeRewards: LbReward[];
  soloPrizeFlair: string;
  soloPrizeFlairBg: string;
  soloPrizeCanWear: boolean;
  dismissSoloPrize: () => void;
  wearSoloTitle: () => void;
};

const fmt = (n: number) => n.toLocaleString('en-US');

const avatarOf = (hero: string): string =>
  (HERO_PERKS[hero as HeroClass] ?? HERO_PERKS.Hero).img;

export const rewardIcon = (r: QuestReward): string =>
  r.kind === 'coins'
    ? COIN_ICON
    : r.kind === 'gems'
      ? GEM_ICON
      : (packById(r.packId)?.img ?? '');

const rewardsOf = (rs: QuestReward[]): LbReward[] =>
  rs.map((r) => ({ label: rewardLabel(r), icon: rewardIcon(r) }));

/** "3D 4H" above a day, "4H 12M" below one. */
export const timeLeft = (ms: number): string => {
  const left = Math.max(0, ms);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return d > 0 ? d + 'D ' + h + 'H' : h + 'H ' + m + 'M';
};

const soloRow = (e: SoloEntry, players: number, final: boolean): LbRow => {
  const tier = final ? soloTierFor(e.rank, players, e.runs) : null;
  return {
    key: 's' + e.rank + e.username,
    rank: e.rank,
    rankLabel: e.rank > 0 ? '#' + e.rank : '-',
    username: e.username,
    sub:
      e.hero +
      ' / ' +
      e.runs +
      (e.runs === 1 ? ' battle' : ' battles') +
      ' / link ' +
      e.chain,
    value: fmt(e.points),
    unit: 'PTS',
    avatar: avatarOf(e.hero),
    isYou: e.isYou,
    tierName: tier?.name ?? '',
    tierColor: tier?.color ?? '',
  };
};

const dailyRow = (e: LeaderboardEntry): LbRow => ({
  key: 'd' + e.rank + e.username,
  rank: e.rank,
  rankLabel: '#' + e.rank,
  username: e.username,
  sub: e.hero + ' / ' + e.waves + ' waves / link ' + e.chain,
  value: fmt(e.score),
  unit: 'SCORE',
  avatar: avatarOf(e.hero),
  isYou: e.isYou,
  tierName: '',
  tierColor: '',
});

/** What the viewer needs to do next on this week's board. */
const youNote = (board: SoloBoard): string => {
  const you = board.you;
  if (!you) return 'Fight battles anywhere on the map to get on the board.';
  if (you.runs < SOLO_MIN_RUNS) {
    const n = SOLO_MIN_RUNS - you.runs;
    return (
      n +
      ' more ' +
      (n === 1 ? 'battle' : 'battles') +
      ' to qualify for a title.'
    );
  }
  if (you.rank === 1) return 'You hold the crown. Defend it until the reset.';
  const above = board.entries.find((e) => e.rank === you.rank - 1);
  const live = soloTierFor(you.rank, board.players, you.runs);
  const gap = above ? above.points - you.points + 1 : 0;
  if (live)
    return (
      'On course for ' +
      live.name +
      '.' +
      (above ? ' ' + fmt(gap) + ' pts to pass #' + above.rank + '.' : '')
    );
  return above
    ? fmt(gap) +
        ' pts to pass #' +
        above.rank +
        '. Beat a location best to climb.'
    : 'Beat a location best to climb.';
};

const tierCard = (t: SoloTier, heldTier: string | null): LbTierCard => {
  const flair = weeklyFlairFor(t.id);
  return {
    id: t.id,
    ranks: t.maxRank === 1 ? '#1' : t.maxRank === 3 ? '#2-3' : '#4-10',
    name: t.name,
    color: t.color,
    flairText: flair?.text ?? '',
    flairBg: flair?.backgroundColor ?? t.color,
    rewards: rewardsOf(t.rewards),
    note: 'Needs ' + t.minPlayers + '+ players on the week',
    held: heldTier === t.id,
  };
};

export const leaderboardView = (st: AppState, app: GearLinkApp): LbView => {
  const tab: BoardTab =
    st.boardTab === 'today' && !st.daily ? 'week' : st.boardTab;
  const current = st.soloBoards?.current ?? st.solo;
  const last = st.soloBoards?.last ?? null;
  const now = Date.now();
  const title = st.profile.soloTitle;
  const titleTier = title ? soloTierById(title.tier) : null;

  let sub = '';
  let players = '';
  let rows: LbRow[] = [];
  let youRow: LbRow | null = null;
  let note = '';
  let empty = '';
  let loading = false;

  if (tab === 'week') {
    if (!current) loading = true;
    else {
      sub = 'RESETS IN ' + timeLeft(current.endsAt - now);
      players =
        fmt(current.players) + (current.players === 1 ? ' PLAYER' : ' PLAYERS');
      rows = current.entries.map((e) => soloRow(e, current.players, false));
      youRow = current.you
        ? soloRow(current.you, current.players, false)
        : null;
      note = youNote(current);
      empty = 'No one has scored this week yet. The first battle takes #1.';
    }
  } else if (tab === 'last') {
    if (!last) loading = true;
    else {
      sub = 'FINAL STANDINGS';
      players =
        fmt(last.players) + (last.players === 1 ? ' PLAYER' : ' PLAYERS');
      rows = last.entries.map((e) => soloRow(e, last.players, true));
      youRow = last.you ? soloRow(last.you, last.players, true) : null;
      note = titleTier
        ? 'You finished #' +
          title!.rank +
          ' and hold ' +
          titleTier.name +
          ' this week.'
        : youRow
          ? 'You finished ' + youRow.rankLabel + '.'
          : 'You did not play last week.';
      empty = 'Nobody played last week.';
    }
  } else if (tab === 'today') {
    sub = st.daily ? 'DAILY BATTLE #' + st.daily.day : '';
    rows = st.leaderboard.map(dailyRow);
    youRow = rows.find((r) => r.isYou) ?? null;
    players = '';
    note = youRow
      ? "Today's ladder counts your best run on this post."
      : "Fight today's battle to post a score.";
    empty = "No one has fought today's battle yet.";
  } else {
    sub = 'TITLES ARE WORN FOR ONE WEEK';
  }

  const top = rows.filter((r) => r.rank >= 1 && r.rank <= 3);
  const seat = (rank: number) => top.find((r) => r.rank === rank) ?? null;
  const listed = rows.filter((r) => r.rank > 3);
  // Your row pins to the foot only when it would not already be on screen.
  const showYou =
    !!youRow && !rows.some((r) => r.isYou && r.rank === youRow!.rank);

  const tabs: { id: BoardTab; label: string }[] = [
    { id: 'week', label: 'WEEK' },
    { id: 'last', label: 'LAST' },
    ...(st.daily ? [{ id: 'today' as const, label: 'TODAY' }] : []),
    { id: 'rewards', label: 'PRIZES' },
  ];

  const prize = st.profile.soloPrize;
  const prizeTier = prize ? soloTierById(prize.tier) : null;
  const prizeFlair = prize ? weeklyFlairFor(prize.tier) : null;
  const canWear =
    !!prizeFlair &&
    !!title &&
    title.tier === prize?.tier &&
    st.profile.flairs.includes(prizeFlair.id) &&
    st.profile.flair !== prizeFlair.id;

  const myRank = current?.you?.rank ?? 0;
  const liveTier =
    current?.you && myRank > 0
      ? soloTierFor(myRank, current.players, current.you.runs)
      : null;

  return {
    lbOpen: st.modal === 'board',
    lbTab: tab,
    lbTabs: tabs.map((t) => ({
      id: t.id,
      label: t.label,
      active: t.id === tab,
      run: app.setBoardTab(t.id),
    })),
    lbSub: sub,
    lbPlayers: players,
    lbPodium: [seat(2), seat(1), seat(3)],
    lbRows: listed,
    lbEmpty: !loading && tab !== 'rewards' && !rows.length ? empty : '',
    lbLoading: loading,
    lbYou: tab === 'rewards' ? null : showYou ? youRow : null,
    lbYouNote: tab === 'rewards' ? '' : note,
    lbTiers: SOLO_TIERS.map((t) => tierCard(t, title?.tier ?? null)),
    lbRules: [
      'Your weekly points are your best score at every location, added up.',
      'Deeper locations and higher ascensions score more. Replaying a fight only counts what it beats your best by.',
      'Play ' + SOLO_MIN_RUNS + '+ battles in the week to place for a title.',
      'Titles go to the top 10 at the Monday reset (00:00 UTC) and are worn for the week after. Defend yours to keep it.',
    ],
    lbTitleHeld: titleTier ? 'YOU HOLD ' + titleTier.name + ' THIS WEEK' : '',
    closeBoard: app.closeModal,

    fabShow: st.ready && st.phase === 'home' && !st.modal,
    fabRank: myRank > 0 ? '#' + myRank : '',
    fabGlow: !!titleTier || !!liveTier,
    fabTitleColor: titleTier?.color ?? liveTier?.color ?? '#FCE370',
    fabT: st.wmFocused ? 'translate3d(180%,0,0)' : 'translate3d(0,0,0)',
    openBoard: app.openBoard,

    soloPrizeShow:
      !!prize &&
      !!prizeTier &&
      st.ready &&
      !st.profile.duelPrize &&
      st.phase !== 'duel' &&
      st.phase !== 'battle',
    soloPrizeTier: prizeTier?.name ?? '',
    soloPrizeColor: prizeTier?.color ?? '#FCE370',
    soloPrizeRank: prize ? '#' + prize.rank : '',
    soloPrizeRewards: prize ? rewardsOf(prize.rewards) : [],
    soloPrizeFlair:
      prizeFlair && title?.tier === prize?.tier ? prizeFlair.text : '',
    soloPrizeFlairBg: prizeFlair?.backgroundColor ?? '#FCE370',
    soloPrizeCanWear: canWear,
    dismissSoloPrize: app.dismissSoloPrize,
    wearSoloTitle: app.wearSoloTitle,
  };
};
