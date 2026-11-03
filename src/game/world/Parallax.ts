import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { TEXTURE } from './PixelArt';

interface Layer {
  sprite: Phaser.GameObjects.TileSprite;
  factor: number;
  drift: number;
}

/** Screen-locked tiling layers that scroll slower than the camera. */
export class Parallax {
  private readonly layers: Layer[] = [];
  private driftTime = 0;

  constructor(scene: Phaser.Scene) {
    this.add(scene, TEXTURE.bgSky, 0, 0, DEPTH.background);
    this.add(scene, TEXTURE.bgFar, 0.12, 0, DEPTH.background + 1);
    this.add(scene, TEXTURE.bgNear, 0.32, 0, DEPTH.background + 2);
  }

  private add(scene: Phaser.Scene, key: string, factor: number, drift: number, depth: number): void {
    const sprite = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth);
    this.layers.push({ sprite, factor, drift });
  }

  /** Call every frame. Pass a constant scroll for menus with no camera. */
  update(scrollX: number, deltaMs = 0): void {
    this.driftTime += deltaMs / 1000;
    for (const layer of this.layers) {
      layer.sprite.tilePositionX = Math.floor(scrollX * layer.factor + this.driftTime * layer.drift);
    }
  }
}
