import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import type { CrystalConfig } from '../levels/types';
import type { Dimension } from '../world/dimensionMath';
import { SEQUENCE_COLORS } from '../world/Palette';
import { TEXTURE } from '../world/PixelArt';

const SIZE = { width: 12, height: 18 };
const GHOST_ALPHA = 0.22;
const DIM_ALPHA = 0.72;

/** One crystal of the ordered puzzle. Dark until lit, and it may answer in one world only. */
export class SequenceCrystal extends Phaser.GameObjects.Image {
  private readonly halo: Phaser.GameObjects.Image;
  private lit = false;
  private available = true;
  private readonly baseY: number;

  constructor(
    scene: Phaser.Scene,
    readonly index: number,
    readonly config: CrystalConfig,
  ) {
    const x = config.col * TILE_SIZE + TILE_SIZE / 2;
    const y = config.row * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y, TEXTURE.seqCrystal);
    scene.add.existing(this);
    this.baseY = y;
    const color = SEQUENCE_COLORS[config.color];
    this.setTint(color).setDepth(DEPTH.pickups);

    this.halo = scene.add
      .image(x, y, TEXTURE.halo)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setScale(1.2)
      .setDepth(DEPTH.pickups - 1);

    scene.tweens.add({
      targets: [this, this.halo],
      y: y - 2,
      duration: 1300 + index * 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.applyLit();
  }

  get bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - SIZE.width / 2, this.baseY - SIZE.height / 2, SIZE.width, SIZE.height);
  }

  /** Whether the player's touch counts right now. */
  get canTouch(): boolean {
    return this.available;
  }

  /** Display objects, for adding to a dimension stack when the crystal is world-locked. */
  get displayObjects(): Phaser.GameObjects.GameObject[] {
    return [this, this.halo];
  }

  applyDimension(dimension: Dimension): void {
    this.available = !this.config.dimension || this.config.dimension === dimension;
    this.applyLit();
  }

  setLit(lit: boolean): void {
    this.lit = lit;
    this.applyLit();
    if (lit) {
      this.scene.tweens.add({ targets: this, scale: { from: 1.6, to: 1 }, duration: 260, ease: 'Back.Out' });
    }
  }

  private applyLit(): void {
    if (!this.available) {
      this.setAlpha(GHOST_ALPHA);
      this.halo.setVisible(false);
      return;
    }
    this.setAlpha(this.lit ? 1 : DIM_ALPHA);
    this.halo.setVisible(true).setAlpha(this.lit ? 0.95 : 0.22);
  }

  /** A short red shudder when the wrong crystal was touched. */
  flashWrong(): void {
    this.setTintFill(0xff5577);
    this.scene.time.delayedCall(120, () => this.setTint(SEQUENCE_COLORS[this.config.color]));
  }
}
