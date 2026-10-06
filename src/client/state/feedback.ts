/**
 * Pure builders for what a move SAYS: the link preview, the damage floats, the
 * duel log line. None of these touch state, so they can be read and tested
 * without the component that plays them.
 */
import {
  EFFECT_LABEL,
  chainMultX100,
  MIN_LINK,
  RIDERS,
  SUPER_MIN_LINK,
  isSuper,
  junkFor,
  magnitudeFor,
  markMultX100,
  orbTypeOf,
  riderOf,
} from '../../shared/engine/index.js';
import type {
  DuelStepResult,
  Gear,
  HeroPerk,
  Mutators,
  Status,
  StepResult,
} from '../../shared/engine/index.js';
import type { Pop } from './appState.js';

export const COLOR = {
  attack: '#E75757',
  block: '#4F92F0',
  heal: '#3FAF6E',
  damage: '#F08686',
  blockGain: '#89BCFF',
  healGain: '#C5F47D',
  hurt: '#FF9EA1',
  super: '#FFC24B',
  linking: '#9DB4D4',
} as const;

export type Preview = {
  text: string;
  color: string;
  /** Chain maths for the combo chips: power x mult = val. Only on a full link. */
  power?: number;
  mult?: number;
  val?: number;
  effect?: string;
  label?: string;
  extra?: string;
  bomb?: boolean;
};

const effectColor = (effect: string): string =>
  effect === 'attack'
    ? COLOR.attack
    : effect === 'block'
      ? COLOR.block
      : COLOR.heal;

/** What this link will land, buffs and Mark included - the number the player
 *  is about to commit to, not the raw payout. */
export const linkPreview = (p: {
  chain: number[];
  board: number[];
  loadout: Gear[];
  perk: HeroPerk;
  /** The linker's own status. */
  sx: Status;
  /** The status of whoever the attack lands on. */
  foeSx: Status;
  duelling: boolean;
  mutators: Mutators;
}): Preview | null => {
  const { chain, board, sx, foeSx } = p;
  const head = board[chain[0]!]!;
  if (chain.length === 1 && isSuper(head))
    return { text: 'RELEASE TO DETONATE', color: COLOR.super };
  const orb = p.loadout[orbTypeOf(head)];
  if (!orb) return null;
  if (chain.length < MIN_LINK)
    return {
      text: 'LINK ' + chain.length + ' / ' + MIN_LINK,
      color: COLOR.linking,
    };
  const raw = magnitudeFor(orb.power, chain.length, p.mutators);
  const x =
    orb.effect === 'attack'
      ? p.perk.attackX100
      : orb.effect === 'block'
        ? p.perk.blockX100
        : p.perk.healX100;
  let val = Math.max(1, Math.floor((raw * x) / 100));
  if (orb.effect === 'attack' && sx.strength > 0) val += sx.strength;
  if (orb.effect === 'block' && sx.grit > 0) val += sx.grit;
  let mark = '';
  if (orb.effect === 'attack' && foeSx.mark > 0) {
    val = Math.ceil((val * markMultX100(foeSx.mark)) / 100);
    mark = ' MARKED';
  }
  const bomb = chain.length >= SUPER_MIN_LINK ? '  +BOMB' : '';
  const rd = riderOf(orb.id);
  let rider = '';
  if (rd) {
    const R = RIDERS[rd.r]!;
    rider =
      chain.length >= rd.at
        ? '  +' + R.label + ' ' + rd.v
        : '  ' + R.label + ' in ' + (rd.at - chain.length);
  }
  // Junk is the duel's whole second axis, so the preview must price it.
  let junk = '';
  if (p.duelling) {
    const n = sx.frost > 0 ? 0 : junkFor(chain.length);
    junk =
      n > 0
        ? '  +' + n + ' JUNK'
        : chain.length < 5
          ? '  JUNK in ' + (5 - chain.length)
          : '';
  }
  return {
    text:
      EFFECT_LABEL[orb.effect] +
      ' ' +
      val +
      '  from ' +
      chain.length +
      ' orbs' +
      mark +
      bomb +
      rider +
      junk,
    color: effectColor(orb.effect),
    power: orb.power,
    mult: chainMultX100(chain.length, p.mutators),
    val,
    effect: orb.effect,
    label:
      orb.effect === 'attack' ? 'DAMAGE' : (EFFECT_LABEL[orb.effect] ?? ''),
    extra: (mark + rider + junk).replace(/\s+/g, ' ').trim(),
    bomb: !!bomb,
  };
};

/** Floats for the player's side of a campaign turn. */
export const runPops = (out: StepResult): Pop[] => {
  const pops: Pop[] = [];
  if (out.attackDealt > 0)
    pops.push({ text: '-' + out.attackDealt, color: COLOR.damage, top: '4%' });
  if (out.burnDealt > 0)
    pops.push({
      text: '-' + out.burnDealt,
      color: RIDERS['burn']!.color,
      top: '16%',
    });
  if (out.blockGained > 0)
    pops.push({
      text: '+' + out.blockGained,
      color: COLOR.blockGain,
      top: '30%',
    });
  if (out.healed > 0)
    pops.push({ text: '+' + out.healed, color: COLOR.healGain, top: '30%' });
  return pops;
};

/** The float for the monster's swing landing. */
export const swingPop = (damage: number): Pop =>
  damage > 0
    ? { text: '-' + damage, color: COLOR.hurt, top: '58%' }
    : { text: 'BLOCKED', color: COLOR.blockGain, top: '58%' };

/** Floats sit over whoever they happened TO: damage over the struck side,
 *  block and heal over the side that gained them. */
export const duelPops = (
  out: DuelStepResult,
  side: 'me' | 'foe'
): { mine: Pop[]; theirs: Pop[] } => {
  const mine: Pop[] = [];
  const theirs: Pop[] = [];
  const struck = side === 'me' ? theirs : mine;
  const gained = side === 'me' ? mine : theirs;
  if (out.attack > 0)
    struck.push({ text: '-' + out.attack, color: COLOR.damage, top: '10%' });
  if (out.burnDealt > 0)
    struck.push({
      text: '-' + out.burnDealt,
      color: RIDERS['burn']!.color,
      top: '26%',
    });
  if (out.blockGain > 0)
    gained.push({
      text: '+' + out.blockGain,
      color: COLOR.blockGain,
      top: '38%',
    });
  if (out.heal > 0)
    gained.push({ text: '+' + out.heal, color: COLOR.healGain, top: '38%' });
  return { mine, theirs };
};

/** One line for the duel log: who did what, and the junk it sent. */
export const duelLogLine = (
  out: Pick<DuelStepResult, 'attack' | 'blockGain' | 'heal' | 'junkSend'>,
  who: string
): string => {
  const what =
    out.attack > 0
      ? ' hit for ' + out.attack
      : out.blockGain > 0
        ? ' raised ' + out.blockGain + ' block'
        : out.heal > 0
          ? ' healed ' + out.heal
          : ' cleared';
  return (
    who + what + (out.junkSend > 0 ? ', sent ' + out.junkSend + ' junk' : '')
  );
};

/** The foe's announcement while its link is drawn. */
export const foeAnnouncement = (out: DuelStepResult, name: string): string => {
  if (out.chainLen < MIN_LINK) return name + ' detonates a bomb';
  const orb = out.chainOrb;
  return (
    name +
    ' links ' +
    out.chainLen +
    (orb ? ' ' + EFFECT_LABEL[orb.effect] : '') +
    (out.junkSend > 0 ? ' - ' + out.junkSend + ' junk incoming' : '')
  );
};
