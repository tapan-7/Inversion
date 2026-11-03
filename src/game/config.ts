import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MOVE } from './constants';
import { PALETTE, hex } from './world/Palette';
import { BootScene } from './scenes/BootScene';
import { ChaptersScene } from './scenes/ChaptersScene';
import { CompleteScene } from './scenes/CompleteScene';
import { EndingScene } from './scenes/EndingScene';
import { LevelScene } from './scenes/LevelScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { UIScene } from './scenes/UIScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: hex(PALETTE.deepNavy),
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  disableContextMenu: true,
  scale: {
    // Zoom is driven by installResponsiveScaling so integer scales can be preferred.
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    zoom: 1,
  },
  input: {
    activePointers: 4,
    touch: { capture: true },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: MOVE.gravity },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MenuScene, LevelScene, UIScene, CompleteScene, PauseScene, SettingsScene, EndingScene, ChaptersScene],
};
