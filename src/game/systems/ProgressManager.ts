/** Save data and run state. No Phaser dependencies, so it is unit tested directly. */
import type { Dimension } from '../world/dimensionMath';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ChapterRecord {
  completed: boolean;
  bestTimeMs: number | null;
  bestFragments: number;
}

/** An unfinished playthrough, resumed by Continue. */
export interface RunState {
  levelId: string;
  fragments: string[];
  checkpointId: string | null;
  checkpointDimension: Dimension | null;
  /** One-off puzzle states solved in this run, such as an opened gate. */
  flags: string[];
  elapsedMs: number;
}

export interface SaveData {
  version: 1;
  chapters: Record<string, ChapterRecord>;
  run: RunState | null;
}

export const SAVE_KEY = 'inversion.save.v1';

const emptySave = (): SaveData => ({ version: 1, chapters: {}, run: null });

const isDimension = (v: unknown): v is Dimension => v === 'forgotten' || v === 'awakening';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Turns whatever was stored into valid save data. Anything malformed is dropped. */
export function sanitizeSave(raw: unknown): SaveData {
  const save = emptySave();
  if (typeof raw !== 'object' || raw === null) return save;
  const data = raw as Record<string, unknown>;
  if (data.version !== 1) return save;

  if (typeof data.chapters === 'object' && data.chapters !== null) {
    for (const [id, value] of Object.entries(data.chapters)) {
      if (typeof value !== 'object' || value === null) continue;
      const rec = value as Record<string, unknown>;
      save.chapters[id] = {
        completed: rec.completed === true,
        bestTimeMs: isNumber(rec.bestTimeMs) ? rec.bestTimeMs : null,
        bestFragments: isNumber(rec.bestFragments) ? Math.floor(rec.bestFragments) : 0,
      };
    }
  }

  const run = data.run as Record<string, unknown> | null | undefined;
  if (run && typeof run === 'object' && typeof run.levelId === 'string') {
    save.run = {
      levelId: run.levelId,
      fragments: Array.isArray(run.fragments)
        ? [...new Set(run.fragments.filter((f): f is string => typeof f === 'string'))]
        : [],
      checkpointId: typeof run.checkpointId === 'string' ? run.checkpointId : null,
      checkpointDimension: isDimension(run.checkpointDimension) ? run.checkpointDimension : null,
      flags: Array.isArray(run.flags)
        ? [...new Set(run.flags.filter((f): f is string => typeof f === 'string'))]
        : [],
      elapsedMs: isNumber(run.elapsedMs) ? run.elapsedMs : 0,
    };
  }
  return save;
}

export interface CompletionResult {
  timeMs: number;
  bestTimeMs: number;
  isNewBest: boolean;
}

export class ProgressManager {
  private data: SaveData;

  /** `storage` is null when the browser blocks it. Progress then lasts for the session only. */
  constructor(private readonly storage: StorageLike | null) {
    this.data = this.read();
  }

  private read(): SaveData {
    try {
      const text = this.storage?.getItem(SAVE_KEY);
      return text ? sanitizeSave(JSON.parse(text)) : emptySave();
    } catch {
      return emptySave();
    }
  }

  private write(): void {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or blocked: keep playing with in-memory progress.
    }
  }

  get run(): RunState | null {
    return this.data.run;
  }

  chapter(levelId: string): ChapterRecord | null {
    return this.data.chapters[levelId] ?? null;
  }

  canContinue(levelId: string): boolean {
    return this.data.run?.levelId === levelId;
  }

  /** Begins a fresh playthrough. Records from earlier completions are kept. */
  startRun(levelId: string): RunState {
    this.data.run = {
      levelId,
      fragments: [],
      checkpointId: null,
      checkpointDimension: null,
      flags: [],
      elapsedMs: 0,
    };
    this.write();
    return this.data.run;
  }

  recordFragment(id: string, elapsedMs: number): void {
    const run = this.data.run;
    if (!run) return;
    if (!run.fragments.includes(id)) run.fragments.push(id);
    run.elapsedMs = elapsedMs;
    this.write();
  }

  recordCheckpoint(id: string, dimension: Dimension, elapsedMs: number): void {
    const run = this.data.run;
    if (!run) return;
    run.checkpointId = id;
    run.checkpointDimension = dimension;
    run.elapsedMs = elapsedMs;
    this.write();
  }

  recordFlag(flag: string, elapsedMs: number): void {
    const run = this.data.run;
    if (!run) return;
    if (!run.flags.includes(flag)) run.flags.push(flag);
    run.elapsedMs = elapsedMs;
    this.write();
  }

  /** Chapter `index` (0 based) is open when it is the first or the one before it was finished. */
  isUnlocked(levelIds: readonly string[], index: number): boolean {
    return index <= 0 || !!this.data.chapters[levelIds[index - 1]]?.completed;
  }

  /** Sums across chapters, for the ending screen. */
  totals(levelIds: readonly string[]): { fragments: number; timeMs: number; completed: number } {
    let fragments = 0;
    let timeMs = 0;
    let completed = 0;
    for (const id of levelIds) {
      const rec = this.data.chapters[id];
      if (!rec) continue;
      fragments += rec.bestFragments;
      timeMs += rec.bestTimeMs ?? 0;
      if (rec.completed) completed++;
    }
    return { fragments, timeMs, completed };
  }

  /** Saves the clock, used when leaving mid-run. */
  saveTime(elapsedMs: number): void {
    if (!this.data.run) return;
    this.data.run.elapsedMs = elapsedMs;
    this.write();
  }

  /** Marks the chapter done, keeps the best time and ends the run. */
  completeRun(levelId: string, timeMs: number, fragmentCount: number): CompletionResult {
    const previous = this.data.chapters[levelId];
    const previousBest = previous?.bestTimeMs ?? null;
    const isNewBest = previousBest === null || timeMs < previousBest;
    const bestTimeMs = isNewBest ? timeMs : (previousBest as number);
    this.data.chapters[levelId] = {
      completed: true,
      bestTimeMs,
      bestFragments: Math.max(previous?.bestFragments ?? 0, fragmentCount),
    };
    this.data.run = null;
    this.write();
    return { timeMs, bestTimeMs, isNewBest };
  }

  reset(): void {
    this.data = emptySave();
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      // Nothing to do.
    }
  }
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 100)) / 10;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`;
}

export function browserStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The save shared by every scene. */
export const progress = new ProgressManager(browserStorage());
