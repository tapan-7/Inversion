import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

/**
 * Picks the display zoom for a viewport. Prefers an integer scale so pixels stay
 * uniform, but falls back to a fractional scale when the integer scale would waste
 * too much of the screen (common on phones and 1366x768 laptops).
 */
export function computeZoom(viewportWidth: number, viewportHeight: number): number {
  const fit = Math.min(viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT);
  if (fit <= 0) return 1;
  const whole = Math.floor(fit);
  if (whole >= 1 && whole / fit >= 0.85) return whole;
  return Math.max(0.25, Math.floor(fit * 100) / 100);
}
