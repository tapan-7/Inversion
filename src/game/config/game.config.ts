import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MOVE } from './game.constants';
import { computeLayout } from '../systems/scale';
import { PALETTE, hex } from '../world/Palette';
import { BootScene } from '../scenes/BootScene';
import { ChaptersScene } from '../scenes/ChaptersScene';
import { CompleteScene } from '../scenes/CompleteScene';
import { EndingScene } from '../scenes/EndingScene';
import { LevelScene } from '../scenes/LevelScene';
import { MenuScene } from '../scenes/MenuScene';
import { PauseScene } from '../scenes/PauseScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { HowToPlayScene } from '../scenes/HowToPlayScene';
import { UIScene } from '../scenes/UIScene';

export function createGameConfig(parent: string | HTMLElement = 'game'): Phaser.Types.Core.GameConfig {
  const isBrowser = typeof window !== 'undefined';
  const layout = isBrowser
    ? computeLayout(window.innerWidth, window.innerHeight)
    : { width: GAME_WIDTH, zoom: 1 };

  return {
    type: Phaser.AUTO,
    parent,
    width: layout.width,
    height: GAME_HEIGHT,
    backgroundColor: hex(PALETTE.deepNavy),
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    disableContextMenu: true,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      zoom: layout.zoom,
    },
    input: {
      activePointers: 4,
      touch: { capture: true },
    },
    audio: {
      noAudio: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: MOVE.gravity },
        debug: false,
      },
    },
    scene: [
      BootScene,
      PreloadScene,
      MenuScene,
      LevelScene,
      UIScene,
      CompleteScene,
      PauseScene,
      SettingsScene,
      HowToPlayScene,
      EndingScene,
      ChaptersScene,
    ],
  };
}

export const gameConfig = typeof window !== 'undefined'
  ? createGameConfig('game')
  : ({} as unknown as Phaser.Types.Core.GameConfig);

