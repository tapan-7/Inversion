import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

/** Narrowest logical width. Taller-than-16:9 windows get bars rather than a narrower view. */
export const VIEW_MIN_WIDTH = GAME_WIDTH;
/** Widest logical width, a little under 3:1. Wider windows get bars at the sides. */
export const VIEW_MAX_WIDTH = 800;

export interface ViewLayout {
  /** Display scale, logical pixels to screen pixels. */
  zoom: number;
  /** Logical width. The height is always GAME_HEIGHT. */
  width: number;
}

/**
 * Chooses the display zoom and the logical width for a viewport. The height is fixed
 * and the width grows to cover the screen, so no bars appear at the sides.
 *
 * It prefers an integer zoom so pixels stay uniform, and falls back to a fractional
 * one when the integer zoom would waste more than a tenth of the screen.
 */
export function computeLayout(viewportWidth: number, viewportHeight: number): ViewLayout {
  const fit = Math.min(viewportWidth / VIEW_MIN_WIDTH, viewportHeight / GAME_HEIGHT);
  if (!(fit > 0)) return { zoom: 1, width: VIEW_MIN_WIDTH };

  const whole = Math.floor(fit);
  const zoom = whole >= 1 && whole / fit >= 0.9 ? whole : Math.max(0.25, Math.floor(fit * 100) / 100);
  const width = Math.min(VIEW_MAX_WIDTH, Math.max(VIEW_MIN_WIDTH, Math.floor(viewportWidth / zoom)));
  return { zoom, width };
}

/** Zoom only, kept for callers that do not care about the width. */
export function computeZoom(viewportWidth: number, viewportHeight: number): number {
  return computeLayout(viewportWidth, viewportHeight).zoom;
}
