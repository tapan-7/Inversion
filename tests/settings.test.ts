import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SettingsManager,
  sanitizeSettings,
  stepVolume,
} from '../src/game/systems/Settings';
import type { StorageLike } from '../src/game/systems/ProgressManager';

class Mem implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe('sanitizeSettings', () => {
  it('returns defaults for junk', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields, clamps volume and drops bad ones', () => {
    const s = sanitizeSettings({
      lowEffects: true,
      touchControls: 'sideways',
      volume: 4,
      muted: 'no',
      tipsSeen: ['a', 1, 'a', 'b'],
    });
    expect(s).toEqual({ lowEffects: true, touchControls: 'auto', volume: 1, muted: false, tipsSeen: ['a', 'b'] });
    expect(sanitizeSettings({ volume: -2 }).volume).toBe(0);
  });
});

describe('SettingsManager', () => {
  it('persists changes and notifies listeners', () => {
    const storage = new Mem();
    const m = new SettingsManager(storage);
    let calls = 0;
    const off = m.onChange(() => calls++);
    m.update({ lowEffects: true, volume: 0.3 });
    expect(calls).toBe(1);
    expect(new SettingsManager(storage).data).toMatchObject({ lowEffects: true, volume: 0.3 });
    off();
    m.update({ muted: true });
    expect(calls).toBe(1);
  });

  it('tracks seen tips once and can reset them', () => {
    const m = new SettingsManager(new Mem());
    m.markTipSeen('switch');
    m.markTipSeen('switch');
    expect(m.data.tipsSeen).toEqual(['switch']);
    expect(m.hasSeenTip('switch')).toBe(true);
    m.resetTips();
    expect(m.hasSeenTip('switch')).toBe(false);
  });

  it('works with no storage and with storage that throws', () => {
    const none = new SettingsManager(null);
    none.update({ muted: true });
    expect(none.data.muted).toBe(true);

    const broken: StorageLike = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('full');
      },
      removeItem() {},
    };
    const m = new SettingsManager(broken);
    expect(() => m.update({ lowEffects: true })).not.toThrow();
    expect(m.data.lowEffects).toBe(true);
  });

  it('survives corrupt JSON', () => {
    const storage = new Mem();
    storage.setItem(SETTINGS_KEY, '{oops');
    expect(new SettingsManager(storage).data).toEqual(DEFAULT_SETTINGS);
  });
});

describe('stepVolume', () => {
  it('moves by tenths without float drift and clamps', () => {
    expect(stepVolume(0.7, 1)).toBe(0.8);
    expect(stepVolume(0.3, -1)).toBe(0.2);
    expect(stepVolume(1, 1)).toBe(1);
    expect(stepVolume(0, -1)).toBe(0);
    let v = 0;
    for (let i = 0; i < 10; i++) v = stepVolume(v, 1);
    expect(v).toBe(1);
  });
});
