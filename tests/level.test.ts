import { describe, expect, it } from 'vitest';
import { TEST_LEVEL } from '../src/game/levels/testLevel';
import { tileIndexFor } from '../src/game/world/LevelLoader';
import { TILE } from '../src/game/world/PixelArt';

const { rows, spawn } = TEST_LEVEL;

describe('test level data', () => {
  it('is a rectangular grid of known characters', () => {
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
    expect(rows.join('')).toMatch(/^[#=.]+$/);
  });

  it('spawns on solid ground with clear space above', () => {
    expect(rows[spawn.row][spawn.col]).toBe('#');
    for (let r = 1; r <= 3; r++) expect(rows[spawn.row - r][spawn.col]).toBe('.');
  });

  it('is enclosed by walls on the left and right', () => {
    for (const row of rows) {
      expect(row[0]).toBe('#');
      expect(row[row.length - 1]).toBe('#');
    }
  });
});

describe('level headroom', () => {
  it('keeps at least 2 free tiles (32px) above every walkable ground cell', () => {
    // A ledge directly over walkable ground must leave room for the 20px player.
    const GROUND_ROW = 15;
    for (let col = 1; col < rows[0].length - 1; col++) {
      if (rows[GROUND_ROW][col] !== '#') continue;
      let top = GROUND_ROW;
      while (top > 0 && rows[top - 1][col] === '.') top--;
      const ceiling = top > 0 ? rows[top - 1][col] : null;
      if (ceiling === '=') {
        // Count free tiles between the ledge and the ground.
        expect(GROUND_ROW - top, `ledge too low at column ${col}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('tileIndexFor', () => {
  it('picks the right tile kinds', () => {
    const ground = rows.findIndex((r) => r[3] === '#');
    expect(tileIndexFor(rows, ground, 3)).toBe(TILE.top);
    expect(tileIndexFor(rows, 0, 3)).toBe(-1);
    expect(tileIndexFor(rows, 11, 19)).toBe(TILE.ledge);
  });
});
