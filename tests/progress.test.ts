import { describe, expect, it } from 'vitest';
import {
  ProgressManager,
  SAVE_KEY,
  formatTime,
  sanitizeSave,
  type StorageLike,
} from '../src/game/systems/ProgressManager';

class MemoryStorage implements StorageLike {
  readonly map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const reload = (storage: StorageLike) => new ProgressManager(storage);

describe('ProgressManager runs', () => {
  it('starts with nothing to continue', () => {
    const p = new ProgressManager(new MemoryStorage());
    expect(p.canContinue('chapter1')).toBe(false);
    expect(p.run).toBeNull();
  });

  it('persists fragments, checkpoint and time across a reload', () => {
    const storage = new MemoryStorage();
    const p = new ProgressManager(storage);
    p.startRun('chapter1');
    p.recordFragment('f1', 5000);
    p.recordFragment('f1', 5100);
    p.recordFragment('f2', 9000);
    p.recordCheckpoint('c1', 'awakening', 12000);

    const again = reload(storage);
    expect(again.canContinue('chapter1')).toBe(true);
    expect(again.canContinue('other')).toBe(false);
    expect(again.run).toEqual({
      levelId: 'chapter1',
      fragments: ['f1', 'f2'],
      checkpointId: 'c1',
      checkpointDimension: 'awakening',
      elapsedMs: 12000,
    });
  });

  it('startRun discards the previous run but keeps chapter records', () => {
    const storage = new MemoryStorage();
    const p = new ProgressManager(storage);
    p.startRun('chapter1');
    p.completeRun('chapter1', 60000, 3);
    p.startRun('chapter1');
    p.recordFragment('f1', 1000);
    p.startRun('chapter1');
    expect(p.run?.fragments).toEqual([]);
    expect(p.chapter('chapter1')?.completed).toBe(true);
  });

  it('ignores events when no run is active', () => {
    const p = new ProgressManager(new MemoryStorage());
    p.recordFragment('f1', 1);
    p.recordCheckpoint('c1', 'forgotten', 1);
    p.saveTime(5);
    expect(p.run).toBeNull();
  });
});

describe('ProgressManager completion', () => {
  it('ends the run and records the best time', () => {
    const storage = new MemoryStorage();
    const p = new ProgressManager(storage);
    p.startRun('chapter1');
    const first = p.completeRun('chapter1', 90000, 3);
    expect(first).toEqual({ timeMs: 90000, bestTimeMs: 90000, isNewBest: true });
    expect(p.canContinue('chapter1')).toBe(false);

    p.startRun('chapter1');
    const slower = p.completeRun('chapter1', 120000, 2);
    expect(slower.isNewBest).toBe(false);
    expect(slower.bestTimeMs).toBe(90000);

    p.startRun('chapter1');
    const faster = p.completeRun('chapter1', 70000, 3);
    expect(faster.isNewBest).toBe(true);

    const rec = reload(storage).chapter('chapter1');
    expect(rec).toEqual({ completed: true, bestTimeMs: 70000, bestFragments: 3 });
  });

  it('reset clears everything', () => {
    const storage = new MemoryStorage();
    const p = new ProgressManager(storage);
    p.startRun('chapter1');
    p.reset();
    expect(storage.map.has(SAVE_KEY)).toBe(false);
    expect(p.run).toBeNull();
  });
});

describe('ProgressManager storage failures', () => {
  it('works in memory when storage is unavailable', () => {
    const p = new ProgressManager(null);
    p.startRun('chapter1');
    p.recordFragment('f1', 10);
    expect(p.run?.fragments).toEqual(['f1']);
  });

  it('survives a storage that throws', () => {
    const broken: StorageLike = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('full');
      },
      removeItem() {
        throw new Error('blocked');
      },
    };
    const p = new ProgressManager(broken);
    p.startRun('chapter1');
    p.recordCheckpoint('c1', 'forgotten', 10);
    expect(p.run?.checkpointId).toBe('c1');
    expect(() => p.reset()).not.toThrow();
  });

  it('starts fresh from corrupt JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{not json');
    expect(new ProgressManager(storage).run).toBeNull();
  });
});

describe('sanitizeSave', () => {
  it('rejects wrong shapes and versions', () => {
    expect(sanitizeSave(null).run).toBeNull();
    expect(sanitizeSave('x').chapters).toEqual({});
    expect(sanitizeSave({ version: 2, run: { levelId: 'a' } }).run).toBeNull();
  });

  it('drops invalid fields but keeps valid ones', () => {
    const save = sanitizeSave({
      version: 1,
      chapters: { a: { completed: 'yes', bestTimeMs: -4, bestFragments: 2.9 }, b: 7 },
      run: {
        levelId: 'a',
        fragments: ['x', 3, 'x', 'y'],
        checkpointId: 9,
        checkpointDimension: 'void',
        elapsedMs: 'soon',
      },
    });
    expect(save.chapters).toEqual({ a: { completed: false, bestTimeMs: null, bestFragments: 2 } });
    expect(save.run).toEqual({
      levelId: 'a',
      fragments: ['x', 'y'],
      checkpointId: null,
      checkpointDimension: null,
      elapsedMs: 0,
    });
  });
});

describe('formatTime', () => {
  it('formats minutes, seconds and tenths', () => {
    expect(formatTime(0)).toBe('00:00.0');
    expect(formatTime(83456)).toBe('01:23.4');
    expect(formatTime(600000)).toBe('10:00.0');
    expect(formatTime(-5)).toBe('00:00.0');
  });
});
