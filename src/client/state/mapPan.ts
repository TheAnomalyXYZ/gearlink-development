/** Map viewport maths: cover-scale the artwork and keep the pan inside it. */
import { MAP_ART } from '../../shared/engine/index.js';

/** Movement past this many px is a drag, not a tap - which is what stops a
 *  pan that ends over a pin from opening it. */
export const DRAG_SLOP = 6;

export const panBounds = (w: number, h: number) => {
  const scale = Math.max(w / MAP_ART.w, h / MAP_ART.h) || 1;
  return {
    scale,
    minX: Math.min(w - MAP_ART.w * scale, 0),
    minY: Math.min(h - MAP_ART.h * scale, 0),
  };
};

export const clampPan = (x: number, y: number, w: number, h: number) => {
  const { minX, minY } = panBounds(w, h);
  return {
    x: Math.max(minX, Math.min(0, x)),
    y: Math.max(minY, Math.min(0, y)),
  };
};
