import type { Dimension } from '../world/dimensionMath';
import { midiToFreq, pentatonicMidi, pickPentatonicFreq, volumeToGain } from './music';

export type SfxName =
  | 'jump'
  | 'toAwakening'
  | 'toForgotten'
  | 'blocked'
  | 'fragment'
  | 'checkpoint'
  | 'portal'
  | 'complete'
  | 'click'
  | 'death'
  | 'sequence'
  | 'sequenceWrong'
  | 'gate'
  | 'rumble'
  | 'crumble'
  | 'ending';

interface Layer {
  gain: GainNode;
  /** Target level, 0 or 1 or a menu level in between. */
  level: number;
  nextNote: number;
  lastIndex?: number;
}

const FADE_SECONDS = 0.35;
const A_MIDI = 57; // A3

/**
 * Everything you hear is synthesized with Web Audio, no files. Each dimension has
 * its own ambient layer: Forgotten is a cold drone with wind and sparse low bells,
 * Awakening is a warm pad with shimmering high bells. Switching crossfades them.
 *
 * Browsers only start audio after a user gesture, so nothing is built until `unlock()`.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private bus: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private layers: Record<Dimension, Layer> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  private volume = 0.7;
  private muted = false;
  private ducked = false;
  private pendingMix: Record<Dimension, number> = { forgotten: 0, awakening: 0 };

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    try {
      if (!this.ctx) this.build();
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // Audio is optional: carry on silently if the browser refuses.
      this.ctx = null;
    }
  }

  /** Stops sound while the tab is hidden. */
  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  applySettings(volume: number, muted: boolean): void {
    this.volume = volume;
    this.muted = muted;
    this.updateMaster();
  }

  /** Lowers the whole mix, used while paused. */
  setDuck(on: boolean): void {
    this.ducked = on;
    if (!this.ctx || !this.duckGain) return;
    this.duckGain.gain.setTargetAtTime(on ? 0.35 : 1, this.ctx.currentTime, 0.12);
  }

  /** Sets the level of each ambient layer. Crossfades when audio is running. */
  setMix(forgotten: number, awakening: number): void {
    this.pendingMix = { forgotten, awakening };
    if (!this.ctx || !this.layers) return;
    const now = this.ctx.currentTime;
    for (const d of ['forgotten', 'awakening'] as const) {
      const layer = this.layers[d];
      layer.level = this.pendingMix[d];
      layer.gain.gain.cancelScheduledValues(now);
      layer.gain.gain.setTargetAtTime(layer.level, now, FADE_SECONDS / 3);
    }
  }

  setDimension(dimension: Dimension): void {
    this.setMix(dimension === 'forgotten' ? 1 : 0, dimension === 'awakening' ? 1 : 0);
  }

  /** Quiet Forgotten bed for the menu. */
  setMenu(): void {
    this.setMix(0.6, 0);
  }

  private updateMaster(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(volumeToGain(this.volume, this.muted), this.ctx.currentTime, 0.05);
  }

  private build(): void {
    const AudioCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = volumeToGain(this.volume, this.muted);
    this.duckGain = ctx.createGain();
    this.duckGain.gain.value = this.ducked ? 0.35 : 1;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.bus = ctx.createGain();
    this.bus.connect(this.duckGain);
    this.duckGain.connect(this.master);
    this.master.connect(this.analyser);
    this.master.connect(ctx.destination);

    // Shared reverb: a decaying noise impulse.
    const convolver = ctx.createConvolver();
    convolver.buffer = this.impulse(ctx, 2.6);
    this.reverbIn = ctx.createGain();
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverbIn.connect(convolver);
    convolver.connect(wet);
    wet.connect(this.bus);

    const make = (): Layer => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.bus!);
      return { gain, level: 0, nextNote: 0 };
    };
    this.layers = { forgotten: make(), awakening: make() };
    this.buildForgotten(ctx, this.layers.forgotten.gain);
    this.buildAwakening(ctx, this.layers.awakening.gain);

    this.setMix(this.pendingMix.forgotten, this.pendingMix.awakening);
    this.timer = setInterval(() => this.tick(), 200);
  }

  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
      }
    }
    return buffer;
  }

  private noiseSource(ctx: AudioContext): AudioBufferSourceNode {
    // Brown-ish noise, looped.
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  private lfo(ctx: AudioContext, rate: number, depth: number, target: AudioParam): void {
    const osc = ctx.createOscillator();
    const amount = ctx.createGain();
    osc.frequency.value = rate;
    amount.gain.value = depth;
    osc.connect(amount);
    amount.connect(target);
    osc.start();
  }

  /** Cold: deep drone and filtered wind. */
  private buildForgotten(ctx: AudioContext, out: GainNode): void {
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 380;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.045;
    low.connect(droneGain);
    droneGain.connect(out);
    for (const [freq, type, detune] of [
      [55, 'sine', 0],
      [82.41, 'triangle', -4],
      [110, 'sine', 5],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(low);
      osc.start();
    }
    this.lfo(ctx, 0.05, 0.015, droneGain.gain);

    const wind = this.noiseSource(ctx);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.07;
    wind.connect(band);
    band.connect(windGain);
    windGain.connect(out);
    this.lfo(ctx, 0.07, 220, band.frequency);
    this.lfo(ctx, 0.11, 0.025, windGain.gain);
    wind.start();
  }

  /** Warm: a detuned pad that breathes. */
  private buildAwakening(ctx: AudioContext, out: GainNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.6;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.3;
    filter.connect(padGain);
    padGain.connect(out);
    this.lfo(ctx, 0.08, 450, filter.frequency);
    this.lfo(ctx, 0.06, 0.1, padGain.gain);
    // A minor add9: A2, E3, A3, C4, B4.
    for (const [freq, detune] of [
      [110, -6],
      [110, 7],
      [164.81, -5],
      [220, 6],
      [261.63, -7],
      [493.88, 4],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = freq < 200 ? 'sawtooth' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = freq < 200 ? 0.35 : 0.25;
      osc.connect(g);
      g.connect(filter);
      osc.start();
    }
  }

  /** Schedules sparse bells for whichever layers are audible. */
  private tick(): void {
    const ctx = this.ctx;
    const layers = this.layers;
    if (!ctx || !layers || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    if (layers.forgotten.level > 0 && now >= layers.forgotten.nextNote) {
      const pick = pickPentatonicFreq(A_MIDI, 0, 6, Math.random, layers.forgotten.lastIndex);
      layers.forgotten.lastIndex = pick.index;
      this.bell(layers.forgotten.gain, pick.freq, now + 0.05, 3.2, 0.05, 0.9);
      layers.forgotten.nextNote = now + 3.5 + Math.random() * 4;
    }
    if (layers.awakening.level > 0 && now >= layers.awakening.nextNote) {
      const pick = pickPentatonicFreq(A_MIDI + 12, 0, 8, Math.random, layers.awakening.lastIndex);
      layers.awakening.lastIndex = pick.index;
      this.bell(layers.awakening.gain, pick.freq, now + 0.05, 2.0, 0.055, 0.7);
      layers.awakening.nextNote = now + 0.8 + Math.random() * 1.8;
    }
  }

  /** A soft sine bell with a quiet octave partial, sent partly to the reverb. */
  private bell(dest: AudioNode, freq: number, start: number, length: number, level: number, send: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.reverbIn) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + length);
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = send;
    g.connect(dest);
    g.connect(reverbSend);
    reverbSend.connect(this.reverbIn);
    for (const [mult, amp] of [
      [1, 1],
      [2, 0.25],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      const a = ctx.createGain();
      a.gain.value = amp;
      osc.connect(a);
      a.connect(g);
      osc.start(start);
      osc.stop(start + length + 0.1);
    }
  }

  private tone(
    freq: number,
    start: number,
    length: number,
    level: number,
    type: OscillatorType = 'sine',
    endFreq?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + length);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(g);
    g.connect(this.bus);
    if (this.reverbIn) {
      const send = ctx.createGain();
      send.gain.value = 0.25;
      g.connect(send);
      send.connect(this.reverbIn);
    }
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  private whoosh(start: number, length: number, from: number, to: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    const src = this.noiseSource(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + length);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + length * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, start + length);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bus);
    src.start(start);
    src.stop(start + length + 0.05);
  }

  /** `step` picks the note for the rising `sequence` sound. */
  sfx(name: SfxName, step = 0): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'jump':
        this.tone(260, t, 0.12, 0.07, 'triangle', 480);
        break;
      case 'toAwakening':
        this.whoosh(t, 0.4, 300, 2600, 0.9);
        this.tone(330, t, 0.35, 0.08, 'sine', 990);
        this.tone(494, t + 0.05, 0.4, 0.05, 'sine', 1319);
        break;
      case 'toForgotten':
        this.whoosh(t, 0.4, 2400, 260, 0.8);
        this.tone(660, t, 0.35, 0.07, 'sine', 220);
        break;
      case 'blocked':
        this.tone(110, t, 0.1, 0.12, 'square');
        this.tone(98, t + 0.13, 0.14, 0.12, 'square');
        break;
      case 'fragment':
        [659.25, 880, 1318.5].forEach((f, i) => this.tone(f, t + i * 0.07, 0.7, 0.07));
        break;
      case 'checkpoint':
        this.tone(523.25, t, 0.8, 0.07);
        this.tone(783.99, t + 0.12, 1.0, 0.07);
        break;
      case 'portal':
        [330, 494, 659, 988].forEach((f, i) => this.tone(f, t + i * 0.12, 1.3, 0.06, 'triangle'));
        break;
      case 'complete':
        [220, 330, 440, 659, 880].forEach((f, i) => this.tone(f, t + i * 0.1, 2.2, 0.06, 'triangle'));
        break;
      case 'click':
        this.tone(740, t, 0.05, 0.05, 'square');
        break;
      case 'death':
        this.tone(320, t, 0.4, 0.09, 'sawtooth', 55);
        this.whoosh(t, 0.35, 1800, 120, 0.7);
        break;
      case 'sequence': {
        const f = midiToFreq(pentatonicMidi(69, step * 2));
        this.tone(f, t, 1.1, 0.08);
        this.tone(f * 2, t, 0.6, 0.03);
        break;
      }
      case 'sequenceWrong':
        this.tone(185, t, 0.25, 0.1, 'square');
        this.tone(196, t, 0.25, 0.1, 'square');
        this.tone(92, t + 0.1, 0.3, 0.1, 'sawtooth');
        break;
      case 'gate':
        this.tone(90, t, 0.9, 0.12, 'square', 40);
        this.whoosh(t, 0.9, 600, 120, 0.8);
        [392, 523.25, 784].forEach((f, i) => this.tone(f, t + 0.3 + i * 0.12, 1.2, 0.06, 'triangle'));
        break;
      case 'rumble':
        this.whoosh(t, 2.4, 140, 60, 1.6);
        this.tone(48, t, 2.4, 0.16, 'sawtooth', 32);
        break;
      case 'crumble':
        this.whoosh(t, 0.22, 900, 140, 0.6);
        break;
      case 'ending':
        [110, 165, 220, 330, 440, 660].forEach((f, i) => this.tone(f, t + i * 0.35, 4.5, 0.05, 'triangle'));
        break;
    }
  }

  /** For tests: current state without touching the audio graph. */
  debugState(): {
    state: string;
    mix: Record<Dimension, number> | null;
    rms: number;
    volume: number;
    muted: boolean;
    ducked: boolean;
    masterGain: number;
  } {
    let rms = 0;
    if (this.analyser) {
      const data = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += v * v;
      rms = Math.sqrt(sum / data.length);
    }
    return {
      state: this.ctx?.state ?? 'none',
      mix: this.layers
        ? {
            forgotten: this.layers.forgotten.gain.gain.value,
            awakening: this.layers.awakening.gain.gain.value,
          }
        : null,
      rms,
      volume: this.volume,
      muted: this.muted,
      ducked: this.ducked,
      masterGain: this.master?.gain.value ?? 0,
    };
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audio = new AudioEngine();
