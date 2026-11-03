import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/game/levels/chapter1';
import { TILE_SIZE } from '../src/game/constants';
import { DIMENSIONS, canOccupy, isSolidChar } from '../src/game/world/dimensionMath';

const { grids, spawn, fragments = [], checkpoints = [], portal } = CHAPTER_1;
const cell = (dim: 'forgotten' | 'awakening', col: number, row: number) => grids[dim][row]?.[col];

describe('chapter 1 layout', () => {
  it('has rectangular, equal-sized grids of known characters', () => {
    for (const d of DIMENSIONS) {
      expect(new Set(grids[d].map((r) => r.length)).size).toBe(1);
      expect(grids[d].join('')).toMatch(/^[#=b.]+$/);
    }
    expect(grids.forgotten.length).toBe(grids.awakening.length);
    expect(grids.forgotten[0].length).toBe(grids.awakening[0].length);
  });

  it('has exactly three fragments with unique ids, in free space in both worlds', () => {
    expect(fragments).toHaveLength(3);
    expect(new Set(fragments.map((f) => f.id)).size).toBe(3);
    for (const f of fragments) {
      for (const d of DIMENSIONS) expect(isSolidChar(cell(d, f.col, f.row)), f.id).toBe(false);
    }
  });

  it('has at least one fragment that needs a specific world', () => {
    expect(fragments.some((f) => f.dimension !== undefined)).toBe(true);
  });

  it('puts every checkpoint on solid ground in both worlds with room above', () => {
    expect(checkpoints.length).toBeGreaterThanOrEqual(1);
    expect(new Set(checkpoints.map((c) => c.id)).size).toBe(checkpoints.length);
    for (const c of checkpoints) {
      for (const d of DIMENSIONS) {
        expect(isSolidChar(cell(d, c.col, c.row + 1)), `${c.id} ground`).toBe(true);
        for (let r = 1; r <= 3; r++) expect(isSolidChar(cell(d, c.col, c.row + 1 - r)), c.id).toBe(false);
      }
    }
  });

  it('places the portal on ground with clear space in both worlds', () => {
    expect(portal).toBeDefined();
    for (const d of DIMENSIONS) {
      for (const col of [portal!.col, portal!.col + 1]) {
        expect(isSolidChar(cell(d, col, portal!.row + 1)), 'portal ground').toBe(true);
        for (let r = 0; r < 3; r++) expect(isSolidChar(cell(d, col, portal!.row - r))).toBe(false);
      }
    }
  });

  it('has an energy bridge that exists only in Awakening over a gap', () => {
    const bridgeCols = [...grids.awakening[15]].flatMap((ch, c) => (ch === 'b' ? [c] : []));
    expect(bridgeCols.length).toBeGreaterThan(0);
    for (const c of bridgeCols) {
      expect(grids.forgotten[15][c]).toBe('.');
      expect(grids.forgotten[16][c]).toBe('.');
    }
  });

  it('lets the player spawn safely in both worlds', () => {
    const body = {
      x: spawn.col * TILE_SIZE + TILE_SIZE / 2 - 5,
      y: spawn.row * TILE_SIZE - 20,
      width: 10,
      height: 20,
    };
    for (const d of DIMENSIONS) expect(canOccupy(grids[d], body, TILE_SIZE, 0.5)).toBe(true);
  });
});
