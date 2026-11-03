import { describe, expect, it } from 'vitest';
import {
  canOccupy,
  isSolidChar,
  otherDimension,
  solidCellsOverlapping,
} from '../src/game/world/dimensionMath';

const T = 16;
// Row 2 is a floor. A pillar sits at column 3, rows 0 and 1.
const grid = ['...#....', '...#....', '########'];

describe('otherDimension', () => {
  it('toggles between the two worlds', () => {
    expect(otherDimension('forgotten')).toBe('awakening');
    expect(otherDimension('awakening')).toBe('forgotten');
  });
});

describe('isSolidChar', () => {
  it('treats stone and ledges as solid', () => {
    expect(isSolidChar('#')).toBe(true);
    expect(isSolidChar('=')).toBe(true);
    expect(isSolidChar('.')).toBe(false);
    expect(isSolidChar(undefined)).toBe(false);
  });
});

describe('solidCellsOverlapping', () => {
  it('finds a solid cell the box sits inside', () => {
    const cells = solidCellsOverlapping(grid, { x: 50, y: 0, width: 10, height: 20 }, T);
    expect(cells).toEqual([
      { col: 3, row: 0 },
      { col: 3, row: 1 },
    ]);
  });

  it('does not count a box resting exactly on the floor', () => {
    expect(canOccupy(grid, { x: 8, y: 12, width: 10, height: 20 }, T)).toBe(true);
  });

  it('does not count touching a wall edge', () => {
    // Pillar spans x 48 to 64. A box ending at x=48 only touches it.
    expect(canOccupy(grid, { x: 38, y: 0, width: 10, height: 20 }, T)).toBe(true);
    expect(canOccupy(grid, { x: 64, y: 0, width: 10, height: 20 }, T)).toBe(true);
  });

  it('counts a one pixel intrusion unless an inset forgives it', () => {
    const intruding = { x: 39, y: 0, width: 10, height: 20 };
    expect(canOccupy(grid, intruding, T)).toBe(false);
    expect(canOccupy(grid, intruding, T, 1)).toBe(true);
  });

  it('counts sinking into the floor', () => {
    expect(canOccupy(grid, { x: 8, y: 20, width: 10, height: 20 }, T)).toBe(false);
  });

  it('treats cells outside the grid as empty', () => {
    expect(canOccupy(grid, { x: -40, y: -40, width: 10, height: 20 }, T)).toBe(true);
    expect(canOccupy(grid, { x: 400, y: 400, width: 10, height: 20 }, T)).toBe(true);
  });

  it('handles an empty or inverted box', () => {
    expect(solidCellsOverlapping(grid, { x: 50, y: 0, width: 0, height: 0 }, T)).toEqual([]);
  });
});
