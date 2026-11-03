/** Pure note helpers for the synthesized soundtrack. No Web Audio here, so it is unit tested. */

/** Minor pentatonic steps above the root, in semitones. */
export const PENTATONIC_STEPS = [0, 3, 5, 7, 10] as const;

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** MIDI note of the nth pentatonic degree above `rootMidi`, wrapping into higher octaves. */
export function pentatonicMidi(rootMidi: number, index: number): number {
  const n = PENTATONIC_STEPS.length;
  const octave = Math.floor(index / n);
  const degree = ((index % n) + n) % n;
  return rootMidi + octave * 12 + PENTATONIC_STEPS[degree];
}

/** Picks a pentatonic frequency in `[lowIndex, highIndex]`, never repeating `previous` when it can avoid it. */
export function pickPentatonicFreq(
  rootMidi: number,
  lowIndex: number,
  highIndex: number,
  rand: () => number,
  previousIndex?: number,
): { freq: number; index: number } {
  const span = highIndex - lowIndex + 1;
  let index = lowIndex + Math.floor(rand() * span);
  if (index === previousIndex && span > 1) index = lowIndex + ((index - lowIndex + 1) % span);
  return { freq: midiToFreq(pentatonicMidi(rootMidi, index)), index };
}

/** Linear 0 to 1 slider to a gentler perceptual gain. */
export function volumeToGain(volume: number, muted: boolean): number {
  if (muted) return 0;
  const v = Math.min(1, Math.max(0, volume));
  return v * v * 0.6;
}
