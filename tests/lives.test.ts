import { describe, expect, it } from 'vitest';
import { DEFAULT_LIVES, MAX_LIVES } from '../src/game/constants';
import { ProgressManager, type StorageLike } from '../src/game/systems/ProgressManager';
import { isHazardChar, isSolidChar, hazardCellsOverlapping } from '../src/game/world/dimensionMath';

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

describe('3-Lives System', () => {
  it('starts fresh run with 3 lives', () => {
    const pm = new ProgressManager(new MemoryStorage());
    const run = pm.startRun('chapter1');
    expect(run.lives).toBe(DEFAULT_LIVES);
    expect(DEFAULT_LIVES).toBe(3);
    expect(MAX_LIVES).toBe(3);
  });

  it('deducts lives sequentially down to 0', () => {
    const pm = new ProgressManager(new MemoryStorage());
    pm.startRun('chapter1');
    expect(pm.lives).toBe(3);

    expect(pm.deductLife()).toBe(2);
    expect(pm.lives).toBe(2);

    expect(pm.deductLife()).toBe(1);
    expect(pm.lives).toBe(1);

    expect(pm.deductLife()).toBe(0);
    expect(pm.lives).toBe(0);

    // Clamps to 0
    expect(pm.deductLife()).toBe(0);
    expect(pm.lives).toBe(0);
  });

  it('preserves completed chapters when Game Over occurs and run is cleared', () => {
    const pm = new ProgressManager(new MemoryStorage());
    pm.startRun('chapter1');
    // Complete Chapter 1
    pm.completeRun('chapter1', 15000, 3, 'chapter2');
    expect(pm.isUnlocked(['chapter1', 'chapter2', 'chapter3'], 1)).toBe(true);

    // Now in Chapter 2, lose all lives
    expect(pm.run?.levelId).toBe('chapter2');
    pm.deductLife();
    pm.deductLife();
    pm.deductLife();
    expect(pm.lives).toBe(0);

    // Game over wipes active run
    pm.clearRun();
    expect(pm.run).toBeNull();

    // Permanent record is preserved!
    expect(pm.chapter('chapter1')?.completed).toBe(true);
    expect(pm.chapter('chapter1')?.bestTimeMs).toBe(15000);
    expect(pm.isUnlocked(['chapter1', 'chapter2', 'chapter3'], 1)).toBe(true);
  });

  it('awards +1 bonus life once per chapter per run when all echoes found, capped at 3', () => {
    const pm = new ProgressManager(new MemoryStorage());
    pm.startRun('chapter1');

    // Deduct to 2 lives
    pm.deductLife();
    expect(pm.lives).toBe(2);

    // Collect all echoes in chapter 1
    const claimed = pm.claimBonusLife('chapter1');
    expect(claimed).toBe(true);
    expect(pm.lives).toBe(3);

    // Anti-farming check: cannot claim again in same chapter of this run
    expect(pm.claimBonusLife('chapter1')).toBe(false);
    expect(pm.lives).toBe(3);

    // Max cap check: when at 3 lives, bonus cannot exceed 3
    pm.advanceRun('chapter2', 20000);
    expect(pm.lives).toBe(3);
    const claimedCh2 = pm.claimBonusLife('chapter2');
    expect(claimedCh2).toBe(false);
    expect(pm.lives).toBe(3);
  });

  it('carries remaining lives continuously from chapter to chapter', () => {
    const pm = new ProgressManager(new MemoryStorage());
    pm.startRun('chapter1');
    // Lose 1 life in Chapter 1
    pm.deductLife();
    expect(pm.lives).toBe(2);

    // Complete Chapter 1 and advance to Chapter 2
    pm.completeRun('chapter1', 25000, 2, 'chapter2');
    expect(pm.run?.levelId).toBe('chapter2');
    expect(pm.run?.lives).toBe(2);

    // Complete Chapter 2 and advance to Chapter 3
    pm.completeRun('chapter2', 30000, 3, 'chapter3');
    expect(pm.run?.levelId).toBe('chapter3');
    expect(pm.run?.lives).toBe(2);
  });
});

describe('Hazard and Decaying Platform tiles', () => {
  it('recognizes decay platforms as solid and spikes as hazard', () => {
    expect(isSolidChar('c')).toBe(true);
    expect(isSolidChar('^')).toBe(false);
    expect(isHazardChar('^')).toBe(true);
    expect(isHazardChar('c')).toBe(false);
  });

  it('detects hazard cells overlapping player bounding box', () => {
    const grid = [
      '....',
      '.^^.',
      '####',
    ];
    // Player touching the spikes
    const playerRect = { x: 16, y: 16, width: 16, height: 16 };
    const hits = hazardCellsOverlapping(grid, playerRect, 16, 0);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits).toEqual([{ col: 1, row: 1 }]);
  });
});
