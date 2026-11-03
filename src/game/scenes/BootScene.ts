import Phaser from 'phaser';
import { SCENE } from '../constants';

/** First scene: environment setup, then hand off to preloading. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.Boot);
  }

  create(): void {
    // Prevent the browser context menu from interrupting long presses on touch devices.
    this.game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.scene.start(SCENE.Preload);
  }
}
