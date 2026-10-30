/** Pack-opening helpers: turning the server's pulls into cards, and naming
 *  what an open was worth. */
import { GEAR_BY_ID, RARITY_ORDER } from '../../shared/engine/index.js';
import type { PulledCard } from '../../shared/engine/economy.js';
import type { OpenCard, OpenState } from './appState.js';

/** Pulls the client has no gear entry for are dropped rather than drawn blank. */
export const toOpenCards = (pulls: PulledCard[]): OpenCard[] => {
  const cards: OpenCard[] = [];
  for (const c of pulls) {
    const gear = GEAR_BY_ID[c.id];
    if (gear)
      cards.push({
        gear,
        isNew: c.isNew,
        owned: c.owned,
        // A held open from before tiers carries none: it was Bronze.
        tier: c.tier ?? 'Bronze',
        promoted: !!c.promoted,
      });
  }
  return cards;
};

/** One line naming what the open was worth. */
export const packSummary = (op: OpenState): string => {
  if (op.cards.length === 1) {
    const c = op.cards[0]!;
    const tier = c.tier === 'Bronze' ? '' : c.tier + ' ';
    return c.isNew
      ? 'New ' + tier + 'gear - ' + c.gear.rarity
      : c.promoted
        ? 'Promoted to ' + c.tier + ' - now x' + c.owned
        : 'Duplicate - now x' + c.owned + ', spare copies level it up';
  }
  const nw = op.cards.filter((c) => c.isNew).length;
  const dupes = op.cards.length - nw;
  let best: OpenCard | undefined;
  for (const c of op.cards)
    if (
      !best ||
      RARITY_ORDER.indexOf(c.gear.rarity) >
        RARITY_ORDER.indexOf(best.gear.rarity)
    )
      best = c;
  const parts = [
    nw > 0 ? nw + (nw === 1 ? ' new piece' : ' new pieces') : 'No new gear',
  ];
  if (dupes > 0)
    parts.push(
      dupes + (dupes === 1 ? ' duplicate' : ' duplicates') + ' stacked'
    );
  const promoted = op.cards.filter((c) => c.promoted).length;
  if (promoted > 0) parts.push(promoted + ' promoted to ' + op.cards[0]!.tier);
  if (best) parts.push('best: ' + best.gear.rarity);
  return parts.join('  -  ');
};
