/** Riders read off each card's OWN description in the library export, so a card
 *  does here what the same card does in the main game. Keyed by card id. */
import type { Rider } from './types.js';

export const RIDER_BY_ID: Record<string, Rider> = {
  'Hero-Hat-Common-Base': { r: 'strength', v: 3, at: 4 },
  'Hero-Hat-Epic-Base': { r: 'grit', v: 1, at: 5 },
  'Hero-Necklace-Common-Base': { r: 'strength', v: 3, at: 4 },
  'Hero-Necklace-Epic-Base': { r: 'grit', v: 1, at: 5 },
  'Archer-Weapon-Rare-Base': { r: 'mark', v: 1, at: 4 },
  'Archer-Off-Hand-Common-Base': { r: 'mark', v: 1, at: 4 },
  'Archer-Off-Hand-Rare-Base': { r: 'strength', v: 1, at: 4 },
  'Archer-Chest-Common-Base': { r: 'strength', v: 1, at: 4 },
  'Archer-Chest-Epic-Base': { r: 'mark', v: 2, at: 5 },
  'Archer-Hat-Rare-Base': { r: 'mark', v: 2, at: 4 },
  'Archer-Necklace-Common-Base': { r: 'mark', v: 1, at: 4 },
  'Archer-Weapon-Legendary-Base': { r: 'mark', v: 1, at: 5 },
  'Mage-Weapon-Rare-Base': { r: 'burn', v: 3, at: 4 },
  'Mage-Weapon-Epic-Base': { r: 'frost', v: 4, at: 5 },
  'Mage-Off-Hand-Common-Base': { r: 'strength', v: 1, at: 4 },
  'Mage-Off-Hand-Rare-Base': { r: 'frost', v: 3, at: 4 },
  'Mage-Off-Hand-Epic-Base': { r: 'burn', v: 1, at: 5 },
  'Mage-Chest-Common-Base': { r: 'strength', v: 2, at: 4 },
  'Mage-Chest-Rare-Base': { r: 'frost', v: 3, at: 4 },
  'Mage-Chest-Epic-Base': { r: 'burn', v: 2, at: 5 },
  'Mage-Hat-Common-Base': { r: 'burn', v: 2, at: 4 },
  'Mage-Necklace-Common-Base': { r: 'burn', v: 4, at: 4 },
  'Mage-Necklace-Rare-Base': { r: 'burn', v: 5, at: 4 },
  'Mage-Weapon-Legendary-Base': { r: 'burn', v: 4, at: 5 },
};
