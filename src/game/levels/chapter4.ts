import { GridPair } from './builder';
import type { LevelConfig } from './types';

const WIDTH = 120;
const HEIGHT = 17;
const GROUND = 15;
const FLOOR = GROUND - 1;

function build() {
  const g = new GridPair(WIDTH, HEIGHT);
  g.both(0, GROUND, WIDTH - 1, HEIGHT - 1, '#');
  g.both(0, 0, 0, HEIGHT - 1, '#');
  g.both(WIDTH - 1, 0, WIDTH - 1, HEIGHT - 1, '#');

  // The echo chamber: a flat floor with three climbs to the crystals.
  // A ledge that only exists in Awakening holds the magenta crystal.
  g.only('awakening', 34, 12, 36, 12, '=');

  // Steps to a Forgotten-only ledge for the violet crystal.
  g.both(42, 14, 42, 14, '#');
  g.both(44, 12, 45, 12, '=');
  g.only('forgotten', 46, 11, 48, 11, '=');

  // Steps to the high ledge for the white crystal.
  g.both(52, 14, 52, 14, '#');
  g.both(54, 12, 55, 12, '=');
  g.both(57, 10, 58, 10, '=');

  // Beyond the gate: a pit crossed on alternating platforms with spikes below.
  g.both(74, GROUND, 91, HEIGHT - 1, '.');
  g.both(74, HEIGHT - 1, 91, HEIGHT - 1, '^');
  g.only('forgotten', 76, 13, 77, 13, '=');
  g.only('awakening', 80, 12, 81, 12, '=');
  g.only('forgotten', 84, 13, 85, 13, '=');
  g.only('awakening', 88, 12, 89, 12, '=');

  // A final ledge for the last echo.
  g.only('awakening', 98, 12, 101, 12, '=');

  return g.rows();
}

export const CHAPTER_4: LevelConfig = {
  id: 'chapter4',
  name: 'The Echo Sequence',
  chapter: 4,
  grids: build(),
  spawn: { col: 3, row: GROUND },
  startDimension: 'forgotten',
  persistent: true,
  next: 'chapter5',
  fragments: [
    { id: 'ch4-f1', col: 55, row: 10 },
    { id: 'ch4-f2', col: 70, row: 12 },
    { id: 'ch4-f3', col: 99, row: 10 },
  ],
  checkpoints: [
    { id: 'ch4-c1', col: 72, row: FLOOR },
    { id: 'ch4-c2', col: 93, row: FLOOR },
  ],
  sequence: {
    crystals: [
      { col: 24, row: FLOOR, color: 0 },
      { col: 35, row: 11, color: 1, dimension: 'awakening' },
      { col: 47, row: 10, color: 2, dimension: 'forgotten' },
      { col: 58, row: 9, color: 3 },
    ],
    // Violet, cyan, white, magenta.
    order: [2, 0, 3, 1],
    gate: { col: 66, row: 9, width: 2, height: 6 },
    shrines: [
      { col: 6, row: 11 },
      { col: 62, row: 11 },
    ],
  },
  portal: { col: 110, row: FLOOR },
  intro: [{ text: 'TOUCH THE CRYSTALS IN THE SHRINE ORDER' }, { text: 'A WRONG ONE DARKENS THEM ALL' }],
  tips: [
    {
      id: 'ch4-shrine',
      text: 'THE SHRINE SHOWS THE ORDER OF THE CRYSTALS',
      fromCol: 4,
      toCol: 9,
      dismiss: 'time',
      seconds: 7,
    },
    {
      id: 'ch4-wrong',
      text: 'A WRONG CRYSTAL DARKENS THEM ALL',
      fromCol: 20,
      toCol: 23,
      dismiss: 'time',
      seconds: 6,
    },
  ],
  hints: [
    { col: 28, row: 8, text: 'SOME CRYSTALS ANSWER IN ONE WORLD ONLY' },
    { col: 98, row: 8, text: 'THE PORTAL WAKES WHEN ALL ECHOES ARE FOUND' },
  ],
};
