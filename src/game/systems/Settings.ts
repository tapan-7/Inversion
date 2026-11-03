/** Player settings, saved to LocalStorage. No Phaser dependencies. */
import { browserStorage, type StorageLike } from './ProgressManager';

export type TouchMode = 'auto' | 'on' | 'off';
export const TOUCH_MODES: readonly TouchMode[] = ['auto', 'on', 'off'];

export interface SettingsData {
  /** Fewer particles, no screen shake, no glow sprites. */
  lowEffects: boolean;
  touchControls: TouchMode;
  /** 0 to 1. */
  volume: number;
  muted: boolean;
  /** Ids of tutorial tips already shown. */
  tipsSeen: string[];
}

export const SETTINGS_KEY = 'inversion.settings.v1';

export const DEFAULT_SETTINGS: SettingsData = {
  lowEffects: false,
  touchControls: 'auto',
  volume: 0.7,
  muted: false,
  tipsSeen: [],
};

export function sanitizeSettings(raw: unknown): SettingsData {
  const out: SettingsData = { ...DEFAULT_SETTINGS, tipsSeen: [] };
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.lowEffects === 'boolean') out.lowEffects = r.lowEffects;
  if (TOUCH_MODES.includes(r.touchControls as TouchMode)) out.touchControls = r.touchControls as TouchMode;
  if (typeof r.volume === 'number' && Number.isFinite(r.volume)) {
    out.volume = Math.min(1, Math.max(0, r.volume));
  }
  if (typeof r.muted === 'boolean') out.muted = r.muted;
  if (Array.isArray(r.tipsSeen)) {
    out.tipsSeen = [...new Set(r.tipsSeen.filter((t): t is string => typeof t === 'string'))];
  }
  return out;
}

type Listener = (data: SettingsData) => void;

export class SettingsManager {
  private current: SettingsData;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly storage: StorageLike | null) {
    this.current = this.read();
  }

  private read(): SettingsData {
    try {
      const text = this.storage?.getItem(SETTINGS_KEY);
      return sanitizeSettings(text ? JSON.parse(text) : null);
    } catch {
      return sanitizeSettings(null);
    }
  }

  private write(): void {
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.current));
    } catch {
      // Storage blocked or full: the setting still applies for this session.
    }
  }

  get data(): Readonly<SettingsData> {
    return this.current;
  }

  update(patch: Partial<SettingsData>): void {
    this.current = sanitizeSettings({ ...this.current, ...patch });
    this.write();
    for (const listener of this.listeners) listener(this.current);
  }

  hasSeenTip(id: string): boolean {
    return this.current.tipsSeen.includes(id);
  }

  markTipSeen(id: string): void {
    if (!this.hasSeenTip(id)) this.update({ tipsSeen: [...this.current.tipsSeen, id] });
  }

  resetTips(): void {
    this.update({ tipsSeen: [] });
  }

  /** Returns a function that removes the listener. */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Steps a 0 to 1 volume by tenths, clamped. */
export function stepVolume(volume: number, direction: 1 | -1): number {
  return Math.min(1, Math.max(0, Math.round((volume + direction * 0.1) * 10) / 10));
}

export const settings = new SettingsManager(browserStorage());
