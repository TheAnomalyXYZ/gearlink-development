/**
 * The core game screens as design-system templates.
 *
 * Every screen is the game's real `Screen`, drawn from `buildView` over the
 * same stand-in app the render test walks (`src/client/view/demoApp.ts`).
 * Nothing is redrawn here: each export only picks the screen and the state it
 * is shown in. Handlers are inert - these are for looking at, not playing -
 * except `setState`, which the view itself calls to re-render once crisp
 * icons and effects are ready; that state is kept here.
 *
 * `state` replaces any slice of the app state, for screens the named props
 * don't cover (a modal, a coaching step, another profile).
 */
import { useState } from 'react';
import { Screen } from '../../src/client/view/Screen.js';
import { buildView } from '../../src/client/view/buildView.js';
import { bs, demoApp, profile, rng, run } from '../../src/client/view/demoApp.js';
import {
  defaultLoadout,
  foeLoadout,
  makeDuelSide,
} from '../../src/shared/engine/index.js';

type State = Record<string, unknown>;

type Update = State | ((s: State) => State);

const Live = ({ over }: { over: State }) => {
  const [extra, setExtra] = useState<State>({});
  const app = demoApp({ ...over, ...extra });
  const live = Object.assign(app, {
    setState: (u: Update) =>
      setExtra((prev) => ({
        ...prev,
        ...(typeof u === 'function' ? u({ ...over, ...prev }) : u),
      })),
  });
  return <Screen v={buildView(live)} />;
};

const draw = (over: State) => <Live over={over} />;

/** Any screen by its `phase`, with any state. The named screens below are
 *  shortcuts over this. */
export const GameScreen = ({ phase, state }: { phase: string; state?: State }) =>
  draw({ phase, ...state });

/** The home screen: hero, world map entry and the bottom nav. */
export const HomeScreen = ({ state }: { state?: State }) =>
  draw({ phase: 'home', ...state });

/** Picking a hero for a run. */
export const HeroPickScreen = ({ state }: { state?: State }) =>
  draw({ phase: 'hero', ...state });

/** Choosing the five pieces of gear to take into a run. */
export const LoadoutScreen = ({ state }: { state?: State }) =>
  draw({ phase: 'gear', ...state });

/** A battle in progress: the enemy, the HUD and the gear board. */
export const BattleScreen = ({ state }: { state?: State }) =>
  draw({ phase: 'battle', bs, ...state });

/** A run that has been played: the end screen reads its tallies. */
const played = (won: boolean) => ({
  ...bs,
  wavesCleared: won ? 3 : 1,
  maxChain: won ? 9 : 6,
  turnsUsed: won ? 21 : 9,
  damageDealt: won ? 4210 : 1180,
});

/** The end of a run, won or lost. */
export const RunEndScreen = ({
  won = true,
  state,
}: {
  won?: boolean;
  state?: State;
}) =>
  draw({
    phase: 'end',
    bs: played(won),
    endReason: won ? 'won' : 'dead',
    runWon: won,
    ...state,
  });

/** The shop, on its packs, coins or gems tab. */
export const ShopScreen = ({
  tab = 'packs',
  state,
}: {
  tab?: 'packs' | 'coins' | 'gems';
  state?: State;
}) => draw({ phase: 'shop', shopTab: tab, ...state });

/** A sealed gear pack, waiting to be torn open. (The tear and the reveal are
 *  the game's own animation, driven by the live app.) */
export const PackOpenScreen = ({ state }: { state?: State }) =>
  draw({
    phase: 'opening',
    openPack: {
      id: 'base',
      token: 't',
      cards: [{ gear: run.loadout[0], isNew: true, refund: 0 }],
      shown: 0,
      torn: false,
      from: 'shop',
    },
    ...state,
  });

/** Daily and weekly quests. */
export const QuestsScreen = ({
  tab = 'daily',
  state,
}: {
  tab?: 'daily' | 'weekly';
  state?: State;
}) => draw({ phase: 'quests', questTab: tab, ...state });

/** The bag: unopened packs, or the gear collection. */
export const BagScreen = ({
  tab = 'packs',
  state,
}: {
  tab?: 'packs' | 'gear';
  state?: State;
}) => draw({ phase: 'inventory', invTab: tab, ...state });

/** The duel league lobby: opponents to pick from. */
export const DuelLobbyScreen = ({ state }: { state?: State }) =>
  draw({ phase: 'duelLobby', ...state });

const FOE = {
  kind: 'player',
  id: 't2_xyz',
  name: 'emberwright',
  cls: 'Mage',
  rating: 1240,
  skill: 0.94,
  blurb: 'Silver - duels as Mage',
  avatar: '',
  picked: [],
};

/** Before a duel: both fives side by side and the start button. */
export const DuelConfirmScreen = ({ state }: { state?: State }) =>
  draw({
    phase: 'duelConfirm',
    duelFoe: FOE,
    profile: { ...profile, duelCls: 'Hero', duelPicked: defaultLoadout('Hero') },
    ...state,
  });

const DUEL = {
  me: makeDuelSide('Hero', run.loadout, 1, rng),
  foe: makeDuelSide('Mage', foeLoadout('Mage', []), 0.9, rng),
};

/** A duel in progress, or over when `won` is given. */
export const DuelScreen = ({ won, state }: { won?: boolean; state?: State }) =>
  draw({
    phase: 'duel',
    duel: DUEL,
    duelFoe: FOE,
    ...(won === undefined
      ? {}
      : { duelOutcome: { kind: 'win', won, delta: won ? 22 : -18 } }),
    ...state,
  });
