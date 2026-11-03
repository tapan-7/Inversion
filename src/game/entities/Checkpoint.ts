import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import type { CheckpointConfig } from '../levels/types';
import { TEXTURE } from '../world/PixelArt';

/** A pylon that remembers where to respawn. Dormant until the player touches it. */
export class Checkpoint extends Phaser.GameObjects.Image {
  active_ = false;

  constructor(
    scene: Phaser.Scene,
    readonly config: CheckpointConfig,
  ) {
    super(scene, 0, 0, TEXTURE.checkpointOff);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(DEPTH.objects).setPosition(this.feet.x, this.feet.y);
  }

  /** Where the player's feet go when respawning here. */
  get feet(): { x: number; y: number } {
    return {
      x: this.config.col * TILE_SIZE + TILE_SIZE / 2,
      y: (this.config.row + 1) * TILE_SIZE,
    };
  }

  get bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 12, this.y - 40, 24, 40);
  }

  /** Lights the pylon. Pass `silent` when restoring a saved run. */
  light(silent = false): void {
    if (this.active_) return;
    this.active_ = true;
    this.setTexture(TEXTURE.checkpointOn);
    if (silent) return;

    this.scene.tweens.add({
      targets: this,
      scaleY: { from: 1.12, to: 1 },
      duration: 220,
      ease: 'Back.Out',
    });
  }
}
