import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import type { WatcherConfig } from '../levels/types';
import { stepPatrol, type PatrolState } from '../systems/patrol';
import type { Rect } from '../world/dimensionMath';
import { PALETTE } from '../world/Palette';
import { TEXTURE, WATCHER_FRAME } from '../world/PixelArt';

const DEFAULT_SPEED = 26;
const PAUSE_SECONDS = 0.9;
/** Pixels the hit box is pulled in from the sprite, so a graze is not fatal. */
const HIT_INSET = { x: 3, y: 2 };
/** Extra margin around the Watcher that blocks a switch into its world. */
const SWITCH_MARGIN = 8;

/**
 * A Watcher. It exists only in Awakening: it is drawn and dangerous there, and
 * absent in Forgotten. It walks a fixed beat and pauses at each end.
 */
export class Watcher {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly eyeGlow: Phaser.GameObjects.Image;
  private state: PatrolState;
  private readonly minX: number;
  private readonly maxX: number;
  private readonly feetY: number;
  private readonly speed: number;

  constructor(
    scene: Phaser.Scene,
    readonly config: WatcherConfig,
  ) {
    this.minX = config.minCol * TILE_SIZE + TILE_SIZE / 2;
    this.maxX = config.maxCol * TILE_SIZE + TILE_SIZE / 2;
    this.feetY = (config.row + 1) * TILE_SIZE;
    this.speed = config.speed ?? DEFAULT_SPEED;
    this.state = { x: this.minX, dir: 1, pause: 0 };

    this.sprite = scene.add
      .sprite(this.minX, this.feetY, TEXTURE.watcher, 'w-idle')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.objects);
    this.eyeGlow = scene.add
      .image(this.minX, this.feetY - 14, TEXTURE.halo)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff2b3d)
      .setScale(0.55)
      .setAlpha(0.8)
      .setDepth(DEPTH.objects + 0.1);
    scene.tweens.add({
      targets: this.eyeGlow,
      alpha: { from: 0.45, to: 0.95 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Both display objects, for adding to the Awakening stack. */
  get displayObjects(): Phaser.GameObjects.GameObject[] {
    return [this.sprite, this.eyeGlow];
  }

  reset(): void {
    this.state = { x: this.minX, dir: 1, pause: 0 };
    this.sprite.setPosition(this.minX, this.feetY);
    this.sprite.setFlipX(false);
    this.sprite.play('w-idle', true);
    this.eyeGlow.setPosition(this.minX, this.feetY - 14);
  }

  get x(): number {
    return this.state.x;
  }

  update(deltaMs: number): void {
    const before = this.state;
    this.state = stepPatrol(this.state, this.minX, this.maxX, this.speed, PAUSE_SECONDS, deltaMs / 1000);
    const moving = this.state.pause === 0 && this.state.x !== before.x;

    this.sprite.setX(this.state.x).setFlipX(this.state.dir > 0);
    // The sprite looks left, so it faces its walking direction by flipping when going right.
    if (moving) this.sprite.play('watcher-walk', true);
    else {
      this.sprite.anims.stop();
      this.sprite.setFrame('w-idle');
    }
    this.eyeGlow.setPosition(this.state.x + (this.state.dir > 0 ? 3 : -3), this.feetY - 14);
  }

  /** What touches the player. Slightly smaller than the sprite. */
  get hitBox(): Rect {
    return {
      x: this.state.x - WATCHER_FRAME.width / 2 + HIT_INSET.x,
      y: this.feetY - WATCHER_FRAME.height + HIT_INSET.y,
      width: WATCHER_FRAME.width - HIT_INSET.x * 2,
      height: WATCHER_FRAME.height - HIT_INSET.y,
    };
  }

  /** Area that must be clear of the player for a switch into Awakening to be allowed. */
  get switchBlock(): Rect {
    const h = this.hitBox;
    return {
      x: h.x - SWITCH_MARGIN,
      y: h.y - SWITCH_MARGIN,
      width: h.width + SWITCH_MARGIN * 2,
      height: h.height + SWITCH_MARGIN,
    };
  }

  /** Brief flash used when the Watcher catches the player. */
  flash(): void {
    this.sprite.setTintFill(PALETTE.white);
    this.sprite.scene.time.delayedCall(90, () => this.sprite.clearTint());
  }
}
