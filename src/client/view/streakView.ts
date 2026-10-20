/**
 * The daily login reward calendar and its strip on the quests screen, as plain
 * data for `DailyStreak.tsx`. The rules are the server's (see
 * `shared/engine/streak.ts`); this only words what it sent.
 */
import type { GearLinkApp } from '../GearLinkApp.js';
import type { AppState } from '../state/appState.js';
import { rewardLabel } from '../../shared/engine/index.js';
import type {
  QuestReward,
  StreakSlotState,
} from '../../shared/engine/index.js';
import { rewardIcon, timeLeft } from './leaderboardView.js';
import type { LbReward } from './leaderboardView.js';

export type StreakSlotUi = {
  key: number;
  label: string;
  rewards: LbReward[];
  state: StreakSlotState;
  big: boolean;
  /** Just claimed: the stamp lands with a pop. */
  pop: boolean;
};

export type StreakUi = {
  /** The streak has loaded - the quests strip waits on it. */
  ready: boolean;
  show: boolean;
  count: number;
  countLabel: string;
  bestLabel: string;
  /** One per shield slot, filled for each held. */
  shields: boolean[];
  claimable: boolean;
  claiming: boolean;
  /** One line under the count: what today's claim does, or when the next is. */
  note: string;
  noteColor: string;
  slots: StreakSlotUi[];
  milestoneLabel: string;
  milestoneRewards: LbReward[];
  claimLabel: string;
  /** The strip's short status on the quests screen. */
  stripLabel: string;
  open: () => void;
  close: () => void;
  claim: () => void;
};

const chips = (rs: QuestReward[]): LbReward[] =>
  rs.map((r) => ({ label: rewardLabel(r), icon: rewardIcon(r) }));

export const streakUi = (st: AppState, app: GearLinkApp): StreakUi => {
  const s = st.streak;
  const base = {
    open: app.openStreak,
    close: app.closeStreak,
    claim: app.claimStreak,
  };
  if (!s)
    return {
      ...base,
      ready: false,
      show: false,
      count: 0,
      countLabel: '',
      bestLabel: '',
      shields: [],
      claimable: false,
      claiming: false,
      note: '',
      noteColor: '#CBD9EC',
      slots: [],
      milestoneLabel: '',
      milestoneRewards: [],
      claimLabel: '',
      stripLabel: '',
    };

  const nextIn = timeLeft(s.resetAt - Date.now());
  const note = s.claimable
    ? s.broken
      ? 'Your streak ran out. Claim today to start a new one.'
      : s.shieldsUsing > 0
        ? (s.shieldsUsing === 1 ? 'A shield' : s.shieldsUsing + ' shields') +
          ' will save your streak. Claim to keep it going!'
        : s.count > 0
          ? 'Claim today to keep your streak alive.'
          : 'Come back every day for bigger rewards.'
    : 'Next reward in ' + nextIn + '. Miss a day and the streak resets.';
  const noteColor =
    s.claimable && (s.broken || s.shieldsUsing > 0)
      ? '#FF9EA1'
      : s.claimable
        ? '#AEE45D'
        : '#CBD9EC';

  return {
    ...base,
    ready: true,
    // Never over a battle or a duel: the calendar is a home-screen moment.
    show:
      st.streakOpen && st.ready && st.phase !== 'battle' && st.phase !== 'duel',
    count: s.count,
    countLabel: 'DAY STREAK',
    bestLabel: 'BEST ' + Math.max(s.best, s.count),
    shields: Array.from({ length: s.maxShields }, (_, i) => i < s.shields),
    claimable: s.claimable,
    claiming: st.streakClaiming,
    note,
    noteColor,
    slots: s.slots.map((x) => ({
      key: x.day,
      label: 'DAY ' + x.day,
      rewards: chips(x.rewards),
      state: x.state,
      big: x.big,
      pop: st.streakJustClaimed === x.day,
    })),
    milestoneLabel: s.nextMilestone
      ? 'DAY ' + s.nextMilestone.at + ' BONUS'
      : '',
    milestoneRewards: s.nextMilestone ? chips(s.nextMilestone.rewards) : [],
    claimLabel: st.streakClaiming
      ? 'CLAIMING...'
      : s.claimable
        ? 'CLAIM'
        : 'SEE YOU TOMORROW',
    stripLabel: s.claimable ? 'REWARD READY!' : 'NEXT IN ' + nextIn,
  };
};
