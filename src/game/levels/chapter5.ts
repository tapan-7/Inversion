import { GridPair } from './builder';
import type { LevelConfig } from './types';

const WIDTH = 132;
const HEIGHT = 17;
const GROUND = 15;
const FLOOR = GROUND - 1;

function build() {
  const g = new GridPair(WIDTH, HEIGHT);
  g.both(0, GROUND, WIDTH - 1, HEIGHT - 1, '#');
  g.both(0, 0, 0, HEIGHT - 1, '#');
  g.both(WIDTH - 1, 0, WIDTH - 1, HEIGHT - 1, '#');

  // Part one: a recap of everything learned.
  g.only('forgotten', 12, 10, 13, 14, '#');

  g.both(20, GROUND, 33, HEIGHT - 1, '.');
  g.only('forgotten', 22, 13, 23, 13, '=');
  g.only('awakening', 26, 12, 27, 12, '=');
  g.only('forgotten', 30, 13, 31, 13, '=');

  // A Watcher's beat with an Awakening-only ledge above it.
  g.only('awakening', 42, 12, 45, 12, '=');
  g.only('awakening', 54, 10, 55, 14, '#');

  // An echo on a Forgotten-only ledge.
  g.only('forgotten', 58, 12, 61, 12, '=');

  // Part two: the run. Everything from here to the portal is built to be crossed at speed.
  g.only('forgotten', 82, 10, 83, 14, '#');
  g.only('awakening', 86, 10, 87, 14, '#');

  g.both(92, GROUND, 103, HEIGHT - 1, '.');
  g.only('awakening', 92, GROUND, 97, GROUND, 'b');
  g.only('forgotten', 96, GROUND, 99, GROUND, '#');
  g.only('awakening', 98, GROUND, 103, GROUND, 'b');

  // A plain jump near the end.
  g.both(114, GROUND, 116, HEIGHT - 1, '.');

  return g.rows();
}

export const CHAPTER_5: LevelConfig = {
  id: 'chapter5',
  name: 'The Collapse',
  chapter: 5,
  grids: build(),
  spawn: { col: 3, row: GROUND },
  startDimension: 'forgotten',
  persistent: true,
  final: true,
  fragments: [
    { id: 'ch5-f1', col: 43, row: 10 },
    { id: 'ch5-f2', col: 60, row: 10 },
    { id: 'ch5-f3', col: 68, row: FLOOR },
  ],
  checkpoints: [
    { id: 'ch5-c1', col: 34, row: FLOOR },
    { id: 'ch5-c2', col: 64, row: FLOOR },
  ],
  watchers: [{ id: 'ch5-w1', row: FLOOR, minCol: 38, maxCol: 50 }],
  collapse: { triggerCol: 70, fromCol: 44, toCol: 120, delayMs: 2500, speed: 4 },
  portal: { col: 124, row: FLOOR },
  tips: [
    {
      id: 'ch5-last',
      text: 'THE LAST ECHO WILL BRING THE WORLD DOWN',
      fromCol: 62,
      toCol: 67,
      dismiss: 'time',
      seconds: 6,
    },
  ],
  hints: [
    { col: 3, row: 8, text: 'ALL THREE ECHOES OPEN THE WAY OUT' },
    { col: 60, row: 7, text: 'THE LAST ECHO IS AHEAD' },
  ],
};
