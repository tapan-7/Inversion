import { describe, expect, it } from 'vitest';
import { TEST_LEVEL } from '../src/game/levels/testLevel';
import { TILE_SIZE } from '../src/game/constants';
import { DIMENSIONS, canOccupy, isSolidChar } from '../src/game/world/dimensionMath';
import { tileIndexFor } from '../src/game/world/LevelLoader';
import { TILE } from '../src/game/world/PixelArt';

const { grids, spawn } = TEST_LEVEL;
const GROUND_ROW = 15;

describe.each(DIMENSIONS)('test level data (%s)', (dimension) => {
  const rows = grids[dimension];

  it('is a rectangular grid of known characters', () => {
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
    expect(rows.join('')).toMatch(/^[#=b.]+$/);
  });

  it('is enclosed by walls on the left and right', () => {
    for (const row of rows) {
      expect(row[0]).toBe('#');
      expect(row[row.length - 1]).toBe('#');
    }
  });

  it('spawns on solid ground with clear space above', () => {
    expect(rows[spawn.row][spawn.col]).toBe('#');
    for (let r = 1; r <= 3; r++) expect(rows[spawn.row - r][spawn.col]).toBe('.');
  });

  it('keeps at least 2 free tiles above walkable ground under any ledge', () => {
    for (let col = 1; col < rows[0].length - 1; col++) {
      if (rows[GROUND_ROW][col] !== '#') continue;
      let top = GROUND_ROW;
      while (top > 0 && rows[top - 1][col] === '.') top--;
      if (top > 0 && rows[top - 1][col] === '=') {
        expect(GROUND_ROW - top, `ledge too low at column ${col}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('both dimensions together', () => {
  it('have identical dimensions', () => {
    expect(grids.forgotten.length).toBe(grids.awakening.length);
    expect(grids.forgotten[0].length).toBe(grids.awakening[0].length);
  });

  it('actually differ, otherwise switching would do nothing', () => {
    expect(grids.forgotten.join('')).not.toBe(grids.awakening.join(''));
  });

  it('share the same outer walls and ground except where pits are cut', () => {
    for (const row of [0, 5, 10]) {
      expect(grids.forgotten[row][0]).toBe(grids.awakening[row][0]);
    }
  });

  it('let the player spawn safely in either dimension', () => {
    const body = {
      x: spawn.col * TILE_SIZE + TILE_SIZE / 2 - 5,
      y: spawn.row * TILE_SIZE - 20,
      width: 10,
      height: 20,
    };
    for (const d of DIMENSIONS) expect(canOccupy(grids[d], body, TILE_SIZE, 0.5)).toBe(true);
  });

  it('place at least one solid that exists in only one dimension', () => {
    let forgottenOnly = 0;
    let awakeningOnly = 0;
    grids.forgotten.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        const other = grids.awakening[r][c];
        if (isSolidChar(ch) && !isSolidChar(other)) forgottenOnly++;
        if (!isSolidChar(ch) && isSolidChar(other)) awakeningOnly++;
      }),
    );
    expect(forgottenOnly).toBeGreaterThan(0);
    expect(awakeningOnly).toBeGreaterThan(0);
  });
});

describe('tileIndexFor', () => {
  it('picks the right tile kinds', () => {
    const rows = grids.forgotten;
    expect(tileIndexFor(rows, GROUND_ROW, 3)).toBe(TILE.top);
    expect(tileIndexFor(rows, 0, 3)).toBe(-1);
    expect(tileIndexFor(grids.forgotten, 13, 24)).toBe(TILE.ledge);
    expect(tileIndexFor(['b'], 0, 0)).toBe(TILE.bridge);
  });
});
