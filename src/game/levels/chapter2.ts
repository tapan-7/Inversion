import { GridPair } from './builder';
import type { LevelConfig } from './types';

const WIDTH = 120;
const HEIGHT = 17;
const GROUND = 15;

function build() {
  const g = new GridPair(WIDTH, HEIGHT);
  g.both(0, GROUND, WIDTH - 1, HEIGHT - 1, '#');
  g.both(0, 0, 0, HEIGHT - 1, '#');
  g.both(WIDTH - 1, 0, WIDTH - 1, HEIGHT - 1, '#');

  // 1. A wide pit crossed on platforms that alternate between the worlds.
  g.both(15, GROUND, 34, HEIGHT - 1, '.');
  g.only('forgotten', 17, 13, 18, 13, '=');
  g.only('awakening', 21, 12, 22, 12, '=');
  g.only('forgotten', 25, 13, 26, 13, '=');
  g.only('awakening', 29, 12, 30, 12, '=');
  g.only('forgotten', 33, 13, 34, 13, '=');

  // 2. A staircase of alternating steps up to a high ledge: a side trip for an echo.
  g.only('forgotten', 38, 14, 39, 14, '=');
  g.only('awakening', 42, 13, 43, 13, '=');
  g.only('forgotten', 46, 12, 47, 12, '=');
  g.only('awakening', 50, 11, 51, 11, '=');
  g.only('forgotten', 54, 10, 55, 10, '=');
  g.both(58, 10, 62, 10, '=');

  // 3. Two walls from opposite worlds with a short gap between them.
  g.only('awakening', 65, 9, 66, 14, '#');
  g.only('forgotten', 71, 9, 72, 14, '#');

  // 4. A floor that changes world underfoot. Switch where two floors overlap.
  g.both(76, GROUND, 95, HEIGHT - 1, '.');
  g.only('awakening', 76, GROUND, 81, GROUND, 'b');
  g.only('forgotten', 80, GROUND, 85, GROUND, '#');
  g.only('awakening', 84, GROUND, 89, GROUND, 'b');
  g.only('forgotten', 88, GROUND, 93, GROUND, '#');
  g.only('awakening', 92, GROUND, 95, GROUND, 'b');

  return g.rows();
}

export const CHAPTER_2: LevelConfig = {
  id: 'chapter2',
  name: 'Alternating Stairs',
  chapter: 2,
  grids: build(),
  spawn: { col: 3, row: GROUND },
  startDimension: 'forgotten',
  persistent: true,
  next: 'chapter3',
  fragments: [
    { id: 'ch2-f1', col: 21, row: 10, dimension: 'awakening' },
    { id: 'ch2-f2', col: 60, row: 8 },
    { id: 'ch2-f3', col: 83, row: 12 },
  ],
  checkpoints: [
    { id: 'ch2-c1', col: 37, row: 14 },
    { id: 'ch2-c2', col: 98, row: 14 },
  ],
  portal: { col: 110, row: 14 },
  intro: [{ text: 'EACH STEP BELONGS TO ONE WORLD' }],
  tips: [
    {
      id: 'ch2-alternate',
      text: 'SWITCH MID-JUMP TO LAND ON THE OTHER WORLD',
      fromCol: 11,
      toCol: 14,
      dismiss: 'time',
      seconds: 6,
    },
    {
      id: 'ch2-floor',
      text: 'SWITCH WHERE TWO FLOORS OVERLAP',
      fromCol: 73,
      toCol: 75,
      dismiss: 'time',
      seconds: 6,
    },
  ],
  hints: [
    { col: 40, row: 6, text: 'THE HIGH LEDGE HOLDS AN ECHO' },
    { col: 66, row: 6, text: 'SWITCH IN THE GAP BETWEEN THE WALLS' },
    { col: 98, row: 8, text: 'THE PORTAL WAKES WHEN ALL ECHOES ARE FOUND' },
  ],
};
