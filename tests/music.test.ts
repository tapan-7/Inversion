import { describe, expect, it } from 'vitest';
import {
  midiToFreq,
  pentatonicMidi,
  pickPentatonicFreq,
  volumeToGain,
} from '../src/game/systems/music';

describe('midiToFreq', () => {
  it('maps A4 to 440 and octaves to doubles', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
    expect(midiToFreq(81)).toBeCloseTo(880, 6);
    expect(midiToFreq(57)).toBeCloseTo(220, 6);
  });
});

describe('pentatonicMidi', () => {
  it('walks the minor pentatonic and wraps octaves', () => {
    const notes = [0, 1, 2, 3, 4, 5, 6].map((i) => pentatonicMidi(57, i));
    expect(notes).toEqual([57, 60, 62, 64, 67, 69, 72]);
    expect(pentatonicMidi(57, -1)).toBe(55);
  });
});

describe('pickPentatonicFreq', () => {
  it('stays in range and avoids repeating the previous note', () => {
    let previous: number | undefined;
    for (let i = 0; i < 200; i++) {
      const pick = pickPentatonicFreq(57, 0, 6, Math.random, previous);
      expect(pick.index).toBeGreaterThanOrEqual(0);
      expect(pick.index).toBeLessThanOrEqual(6);
      if (previous !== undefined) expect(pick.index).not.toBe(previous);
      previous = pick.index;
    }
  });

  it('copes with a single-note range', () => {
    expect(pickPentatonicFreq(57, 2, 2, () => 0.5, 2).index).toBe(2);
  });
});

describe('volumeToGain', () => {
  it('is silent when muted or at zero, and monotonic', () => {
    expect(volumeToGain(1, true)).toBe(0);
    expect(volumeToGain(0, false)).toBe(0);
    expect(volumeToGain(0.5, false)).toBeLessThan(volumeToGain(0.8, false));
    expect(volumeToGain(5, false)).toBe(volumeToGain(1, false));
  });
});
