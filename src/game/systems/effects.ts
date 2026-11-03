import { settings } from './Settings';

/** Effect strength helpers. Everything here honours the Low Effects setting. */
export const fx = {
  get low(): boolean {
    return settings.data.lowEffects;
  },

  /** Particle count after the Low Effects reduction. */
  count(n: number): number {
    return settings.data.lowEffects ? Math.max(1, Math.round(n * 0.3)) : n;
  },

  /** Screen shake intensity, zero when Low Effects is on. */
  shake(intensity: number): number {
    return settings.data.lowEffects ? 0 : intensity;
  },
};
