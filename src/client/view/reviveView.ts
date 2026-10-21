/**
 * The CONTINUE offer after a death, as plain data for `ReviveOffer.tsx`. The
 * prices and the cap are the engine's (see `shared/engine/revive.ts`).
 */
import type { GearLinkApp } from '../GearLinkApp.js';
import type { AppState } from '../state/appState.js';
import { COIN_ICON, REVIVE_COSTS } from '../../shared/engine/index.js';

export type ReviveUi = {
  show: boolean;
  costLabel: string;
  coinIcon: string;
  /** "1 OF 3 LEFT" and the like. */
  leftLabel: string;
  balanceLabel: string;
  affordable: boolean;
  paying: boolean;
  accept: () => void;
  decline: () => void;
};

export const reviveUi = (st: AppState, app: GearLinkApp): ReviveUi => {
  const r = st.revive;
  const coins = st.profile.coins;
  return {
    show: !!r && st.phase === 'battle',
    costLabel: r ? String(r.cost) : '',
    coinIcon: COIN_ICON,
    leftLabel: r
      ? REVIVE_COSTS.length - r.used + ' OF ' + REVIVE_COSTS.length + ' LEFT'
      : '',
    balanceLabel: 'YOU HAVE ' + coins,
    affordable: !!r && coins >= r.cost,
    paying: !!r?.paying,
    accept: () => void app.acceptRevive(),
    decline: app.declineRevive,
  };
};
