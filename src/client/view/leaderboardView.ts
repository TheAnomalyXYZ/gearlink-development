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
  SoloGroupBoard,
} from '../../shared/api.js';
import {
  COIN_ICON,
  DIVISIONS,
  GEM_ICON,
  GROUP_BANDS,
  GROUP_SIZE,
  HERO_PERKS,
  SOLO_FINAL_MS,
  SOLO_MIN_RUNS,
  SOLO_TIERS,
  TOP_DIVISION,
  bandRewards,
  divisionAt,
  divisionIndex,
  groupBandById,
  nextGroupBand,
  packById,
  rewardLabel,
  soloTierById,
  soloTierFor,
  weeklyFlairFor,
} from '../../shared/engine/index.js';
import type {
  GroupBand,
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
  /** In a group: moving up, or down, if the week ended now. */
  zone: 'up' | 'down' | '';
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

export type LbDivision = {
  id: string;
  name: string;
  color: string;
  /** Paid the first time it is reached. */
  bonus: LbReward[];
  current: boolean;
};

export type LbView = {
  lbOpen: boolean;
  lbTab: BoardTab;
  lbTabs: { id: string; label: string; active: boolean; run: () => void }[];
  lbSub: string;
  lbPlayers: string;
  /** The viewer's division, as a chip beside the title. */
  lbBadge: string;
  lbBadgeColor: string;
  /** On the group tab: the last rank that moves up and the first that drops,
   *  for the zone lines; 0 for none. */
  lbZoneUp: number;
  lbZoneDown: number;
  lbZoneUpLabel: string;
  lbZoneDownLabel: string;
  /** Seats in display order: second, first, third. Null for an empty seat. */
  lbPodium: (LbRow | null)[];
  lbRows: LbRow[];
  lbEmpty: string;
  lbLoading: boolean;
  lbYou: LbRow | null;
  lbYouNote: string;
  lbTiers: LbTierCard[];
  /** What a group finish pays in the viewer's division. */
  lbBands: LbTierCard[];
  lbDivs: LbDivision[];
  lbRules: string[];
  lbTitleHeld: string;
  closeBoard: () => void;

  /** "u/foo passed you" over the map, until it is tapped or dismissed. */
  alertShow: boolean;
  alertTitle: string;
  alertSub: string;
  openSoloAlert: () => void;
  dismissSoloAlert: () => void;

  fabShow: boolean;
  /** Someone passed the player since they last looked. */
  fabAlert: boolean;
  fabRank: string;
  fabGlow: boolean;
  fabTitleColor: string;
  /** Tucks off to the right while a map location is focused, like the nav. */
  fabT: string;
  openBoard: () => void;

  soloPrizeShow: boolean;
  soloPrizeTier: string;
  soloPrizeColor: string;
  /** "You finished #3 of 18 in your Silver group." */
  soloPrizeLine: string;
  /** "PROMOTED TO GOLD", and the colour of where it landed. */
  soloPrizeDiv: string;
  soloPrizeDivColor: string;
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
    zone: '',
  };
};

const groupRow = (e: SoloEntry, g: SoloGroupBoard): LbRow => ({
  ...soloRow(e, g.size, false),
  key: 'g' + e.rank + e.username,
  zone:
    e.rank < 1
      ? ''
      : e.rank <= g.promote
        ? 'up'
        : g.demote && e.rank >= g.demote
          ? 'down'
          : '',
});

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
  zone: '',
});

/** What the viewer needs to do next on this week's board. In the final hours
 *  it also says how close the player below is. */
const youNote = (board: SoloBoard, now: number): string => {
  const you = board.you;
  if (!you) return 'Fight battles anywhere on the map to get on the board.';
  if (you.runs < SOLO_MIN_RUNS) return moreBattles(you.runs, 'a title');
  const guard =
    board.endsAt - now < SOLO_FINAL_MS && board.below
      ? ' u/' +
        board.below.username +
        ' is ' +
        fmt(Math.max(0, you.points - board.below.points)) +
        ' pts behind you.'
      : '';
  if (you.rank === 1)
    return 'You hold the crown.' + (guard || ' Defend it until the reset.');
  const live = soloTierFor(you.rank, board.players, you.runs);
  const chase = board.chase;
  const chaseTier = chase ? soloTierById(chase.tier) : null;
  const up =
    chase && chaseTier && chase.rank < you.rank
      ? fmt(chase.points - you.points + 1) +
        ' pts to reach ' +
        chaseTier.name +
        '.'
      : board.above
        ? fmt(board.above.points - you.points + 1) +
          ' pts to pass #' +
          board.above.rank +
          '.'
        : 'Beat a location best to climb.';
  return (live ? 'On course for ' + live.name + '. ' : '') + up + guard;
};

