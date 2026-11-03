import { describe, expect, it } from 'vitest';
import { columnsDue, removalTimeMs } from '../src/game/systems/collapse';
import { stepPatrol, type PatrolState } from '../src/game/systems/patrol';
import { SequenceState } from '../src/game/systems/sequence';

describe('SequenceState', () => {
  it('lights crystals in order and completes', () => {
    const s = new SequenceState([2, 0, 1]);
    expect(s.touch(2)).toBe('correct');
    expect(s.isLit(2)).toBe(true);
    expect(s.touch(0)).toBe('correct');
    expect(s.touch(1)).toBe('complete');
    expect(s.solved).toBe(true);
    expect(s.count).toBe(3);
  });

  it('resets everything on a wrong crystal', () => {
    const s = new SequenceState([2, 0, 1]);
    s.touch(2);
    expect(s.touch(1)).toBe('wrong');
    expect(s.count).toBe(0);
    expect(s.isLit(2)).toBe(false);
    expect(s.touch(2)).toBe('correct');
  });

  it('ignores a crystal that is already lit', () => {
    const s = new SequenceState([1, 0]);
    s.touch(1);
    expect(s.touch(1)).toBe('ignored');
    expect(s.count).toBe(1);
  });

  it('ignores everything once solved, and can be reset', () => {
    const s = new SequenceState([0]);
    expect(s.touch(0)).toBe('complete');
    expect(s.touch(0)).toBe('ignored');
    expect(s.touch(3)).toBe('ignored');
    s.reset();
    expect(s.solved).toBe(false);
  });
});

describe('stepPatrol', () => {
  const start: PatrolState = { x: 100, dir: 1, pause: 0 };

  it('moves at speed in the facing direction', () => {
    const next = stepPatrol(start, 100, 200, 20, 1, 0.5);
    expect(next).toEqual({ x: 110, dir: 1, pause: 0 });
  });

  it('stops at the end, waits, then walks back', () => {
    let s: PatrolState = { x: 195, dir: 1, pause: 0 };
    s = stepPatrol(s, 100, 200, 20, 1, 0.5);
    expect(s).toEqual({ x: 200, dir: -1, pause: 1 });
    s = stepPatrol(s, 100, 200, 20, 1, 0.6);
    expect(s.x).toBe(200);
    expect(s.pause).toBeCloseTo(0.4, 6);
    s = stepPatrol(s, 100, 200, 20, 1, 0.5);
    expect(s.pause).toBe(0);
    s = stepPatrol(s, 100, 200, 20, 1, 0.5);
    expect(s.x).toBe(190);
  });

  it('never leaves its route, even with a huge step', () => {
    let s: PatrolState = { x: 150, dir: 1, pause: 0 };
    for (let i = 0; i < 500; i++) {
      s = stepPatrol(s, 100, 200, 30, 0.5, 0.3);
      expect(s.x).toBeGreaterThanOrEqual(100);
      expect(s.x).toBeLessThanOrEqual(200);
    }
  });
});

describe('collapse timing', () => {
  const timing = { fromCol: 40, toCol: 50, delayMs: 2000, speed: 4 };

  it('schedules columns evenly after the delay', () => {
    expect(removalTimeMs(40, timing)).toBe(2000);
    expect(removalTimeMs(44, timing)).toBe(3000);
    expect(removalTimeMs(50, timing)).toBe(4500);
  });

  it('returns exactly the columns that came due in a window', () => {
    expect(columnsDue(0, 1999, timing)).toEqual([]);
    expect(columnsDue(0, 2000, timing)).toEqual([40]);
    expect(columnsDue(2000, 2600, timing)).toEqual([41, 42]);
    expect(columnsDue(0, 99999, timing)).toHaveLength(11);
  });

  it('never returns a column twice across consecutive windows', () => {
    const seen: number[] = [];
    let prev = 0;
    for (let t = 16; t < 6000; t += 16) {
      seen.push(...columnsDue(prev, t, timing));
      prev = t;
    }
    expect(seen).toEqual([40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]);
  });
});
