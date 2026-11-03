import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import type { FragmentConfig } from '../levels/types';
import type { Dimension } from '../world/dimensionMath';
import { PALETTE } from '../world/Palette';
import { TEXTURE } from '../world/PixelArt';

const SIZE = { width: 12, height: 16 };
const GHOST_ALPHA = 0.2;

/**
 * An Echo Fragment. One that names a dimension can only be collected while that
 * world is active, and shows as a faint ghost in the other.
 */
export class Fragment extends Phaser.GameObjects.Image {
  private readonly halo: Phaser.GameObjects.Image;
  private available = true;
  collected = false;

  constructor(
    scene: Phaser.Scene,
    readonly config: FragmentConfig,
  ) {
    const x = config.col * TILE_SIZE + TILE_SIZE / 2;
    const y = config.row * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y, TEXTURE.fragment);
    scene.add.existing(this);
    this.setDepth(DEPTH.pickups);

    this.halo = scene.add
      .image(x, y, TEXTURE.halo)
      .setDepth(DEPTH.pickups - 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PALETTE.energyGlow);

    scene.tweens.add({
      targets: [this, this.halo],
      y: y - 3,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    scene.tweens.add({
      targets: this.halo,
      alpha: { from: 0.55, to: 1 },
      scale: { from: 0.9, to: 1.15 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Whether the player can pick this up right now. */
  get canCollect(): boolean {
    return this.available && !this.collected;
  }

  get bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - SIZE.width / 2,
      this.y - SIZE.height / 2,
      SIZE.width,
      SIZE.height,
    );
  }

  applyDimension(dimension: Dimension): void {
    if (this.collected) return;
    this.available = !this.config.dimension || this.config.dimension === dimension;
    this.setAlpha(this.available ? 1 : GHOST_ALPHA);
    this.halo.setVisible(this.available);
  }

  /** Marks the fragment collected with a short pop, then removes it. */
  collect(): void {
    this.collected = true;
    this.scene.tweens.add({
      targets: [this, this.halo],
      scale: 1.9,
      alpha: 0,
      duration: 240,
      ease: 'Quad.Out',
      onComplete: () => this.remove(),
    });
  }

  /** Removes the fragment without effects, used when restoring a saved run. */
  remove(): void {
    this.collected = true;
    this.scene.tweens.killTweensOf([this, this.halo]);
    this.halo.destroy();
    this.destroy();
  }
}
