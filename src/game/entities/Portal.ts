import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import type { PortalConfig } from '../levels/types';
import { PALETTE } from '../world/Palette';
import { TEXTURE } from '../world/PixelArt';

/** The exit gate. Dark and inert until every Echo Fragment is found. */
export class Portal {
  readonly arch: Phaser.GameObjects.Image;
  private readonly core: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private unlocked = false;

  constructor(
    private readonly scene: Phaser.Scene,
    config: PortalConfig,
  ) {
    const x = (config.col + 1) * TILE_SIZE;
    const feetY = (config.row + 1) * TILE_SIZE;

    this.glow = scene.add
      .image(x, feetY - 22, TEXTURE.halo)
      .setScale(2.4)
      .setDepth(DEPTH.objects - 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PALETTE.cyanAccent);
    this.core = scene.add.image(x, feetY - 21, TEXTURE.portalCore).setDepth(DEPTH.objects);
    this.arch = scene.add.image(x, feetY, TEXTURE.portalArch).setOrigin(0.5, 1).setDepth(DEPTH.objects + 0.1);
    this.applyLocked();
  }

  get x(): number {
    return this.arch.x;
  }

  get top(): number {
    return this.arch.y - this.arch.height;
  }

  get bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.arch.x - 10, this.arch.y - 40, 20, 40);
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  private applyLocked(): void {
    this.core.setTint(PALETTE.stoneMid).setAlpha(0.45);
    this.glow.setVisible(false);
    this.arch.setAlpha(0.85);
  }

  /** Wakes the portal. Pass `silent` when the level opens with every fragment already found. */
  unlock(silent = false): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.arch.setAlpha(1);
    this.core.setTint(PALETTE.cyanAccent).setAlpha(0.9);
    this.glow.setVisible(true);

    this.scene.tweens.add({
      targets: this.core,
      alpha: { from: 0.65, to: 1 },
      scaleX: { from: 0.92, to: 1.05 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.5, to: 0.95 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.scene.add
      .particles(this.arch.x, this.arch.y - 8, TEXTURE.pixel, {
        x: { min: -8, max: 8 },
        speedY: { min: -26, max: -8 },
        speedX: { min: -5, max: 5 },
        lifespan: { min: 900, max: 1600 },
        frequency: 140,
        scale: { start: 1, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [PALETTE.cyanAccent, PALETTE.energyGlow, PALETTE.white],
      })
      .setDepth(DEPTH.objects + 1);

    if (!silent) {
      this.scene.cameras.main.flash(260, 120, 230, 240, false);
    }
  }
}
