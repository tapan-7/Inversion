import type { LevelConfig } from './types';

const WIDTH = 100;
const HEIGHT = 17;

type Grid = string[][];

const blank = (): Grid => Array.from({ length: HEIGHT }, () => Array<string>(WIDTH).fill('.'));

function paint(grid: Grid, c0: number, r0: number, c1: number, r1: number, ch: string): void {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = ch;
}

function build(): LevelConfig['grids'] {
  const forgotten = blank();
  const awakening = blank();
  const both = (c0: number, r0: number, c1: number, r1: number, ch: string) => {
    paint(forgotten, c0, r0, c1, r1, ch);
    paint(awakening, c0, r0, c1, r1, ch);
  };
  const onlyForgotten = (c0: number, r0: number, c1: number, r1: number, ch: string) =>
    paint(forgotten, c0, r0, c1, r1, ch);
  const onlyAwakening = (c0: number, r0: number, c1: number, r1: number, ch: string) =>
    paint(awakening, c0, r0, c1, r1, ch);

  // Shared ground and outer walls.
  both(0, 15, WIDTH - 1, HEIGHT - 1, '#');
  both(0, 0, 0, HEIGHT - 1, '#');
  both(WIDTH - 1, 0, WIDTH - 1, HEIGHT - 1, '#');

  // 1. A wall that exists only in the Forgotten world: pass through it in Awakening.
  onlyForgotten(12, 10, 13, 14, '#');

  // 2. Alternating platforms over a wide pit. Switch while airborne.
  both(22, 15, 35, HEIGHT - 1, '.');
  onlyForgotten(24, 13, 25, 13, '=');
  onlyAwakening(28, 12, 29, 12, '=');
  onlyForgotten(32, 13, 33, 13, '=');

  // 3. A pillar that exists only in Awakening. Switching while standing inside it is refused.
  onlyAwakening(42, 11, 43, 14, '#');

  // 4. Another Forgotten-only wall, then a bridge that exists only in Awakening.
  onlyForgotten(50, 9, 51, 14, '#');
  both(56, 15, 60, HEIGHT - 1, '.');
  onlyAwakening(56, 15, 60, 15, '=');

  // 5. An Awakening-only wall: switch back to Forgotten to pass.
  onlyAwakening(66, 10, 67, 14, '#');

  // 6. Alternating stepping stones over a second pit.
  both(72, 15, 79, HEIGHT - 1, '.');
  onlyForgotten(73, 13, 74, 13, '=');
  onlyAwakening(77, 12, 78, 12, '=');

  // 7. Final climb in both worlds.
  both(84, 14, 85, 14, '#');
  both(86, 13, 87, 14, '#');
  both(90, 12, 91, 14, '#');
  both(94, 10, 95, 14, '#');
  both(97, 9, 98, 14, '#');

  return {
    forgotten: forgotten.map((row) => row.join('')),
    awakening: awakening.map((row) => row.join('')),
  };
}

export const TEST_LEVEL: LevelConfig = {
  id: 'test-ruins',
  name: 'Switch Test',
  chapter: 0,
  grids: build(),
  spawn: { col: 3, row: 15 },
  startDimension: 'forgotten',
  hints: [
    { col: 2, row: 11, text: 'SOME WALLS EXIST IN ONE WORLD ONLY' },
    { col: 2, row: 12, text: 'SPACE SWITCHES WORLDS', touchText: 'TAP THE SWITCH BUTTON' },
    { col: 16, row: 9, text: 'SWITCH WHILE IN THE AIR' },
    { col: 37, row: 8, text: 'YOU CANNOT SWITCH INSIDE A WALL' },
  ],
};