const moreBattles = (runs: number, what: string): string => {
  const n = SOLO_MIN_RUNS - runs;
  return (
    n +
    ' more ' +
    (n === 1 ? 'battle' : 'battles') +
    ' to qualify for ' +
    what +
    '.'
  );
};

/** "u/foo is 120 pts behind you." - only in the week's final hours. */
const guardNote = (
  endsAt: number,
  now: number,
  you: SoloEntry,
  below: SoloEntry | null | undefined
): string =>
  endsAt - now < SOLO_FINAL_MS && below
    ? ' u/' +
      below.username +
      ' is ' +
      fmt(Math.max(0, you.points - below.points)) +
      ' pts behind you.'
    : '';

/** What the viewer needs to do next in their group: get into the promotion
 *  zone, stay there, or climb out of the drop zone. */
const groupNote = (g: SoloGroupBoard, now: number): string => {
  const you = g.you;
  const div = divisionIndex(g.div);
  const up = divisionAt(div + 1).name;
  if (!you) return 'Fight a battle to score in your group.';
  if (you.runs < SOLO_MIN_RUNS)
    return moreBattles(
      you.runs,
      'a prize' + (g.promote ? ' or promotion' : '')
    );
  if (you.rank < 1) return 'Beat a location best to score in your group.';
  const at = (rank: number) => g.entries.find((e) => e.rank === rank) ?? null;
  const gap = (rank: number) => {
    const e = at(rank);
    return e ? fmt(Math.max(0, e.points - you.points) + 1) : '';
  };
  const guard = guardNote(g.endsAt, now, you, at(you.rank + 1));
  if (g.promote && you.rank <= g.promote)
    return 'In the promotion zone. Hold it to reach ' + up + '.' + guard;
  if (g.demote && you.rank >= g.demote)
    return (
      'In the drop zone! ' + gap(g.demote - 1) + ' pts to climb out.' + guard
    );
  if (g.promote)
    return (
      gap(g.promote) + ' pts to reach the promotion zone (#' + g.promote + ').'
    );
  // Diamond has nowhere up: the chase is the group's own prizes.
  const next = nextGroupBand(you.rank, g.size, you.runs);
  return next
    ? gap(next.rank) + ' pts to reach ' + next.tier.name + '.' + guard
    : 'You lead the group. Hold it until the reset.' + guard;
};

/** "#1", "#2-3" for the titles; the share of the ladder for the bands. */
const tierRanks = (
  t: SoloTier | GroupBand,
  tiers: (SoloTier | GroupBand)[]
): string => {
  if (t.cut.kind === 'share')
    return t.cut.pct >= 1 ? 'ALL' : Math.round(t.cut.pct * 100) + '%';
  let from = 1;
  for (const p of tiers.slice(0, tiers.indexOf(t)))
    if (p.cut.kind === 'rank') from = p.cut.rank + 1;
  return from === t.cut.rank ? '#' + from : '#' + from + '-' + t.cut.rank;
};

const tierNote = (t: SoloTier | GroupBand, where: string): string =>
  t.cut.kind === 'share' && t.cut.pct >= 1
    ? 'Everyone in the group who plays ' + SOLO_MIN_RUNS + '+ battles'
    : 'Needs ' + t.minPlayers + '+ players in the ' + where;

const bandCard = (b: GroupBand, div: number): LbTierCard => ({
  id: b.id,
  ranks: tierRanks(b, GROUP_BANDS),
  name: b.name,
  color: b.color,
  flairText: '',
  flairBg: '',
  rewards: rewardsOf(bandRewards(b, div)),
  note: tierNote(b, 'group'),
  held: false,
});

const tierCard = (t: SoloTier, heldTier: string | null): LbTierCard => {
  const flair = weeklyFlairFor(t.id);
  return {
    id: t.id,
    ranks: tierRanks(t, SOLO_TIERS),
    name: t.name,
    color: t.color,
    flairText: flair?.text ?? '',
    flairBg: flair?.backgroundColor ?? t.color,
    rewards: rewardsOf(t.rewards),
    note: tierNote(t, 'subreddit'),
    held: heldTier === t.id,
  };
};

