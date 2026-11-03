import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import { PALETTE } from '../world/Palette';
import { TEXTURE } from '../world/PixelArt';

/** A barrier that blocks the player until the crystal sequence is solved. */
export class Gate {
  readonly sprite: Phaser.GameObjects.TileSprite;
  private opened = false;

  constructor(
    private readonly scene: Phaser.Scene,
    rect: { col: number; row: number; width: number; height: number },
  ) {
    this.sprite = scene.add
      .tileSprite(
        rect.col * TILE_SIZE,
        rect.row * TILE_SIZE,
        rect.width * TILE_SIZE,
        rect.height * TILE_SIZE,
        TEXTURE.gate,
      )
      .setOrigin(0, 0)
      .setDepth(DEPTH.objects + 2);
    scene.physics.add.existing(this.sprite, true);
  }

  get body(): Phaser.Physics.Arcade.StaticBody {
    return this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  get isOpen(): boolean {
    return this.opened;
  }

  /** Raises the gate. Pass `instant` when restoring a saved run. */
  open(instant = false): void {
    if (this.opened) return;
    this.opened = true;
    this.body.enable = false;

    if (instant) {
      this.sprite.destroy();
      return;
    }
    const { scene, sprite } = this;
    scene.cameras.main.shake(260, 0.002);
    scene.tweens.add({
      targets: sprite,
      y: sprite.y - sprite.height - 4,
      alpha: 0.2,
      duration: 900,
      ease: 'Cubic.InOut',
      onComplete: () => sprite.destroy(),
    });
    scene.add
      .particles(sprite.x + sprite.width / 2, sprite.y + sprite.height, TEXTURE.pixel, {
        x: { min: -sprite.width / 2, max: sprite.width / 2 },
        speedY: { min: -40, max: -10 },
        speedX: { min: -20, max: 20 },
        lifespan: 700,
        scale: { start: 1.4, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [PALETTE.stoneHighlight, PALETTE.cyanAccent, PALETTE.white],
        emitting: false,
      })
      .setDepth(DEPTH.playerFx)
      .explode(24);
  }
}
