import { describe, expect, it } from 'vitest';
import { VIEW_MAX_WIDTH, VIEW_MIN_WIDTH, computeLayout } from '../src/game/systems/scale';

const HEIGHT = 270;

describe('computeLayout zoom', () => {
  it('uses exact integer scales on 16:9 sizes', () => {
    expect(computeLayout(1920, 1080)).toEqual({ zoom: 4, width: 480 });
    expect(computeLayout(960, 540)).toEqual({ zoom: 2, width: 480 });
    expect(computeLayout(480, 270)).toEqual({ zoom: 1, width: 480 });
  });

  it('uses a fractional scale when an integer would waste too much screen', () => {
    expect(computeLayout(1280, 720).zoom).toBeCloseTo(2.66, 1);
    expect(computeLayout(844, 390).zoom).toBeCloseTo(1.44, 1);
    expect(computeLayout(1920, 950).zoom).toBeCloseTo(3.51, 1);
  });
});

describe('computeLayout width', () => {
  it('widens the view so the canvas covers a phone in landscape', () => {
    const { zoom, width } = computeLayout(844, 390);
    expect(width).toBeGreaterThan(VIEW_MIN_WIDTH + 80);
    expect(width * zoom).toBeGreaterThan(844 - zoom * 2);
  });

  it('covers a wide desktop window instead of leaving bars at the sides', () => {
    const { zoom, width } = computeLayout(1920, 950);
    expect(width * zoom).toBeGreaterThan(1920 - zoom * 2);
    expect(HEIGHT * zoom).toBeGreaterThan(950 - zoom * 2);
  });

  it('never goes below the minimum or above the maximum width', () => {
    expect(computeLayout(1024, 768).width).toBeGreaterThanOrEqual(VIEW_MIN_WIDTH);
    expect(computeLayout(320, 600).width).toBeGreaterThanOrEqual(VIEW_MIN_WIDTH);
    expect(computeLayout(4000, 900).width).toBe(VIEW_MAX_WIDTH);
  });

  it('never exceeds the viewport', () => {
    for (const [w, h] of [
      [1366, 768],
      [667, 375],
      [932, 430],
      [320, 180],
      [2560, 1080],
      [1024, 768],
      [1920, 950],
      [3440, 1440],
    ]) {
      const { zoom, width } = computeLayout(w, h);
      expect(width * zoom, `${w}x${h} width`).toBeLessThanOrEqual(w + 0.01);
      expect(HEIGHT * zoom, `${w}x${h} height`).toBeLessThanOrEqual(h + 0.01);
    }
  });
});
