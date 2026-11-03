import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/game/levels/chapter1';
import { canTouch, reach, reachesNode, reachesPortal } from './helpers/reach';

describe('reachability analyzer on Chapter 1', () => {
  const reached = reach(CHAPTER_1);

  it('reaches the portal from spawn', () => {
    expect(reachesPortal(reached, CHAPTER_1)).toBe(true);
  });

  it('reaches every fragment and checkpoint', () => {
    for (const f of CHAPTER_1.fragments ?? []) expect(canTouch(reached, f, f.dimension), f.id).toBe(true);
    for (const c of CHAPTER_1.checkpoints ?? []) expect(reachesNode(reached, c.col, c.row), c.id).toBe(true);
  });

  it('is not trivially permissive: the far pit floor is not a standing spot', () => {
    // Row 15 inside the first pit (cols 22 to 35) has no floor in either world.
    expect(reachesNode(reached, 30, 14)).toBe(false);
  });

  it('would fail on a broken level: removing the bridge makes the portal unreachable', () => {
    const broken = {
      ...CHAPTER_1,
      grids: {
        forgotten: CHAPTER_1.grids.forgotten,
        awakening: CHAPTER_1.grids.awakening.map((row, r) =>
          r === 15 ? row.replace(/b/g, '.') : row,
        ),
      },
    };
    expect(reachesPortal(reach(broken), broken)).toBe(false);
  });
});
