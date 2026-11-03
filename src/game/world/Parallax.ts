import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { Dimension } from './dimensionMath';
import { DIMENSION_TEXTURES } from './PixelArt';

interface Layer {
  sprite: Phaser.GameObjects.TileSprite;
  factor: number;
  drift: number;
  /** Depth offset inside the stack. */
  offset: number;
}

/** Screen-locked tiling layers that scroll slower than the camera. One set per dimension. */
export class Parallax {
  private readonly layers: Layer[] = [];
  private driftTime = 0;

  constructor(scene: Phaser.Scene, dimension: Dimension = 'forgotten', baseDepth: number = DEPTH.stackBack) {
    const keys = DIMENSION_TEXTURES[dimension];
    this.add(scene, keys.sky, 0, 0, 0);
    this.add(scene, keys.far, 0.12, 0, 1);
    this.add(scene, keys.near, 0.32, 0, 2);
    this.setBaseDepth(baseDepth);
  }

  private add(scene: Phaser.Scene, key: string, factor: number, drift: number, offset: number): void {
    const sprite = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.layers.push({ sprite, factor, drift, offset });
  }

  get objects(): Phaser.GameObjects.GameObject[] {
    return this.layers.map((layer) => layer.sprite);
  }

  setBaseDepth(base: number): void {
    for (const layer of this.layers) layer.sprite.setDepth(base + layer.offset);
  }

  setVisible(visible: boolean): void {
    for (const layer of this.layers) layer.sprite.setVisible(visible);
  }

  setMask(mask: Phaser.Display.Masks.GeometryMask | null): void {
    for (const layer of this.layers) {
      if (mask) layer.sprite.setMask(mask);
      else layer.sprite.clearMask();
    }
  }

  /** Call every frame. Pass a constant scroll for menus with no camera. */
  update(scrollX: number, deltaMs = 0): void {
    this.driftTime += deltaMs / 1000;
    for (const layer of this.layers) {
      layer.sprite.tilePositionX = Math.floor(scrollX * layer.factor + this.driftTime * layer.drift);
    }
  }
}
