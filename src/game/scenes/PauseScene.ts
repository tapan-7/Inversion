import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, SCENE } from '../constants';
import { audio } from '../systems/AudioEngine';
import { resetTouchState } from '../systems/InputController';
import { MenuList } from '../ui/MenuList';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import type { LevelSceneData } from './LevelScene';
import { restartOnResize } from '../ui/relayout';

/** Pause overlay. The level scene is paused underneath and resumed when this closes. */
export class PauseScene extends Phaser.Scene {
  private levelKey: string | undefined;
  private done = false;

  constructor() {
    super(SCENE.Pause);
  }

  init(data: { levelKey?: string }): void {
    this.levelKey = data.levelKey;
    this.done = false;
  }

  create(): void {
    restartOnResize(this);
    resetTouchState();
    const depth = DEPTH.ui + 20;
    const cx = this.scale.width / 2;

    this.add.rectangle(0, 0, this.scale.width, GAME_HEIGHT, PALETTE.deepNavy, 0.78).setOrigin(0, 0).setDepth(depth);
    this.add
      .bitmapText(cx, 52, PIXEL_FONT_KEY, 'PAUSED')
      .setOrigin(0.5)
      .setScale(4)
      .setTint(PALETTE.energyGlow)
      .setDepth(depth + 1);

    new MenuList(
      this,
      [
        { label: () => 'RESUME', onSelect: () => this.resume() },
        { label: () => 'RESTART', onSelect: () => this.restart() },
        { label: () => 'SETTINGS', onSelect: () => this.openSettings() },
        { label: () => 'MAIN MENU', onSelect: () => this.mainMenu() },
      ],
      { y: 104, rowHeight: 30, depth: depth + 1, width: 220 },
    );

    this.add
      .bitmapText(cx, GAME_HEIGHT - 14, PIXEL_FONT_KEY, 'ESC RESUME   M MAIN MENU   R RESTART')
      .setOrigin(0.5)
      .setTint(0x5878ab)
      .setDepth(depth + 1);

    const keyboard = this.input.keyboard;
    const onEsc = () => this.resume();
    const onP = () => this.resume();
    const onM = () => this.mainMenu();
    const onR = () => this.restart();
    keyboard?.on('keydown-ESC', onEsc);
    keyboard?.on('keydown-P', onP);
    keyboard?.on('keydown-M', onM);
    keyboard?.on('keydown-R', onR);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-ESC', onEsc);
      keyboard?.off('keydown-P', onP);
      keyboard?.off('keydown-M', onM);
      keyboard?.off('keydown-R', onR);
    });
  }

  private resume(): void {
    if (this.done) return;
    this.done = true;
    audio.setDuck(false);
    this.scene.stop();
    this.scene.resume(SCENE.Level);
  }

  private restart(): void {
    if (this.done) return;
    this.done = true;
    audio.setDuck(false);
    this.scene.stop();
    this.scene.start(SCENE.Level, { levelId: this.levelKey, resume: false } satisfies LevelSceneData);
  }

  private openSettings(): void {
    this.scene.pause();
    this.scene.launch(SCENE.Settings, { returnTo: SCENE.Pause });
    this.scene.bringToTop(SCENE.Settings);
  }

  private mainMenu(): void {
    if (this.done) return;
    this.done = true;
    audio.setDuck(false);
    this.scene.stop(SCENE.UI);
    this.scene.stop(SCENE.Level);
    this.scene.start(SCENE.Menu);
  }
}
