import { GridPair } from './builder';
import type { LevelConfig } from './types';

const WIDTH = 120;
const HEIGHT = 17;
const GROUND = 15;

function build() {
  const g = new GridPair(WIDTH, HEIGHT);

  // Shared ground and outer walls.
  g.both(0, GROUND, WIDTH - 1, HEIGHT - 1, '#');
  g.both(0, 0, 0, HEIGHT - 1, '#');
  g.both(WIDTH - 1, 0, WIDTH - 1, HEIGHT - 1, '#');

  // 1. Opening: a step and a ledge hold the first fragment. Then a wall that only
  //    exists in Forgotten teaches the switch.
  g.both(6, 14, 7, 14, '#');
  g.both(9, 12, 10, 12, '=');
  g.only('forgotten', 14, 10, 15, 14, '#');

  // 2. A wide pit crossed by platforms that alternate between the worlds.
  g.both(22, GROUND, 35, HEIGHT - 1, '.');
  g.only('forgotten', 24, 13, 25, 13, '=');
  g.only('awakening', 28, 12, 29, 12, '=');
  g.only('forgotten', 32, 13, 33, 13, '=');

  // 3. A pillar that only exists in Awakening. Switching inside it is refused, so
  //    switch after passing it, then go through the Forgotten-only wall.
  g.only('awakening', 42, 11, 43, 14, '#');
  g.only('forgotten', 50, 9, 51, 14, '#');

  // 4. The energy bridge: a gap that can only be crossed in Awakening.
  g.both(56, GROUND, 60, HEIGHT - 1, '.');
  g.only('awakening', 56, GROUND, 60, GROUND, 'b');

  // 5. An Awakening-only wall: switch back to Forgotten before it.
  g.only('awakening', 66, 10, 67, 14, '#');

  // 6. A second alternating crossing.
  g.both(72, GROUND, 79, HEIGHT - 1, '.');
  g.only('forgotten', 73, 13, 74, 13, '=');
  g.only('awakening', 77, 12, 78, 12, '=');

  // 7. The final climb, solid in both worlds, then open ground to the portal.
  g.both(84, 14, 85, 14, '#');
  g.both(86, 13, 87, 14, '#');
  g.both(90, 12, 91, 14, '#');
  g.both(94, 10, 95, 14, '#');
  g.both(97, 9, 98, 14, '#');

  return g.rows();
}

export const CHAPTER_1: LevelConfig = {
  id: 'chapter1',
  name: 'The Forgotten Gate',
  chapter: 1,
  grids: build(),
  spawn: { col: 3, row: GROUND },
  startDimension: 'forgotten',
  persistent: true,
  next: 'chapter2',
  fragments: [
    { id: 'ch1-f1', col: 9, row: 11 },
    { id: 'ch1-f2', col: 28, row: 10, dimension: 'awakening' },
    { id: 'ch1-f3', col: 98, row: 8 },
  ],
  checkpoints: [
    { id: 'ch1-c1', col: 38, row: 14 },
    { id: 'ch1-c2', col: 81, row: 14 },
  ],
  portal: { col: 108, row: 14 },
  intro: [
    { text: 'COLLECT ALL THREE ECHO FRAGMENTS' },
    { text: 'A D OR ARROWS MOVE   W OR Z JUMPS', touchText: 'USE THE ARROW AND JUMP BUTTONS' },
    { text: 'SPACE SWITCHES WORLDS', touchText: 'TAP THE SWITCH BUTTON' },
  ],
  tips: [
    {
      id: 'switch',
      text: 'PRESS SPACE TO SWITCH WORLDS',
      touchText: 'TAP THE SWITCH BUTTON',
      fromCol: 10,
      toCol: 13,
      dismiss: 'switch',
    },
    {
      id: 'air',
      text: 'SWITCH IN MID-AIR TO CROSS THE PIT',
      fromCol: 19,
      toCol: 21,
      dismiss: 'time',
      seconds: 6,
    },
    {
      id: 'bridge',
      text: 'THE BRIDGE ONLY EXISTS IN AWAKENING',
      fromCol: 52,
      toCol: 55,
      dismiss: 'time',
      seconds: 6,
    },
  ],
  hints: [
    { col: 17, row: 9, text: 'SOME WALLS EXIST IN ONE WORLD ONLY' },
    { col: 18, row: 7, text: 'SWITCH WHILE IN THE AIR' },
    { col: 39, row: 7, text: 'YOU CANNOT SWITCH INSIDE A WALL' },
    { col: 52, row: 11, text: 'ENERGY BRIDGES APPEAR IN ONE WORLD' },
    { col: 100, row: 8, text: 'THE PORTAL WAKES WHEN ALL ECHOES ARE FOUND' },
  ],
};
