import { describe, expect, it } from 'vitest';
import { computeZoom } from '../src/game/systems/scale';

describe('computeZoom', () => {
  it('uses exact integer scales on common desktop sizes', () => {
    expect(computeZoom(1920, 1080)).toBe(4);
    expect(computeZoom(960, 540)).toBe(2);
    expect(computeZoom(480, 270)).toBe(1);
  });

  it('uses a fractional scale when an integer would waste too much screen', () => {
    expect(computeZoom(1280, 720)).toBeCloseTo(2.66, 1);
    expect(computeZoom(844, 390)).toBeCloseTo(1.44, 1);
  });

  it('never exceeds the viewport', () => {
    for (const [w, h] of [
      [1366, 768],
      [667, 375],
      [932, 430],
      [320, 180],
    ]) {
      const z = computeZoom(w, h);
      expect(480 * z).toBeLessThanOrEqual(w);
      expect(270 * z).toBeLessThanOrEqual(h);
    }
  });
});
