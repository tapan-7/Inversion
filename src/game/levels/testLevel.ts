import type { LevelConfig } from './types';

const WIDTH = 100;
const HEIGHT = 17;

function buildRows(): string[] {
  const grid: string[][] = Array.from({ length: HEIGHT }, () => Array<string>(WIDTH).fill('.'));

  const fill = (c0: number, r0: number, c1: number, r1: number, ch: string) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = ch;
  };

  // Ground and outer walls.
  fill(0, 15, WIDTH - 1, HEIGHT - 1, '#');
  fill(0, 0, 0, HEIGHT - 1, '#');
  fill(WIDTH - 1, 0, WIDTH - 1, HEIGHT - 1, '#');

  // Pits.
  fill(22, 15, 24, HEIGHT - 1, '.');
  fill(47, 15, 50, HEIGHT - 1, '.');
  fill(74, 15, 77, HEIGHT - 1, '.');

  // Opening: a stone staircase up to a floating ledge. Ledges sit at least three
  // tiles above the ground so the player can always walk underneath.
  fill(12, 14, 13, 14, '#');
  fill(15, 13, 16, 14, '#');
  fill(19, 11, 21, 11, '=');

  // Low pillars.
  fill(28, 13, 29, 14, '#');
  fill(33, 12, 34, 14, '#');

  // Stepping stone over the second pit.
  fill(48, 13, 49, 13, '=');

  // Staircase.
  for (let i = 0; i < 4; i++) fill(55 + i, 14 - i, 55 + i, 14, '#');

  // Rising ledges.
  fill(61, 10, 64, 10, '=');
  fill(67, 8, 69, 8, '=');

  // Stepping stone over the third pit.
  fill(75, 13, 76, 13, '=');

  // Final climb: rising stone pillars, one tile higher each time.
  fill(84, 14, 86, 14, '#');
  fill(89, 12, 91, 14, '#');
  fill(94, 10, 96, 14, '#');
  fill(97, 8, 98, 14, '#');

  return grid.map((row) => row.join(''));
}

export const TEST_LEVEL: LevelConfig = {
  id: 'test-ruins',
  name: 'Test Ruins',
  rows: buildRows(),
  spawn: { col: 3, row: 15 },
};
