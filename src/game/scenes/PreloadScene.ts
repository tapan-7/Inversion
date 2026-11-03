import Phaser from 'phaser';
import { SCENE } from '../constants';
import { createPixelFont } from '../world/PixelFont';
import { generateTextures } from '../world/PixelArt';

/** Builds every texture procedurally, then opens the menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE.Preload);
  }

  create(): void {
    createPixelFont(this);
    generateTextures(this);
    this.scene.start(SCENE.Menu);
  }
}
