import { GridPair } from './builder';
import type { LevelConfig } from './types';

const WIDTH = 120;
const HEIGHT = 17;
const GROUND = 15;
/** Row a standing character occupies on the ground. */
const FLOOR = GROUND - 1;

function build() {
  const g = new GridPair(WIDTH, HEIGHT);
  g.both(0, GROUND, WIDTH - 1, HEIGHT - 1, '#');
  g.both(0, 0, 0, HEIGHT - 1, '#');
  g.both(WIDTH - 1, 0, WIDTH - 1, HEIGHT - 1, '#');

  // 1. An Awakening-only ledge above the first Watcher's beat.
  g.only('awakening', 28, 12, 31, 12, '=');

  // 2. A gap that only the energy bridge crosses, so the crossing is made in Awakening.
  g.both(40, GROUND, 49, HEIGHT - 1, '.');
  g.only('awakening', 40, GROUND, 49, GROUND, 'b');

  // 3. A low tunnel. Walk it in Forgotten, where nothing lives. A ledge leads up to its roof.
  g.both(58, 12, 59, 12, '=');
  g.both(62, 11, 90, 11, '#');

  // 4. A Forgotten-only wall closes the tunnel: pass it in Awakening, well clear of the Watcher.
  g.only('forgotten', 91, 9, 92, 14, '#');

  // 5. An Awakening-only ledge above the last Watcher's beat.
  g.only('awakening', 98, 12, 101, 12, '=');

  return g.rows();
}

export const CHAPTER_3: LevelConfig = {
  id: 'chapter3',
  name: 'The Watcher',
  chapter: 3,
  grids: build(),
  spawn: { col: 3, row: GROUND },
  startDimension: 'forgotten',
  persistent: true,
  next: 'chapter4',
  fragments: [
    { id: 'ch3-f1', col: 29, row: 10 },
    { id: 'ch3-f2', col: 76, row: 9 },
    { id: 'ch3-f3', col: 99, row: 10 },
  ],
  checkpoints: [
    { id: 'ch3-c1', col: 20, row: FLOOR },
    { id: 'ch3-c2', col: 93, row: FLOOR },
  ],
  watchers: [
    { id: 'ch3-w1', row: FLOOR, minCol: 24, maxCol: 36 },
    { id: 'ch3-w2', row: FLOOR, minCol: 53, maxCol: 60 },
    { id: 'ch3-w3', row: FLOOR, minCol: 66, maxCol: 86 },
    { id: 'ch3-w4', row: FLOOR, minCol: 96, maxCol: 104 },
  ],
  portal: { col: 110, row: FLOOR },
  tips: [
    {
      id: 'ch3-watcher',
      text: 'THE WATCHER LIVES ONLY IN AWAKENING',
      fromCol: 14,
      toCol: 19,
      dismiss: 'time',
      seconds: 7,
    },
    {
      id: 'ch3-refuse',
      text: 'YOU CANNOT SWITCH INTO A WATCHER',
      fromCol: 38,
      toCol: 39,
      dismiss: 'time',
      seconds: 6,
    },
  ],
  hints: [
    { col: 3, row: 8, text: 'WATCHERS HUNT ONLY WHERE THE WORLD IS AWAKE' },
    { col: 26, row: 7, text: 'STAY ABOVE ITS REACH' },
    { col: 52, row: 9, text: 'CROSS, THEN SLIP BACK TO FORGOTTEN' },
    { col: 64, row: 7, text: 'THE TUNNEL IS SAFE IN FORGOTTEN' },
    { col: 93, row: 6, text: 'THE PORTAL WAKES WHEN ALL ECHOES ARE FOUND' },
  ],
};