export const leaderboardView = (st: AppState, app: GearLinkApp): LbView => {
  const tab: BoardTab =
    st.boardTab === 'today' && !st.daily ? 'group' : st.boardTab;
  const current = st.soloBoards?.current ?? st.solo;
  const group = st.soloGroup;
  const myDiv = divisionIndex(group?.div ?? st.profile.soloDiv);
  const division = divisionAt(myDiv);
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
  let zoneUp = 0;
  let zoneDown = 0;

  if (tab === 'group') {
    const ends = group?.endsAt ?? current?.endsAt ?? 0;
    sub =
      (ends && ends - now < SOLO_FINAL_MS ? 'FINAL HOURS - ' : '') +
      (ends ? 'RESETS IN ' + timeLeft(ends - now) : '');
    if (!group) {
      empty =
        'Fight a battle anywhere on the map to join a ' +
        division.name +
        ' group of up to ' +
        GROUP_SIZE +
        ' players. The top of the group moves up a division each week.';
    } else {
      players =
        'GROUP ' +
        group.group +
        ' - ' +
        fmt(group.size) +
        (group.size === 1 ? ' PLAYER' : ' PLAYERS');
      rows = group.entries.map((e) => groupRow(e, group));
      youRow = group.you ? groupRow(group.you, group) : null;
      note = groupNote(group, now);
      zoneUp = group.promote;
      zoneDown = group.demote;
      empty = 'No one in your group has scored yet.';
    }
  } else if (tab === 'week') {
    if (!current) loading = true;
    else {
      sub =
        (current.endsAt - now < SOLO_FINAL_MS ? 'FINAL HOURS - ' : '') +
        'RESETS IN ' +
        timeLeft(current.endsAt - now);
      players =
        fmt(current.players) + (current.players === 1 ? ' PLAYER' : ' PLAYERS');
      rows = current.entries.map((e) => soloRow(e, current.players, false));
      youRow = current.you
        ? soloRow(current.you, current.players, false)
        : null;
      note = youNote(current, now);
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
    sub = 'PAID AT THE MONDAY RESET';
  }

  const top = rows.filter((r) => r.rank >= 1 && r.rank <= 3);
  const seat = (rank: number) => top.find((r) => r.rank === rank) ?? null;
  const listed = rows.filter((r) => r.rank > 3);
  // Your row pins to the foot only when it would not already be on screen.
  const showYou =
    !!youRow && !rows.some((r) => r.isYou && r.rank === youRow!.rank);

  const tabs: { id: BoardTab; label: string }[] = [
    { id: 'group', label: 'GROUP' },
    { id: 'week', label: 'ALL' },
    { id: 'last', label: 'LAST' },
    ...(st.daily ? [{ id: 'today' as const, label: 'TODAY' }] : []),
    { id: 'rewards', label: 'PRIZES' },
  ];

  const prize = st.profile.soloPrize;
  const prizeTier = prize?.tier ? soloTierById(prize.tier) : null;
  const prizeFlair = prize?.tier ? weeklyFlairFor(prize.tier) : null;
  const pg = prize?.group ?? null;
  const prizeBand = pg?.band ? groupBandById(pg.band) : null;
  const pgFrom = pg ? divisionAt(divisionIndex(pg.div)) : null;
  const pgTo = pg ? divisionAt(divisionIndex(pg.to)) : null;
  const prizeHead = prizeTier ?? prizeBand;
  const prizeLine = !prize
    ? ''
    : (pg && pgFrom && pg.rank < 1
        ? "You didn't score in your " + pgFrom.name + ' group'
        : pg && pgFrom
          ? 'You finished #' +
            pg.rank +
            ' of ' +
            pg.size +
            ' in your ' +
            pgFrom.name +
            ' group'
          : 'You finished #' + prize.rank) +
      (prizeTier && pg ? ', and #' + prize.rank + ' in the subreddit' : '') +
      ' last week.' +
      (prize.rewards.length ? ' Your prize is already in your bag.' : '');
  const prizeDiv =
    !pg || !pgTo
      ? ''
      : pg.outcome === 'promote'
        ? 'PROMOTED TO ' + pgTo.name
        : pg.outcome === 'demote'
          ? 'DROPPED TO ' + pgTo.name
          : 'STAYING IN ' + pgTo.name;
  const canWear =
    !!prizeFlair &&
    !!title &&
    title.tier === prize?.tier &&
    st.profile.flairs.includes(prizeFlair.id) &&
    st.profile.flair !== prizeFlair.id;

  // The button shows the group's rank once there is one: it is the race
  // that moves the player.
  const myRank = group?.you?.rank || current?.you?.rank || 0;
  const liveTitle =
    current?.you && current.you.rank > 0
      ? soloTierFor(current.you.rank, current.players, current.you.runs)
      : null;
  const promoting =
    !!group?.you &&
    group.you.rank > 0 &&
    group.you.rank <= group.promote &&
    group.you.runs >= SOLO_MIN_RUNS;

  const fabShow = st.ready && st.phase === 'home' && !st.modal;
  const prizeShow =
    !!prize &&
    !!(prizeHead || pg) &&
    st.ready &&
    !st.profile.duelPrize &&
    st.phase !== 'duel' &&
    st.phase !== 'battle';
  const alert = st.soloAlert;
  const alertTitle = alert
    ? alert.count === 1
      ? 'u/' + alert.passers[0] + ' passed you!'
      : 'u/' +
        alert.passers[0] +
        ' and ' +
        (alert.count - 1) +
        (alert.count === 2 ? ' other' : ' others') +
        ' passed you!'
    : '';
  const alertSub = !alert
    ? ''
    : alert.above && alert.rank !== null
      ? 'NOW #' +
        alert.rank +
        ' - ' +
        fmt(alert.above.gap) +
        ' PTS TO RETAKE #' +
        (alert.rank - 1)
      : alert.rank !== null
        ? 'NOW #' + alert.rank
        : 'TAP TO SEE THE BOARD';

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
    lbBadge: division.name,
    lbBadgeColor: division.color,
    lbZoneUp: zoneUp,
    lbZoneDown: zoneDown,
    lbZoneUpLabel:
      myDiv < TOP_DIVISION ? 'UP TO ' + divisionAt(myDiv + 1).name : '',
    lbZoneDownLabel: myDiv > 0 ? 'DOWN TO ' + divisionAt(myDiv - 1).name : '',
    lbPodium: [seat(2), seat(1), seat(3)],
    lbRows: listed,
    lbEmpty: !loading && tab !== 'rewards' && !rows.length ? empty : '',
    lbLoading: loading,
    lbYou: tab === 'rewards' ? null : showYou ? youRow : null,
    lbYouNote: tab === 'rewards' ? '' : note,
    lbTiers: SOLO_TIERS.map((t) => tierCard(t, title?.tier ?? null)),
    lbBands: GROUP_BANDS.map((b) => bandCard(b, myDiv)),
    lbDivs: DIVISIONS.map((d, i) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      bonus: rewardsOf(d.firstReach),
      current: i === myDiv,
    })),
    lbRules: [
      'Your weekly points are your best score at every location, added up.',
      'Deeper locations and higher ascensions score more. Replaying a fight only counts what it beats your best by.',
      'Your first battle of the week puts you in a group of up to ' +
        GROUP_SIZE +
        ' players from your division. Play ' +
        SOLO_MIN_RUNS +
        '+ battles to place.',
      'At the Monday reset (00:00 UTC) the top quarter of each group moves up a division and the bottom quarter moves down. Higher divisions pay more.',
      'Miss one week and you keep your division. Each week missed after that drops you one.',
      'The top 10 in the whole subreddit also take a title flair for the week after, plus its prize.',
      'If someone in your group passes you, you will hear about it the next time you open the game.',
    ],
    lbTitleHeld: titleTier ? 'YOU HOLD ' + titleTier.name + ' THIS WEEK' : '',
    closeBoard: app.closeModal,

    alertShow:
      !!alert &&
      fabShow &&
      !st.wmFocused &&
      !st.streakOpen &&
      !prizeShow &&
      !st.profile.duelPrize,
    alertTitle,
    alertSub,
    openSoloAlert: app.openSoloAlert,
    dismissSoloAlert: app.dismissSoloAlert,

    fabShow,
    fabAlert: !!alert,
    fabRank: myRank > 0 ? '#' + myRank : '',
    fabGlow: !!titleTier || !!liveTitle || promoting,
    fabTitleColor:
      titleTier?.color ??
      liveTitle?.color ??
      (promoting ? '#AEE45D' : '#FCE370'),
    fabT: st.wmFocused ? 'translate3d(180%,0,0)' : 'translate3d(0,0,0)',
    openBoard: app.openBoard,

    soloPrizeShow: prizeShow,
    soloPrizeTier:
      prizeHead?.name ??
      (pg?.outcome === 'promote'
        ? 'PROMOTED'
        : pg?.outcome === 'demote'
          ? 'DROPPED'
          : ''),
    soloPrizeColor: prizeHead?.color ?? pgTo?.color ?? '#FCE370',
    soloPrizeLine: prizeLine,
    soloPrizeDiv: prizeDiv,
    soloPrizeDivColor: pgTo?.color ?? '#FCE370',
    soloPrizeRewards: prize ? rewardsOf(prize.rewards) : [],
    soloPrizeFlair:
      prizeFlair && title?.tier === prize?.tier ? prizeFlair.text : '',
    soloPrizeFlairBg: prizeFlair?.backgroundColor ?? '#FCE370',
    soloPrizeCanWear: canWear,
    dismissSoloPrize: app.dismissSoloPrize,
    wearSoloTitle: app.wearSoloTitle,
  };
};
