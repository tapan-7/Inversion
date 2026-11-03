import Phaser from 'phaser';
import {
  DEPTH,
  GAME_EVENT,
  GAME_HEIGHT,
  GAME_WIDTH,
  REGISTRY_DIMENSION,
  SWITCH_DURATION_MS,
  SWITCH_OVERLAP_INSET,
  TILE_SIZE,
} from '../constants';
import type { Player } from '../entities/Player';
import {
  DIMENSIONS,
  otherDimension,
  solidCellsOverlapping,
  type Cell,
  type Dimension,
} from '../world/dimensionMath';
import type { LoadedLevel } from '../world/LevelLoader';
import { PALETTE } from '../world/Palette';
import type { Parallax } from '../world/Parallax';
import { TEXTURE } from '../world/PixelArt';
import { fx } from './effects';

/** Anything that can join a dimension's visual stack. */
export interface StackObject {
  setDepth(depth: number): unknown;
  setVisible(visible: boolean): unknown;
  setMask(mask: Phaser.Display.Masks.GeometryMask): unknown;
  clearMask(): unknown;
}

interface Extra {
  object: StackObject;
  /** Depth above the stack base. */
  offset: number;
  /** World-space objects use the world mask, screen-locked ones the screen mask. */
  space: 'world' | 'screen';
}

export type SwitchResult = 'switched' | 'blocked' | 'busy';

/** Accent colour of each dimension, used by the wave ring, particles and HUD. */
export const DIMENSION_ACCENT: Record<Dimension, number> = {
  forgotten: PALETTE.cyanAccent,
  awakening: PALETTE.energyGlow,
};

/** Larger than the distance from any point on screen to the farthest screen corner. */
const MAX_RADIUS = Math.ceil(Math.hypot(GAME_WIDTH, GAME_HEIGHT)) + 24;

/**
 * Owns the active dimension. Both tile layers and both background stacks always
 * exist. Only the active layer collides, and a switch is refused when the
 * player's box would overlap a solid of the target dimension.
 *
 * The player is never touched on a switch, so position and velocity carry over.
 */
export class DimensionManager {
  private current: Dimension;
  private transitioning = false;

  private readonly colliders: Record<Dimension, Phaser.Physics.Arcade.Collider>;
  /** World-space mask for the tile layer, screen-space mask for the parallax stack. */
  private readonly worldMaskShape: Phaser.GameObjects.Graphics;
  private readonly screenMaskShape: Phaser.GameObjects.Graphics;
  private readonly worldMask: Phaser.Display.Masks.GeometryMask;
  private readonly screenMask: Phaser.Display.Masks.GeometryMask;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly wave = { radius: 0, centerX: 0, centerY: 0, color: 0 as number };
  private waveTween?: Phaser.Tweens.Tween;
  private readonly extras: Record<Dimension, Extra[]> = { forgotten: [], awakening: [] };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LoadedLevel,
    private readonly player: Player,
    private readonly stacks: Record<Dimension, Parallax>,
    startDimension: Dimension,
  ) {
    this.current = startDimension;

    this.colliders = {} as Record<Dimension, Phaser.Physics.Arcade.Collider>;
    for (const dimension of DIMENSIONS) {
      this.colliders[dimension] = scene.physics.add.collider(player, level.layers[dimension]);
    }

    this.worldMaskShape = scene.make.graphics({}, false);
    this.screenMaskShape = scene.make.graphics({}, false).setScrollFactor(0);
    this.worldMask = this.worldMaskShape.createGeometryMask();
    this.screenMask = this.screenMaskShape.createGeometryMask();
    this.ring = scene.add.graphics().setDepth(DEPTH.effects);

    this.applyDimension(startDimension);
    scene.registry.set(REGISTRY_DIMENSION, startDimension);
  }

  get dimension(): Dimension {
    return this.current;
  }

  get isTransitioning(): boolean {
    return this.transitioning;
  }

  /** The solid grid the player currently collides with. */
  get activeGrid(): readonly string[] {
    return this.level.grids[this.current];
  }

  /** Cells of the target dimension that the player's box would overlap. Empty means safe. */
  blockingCells(target: Dimension = otherDimension(this.current)): Cell[] {
    const body = this.player.arcadeBody;
    return solidCellsOverlapping(
      this.level.grids[target],
      { x: body.x, y: body.y, width: body.width, height: body.height },
      TILE_SIZE,
      SWITCH_OVERLAP_INSET,
    );
  }

  /**
   * Adds an object to a dimension's stack. It then shows, hides, reveals through the
   * wave and sorts by depth together with that world's background and tiles.
   */
  addToStack(dimension: Dimension, object: StackObject, offset: number, space: 'world' | 'screen'): void {
    this.extras[dimension].push({ object, offset, space });
    const active = dimension === this.current;
    object.setVisible(active);
    object.setDepth((active ? DEPTH.stackFront : DEPTH.stackBack) + offset);
  }

  private maskExtras(dimension: Dimension, on: boolean): void {
    for (const extra of this.extras[dimension]) {
      if (on) extra.object.setMask(extra.space === 'world' ? this.worldMask : this.screenMask);
      else extra.object.clearMask();
    }
  }

  trySwitch(): SwitchResult {
    if (this.transitioning) return 'busy';
    const target = otherDimension(this.current);
    const blocking = this.blockingCells(target);
    if (blocking.length > 0) {
      this.rejectFeedback(blocking);
      this.scene.game.events.emit(GAME_EVENT.DimensionBlocked, target);
      return 'blocked';
    }
    this.commit(target);
    return 'switched';
  }

  /** Call every frame so the wave stays glued to the player while the camera moves. */
  update(): void {
    if (!this.transitioning) return;
    this.drawWave();
  }

  destroy(): void {
    this.waveTween?.stop();
    for (const dimension of DIMENSIONS) {
      this.stacks[dimension].setMask(null);
      this.level.layers[dimension].clearMask();
      this.maskExtras(dimension, false);
    }
    this.worldMaskShape.destroy();
    this.screenMaskShape.destroy();
    this.ring.destroy();
  }

  /**
   * Jumps straight to a dimension with no wave and no overlap test. Used when
   * respawning, where the destination is known to be safe.
   */
  snapTo(target: Dimension): void {
    this.waveTween?.stop();
    for (const dimension of DIMENSIONS) {
      this.stacks[dimension].setMask(null);
      this.level.layers[dimension].clearMask();
      this.maskExtras(dimension, false);
    }
    this.worldMaskShape.clear();
    this.screenMaskShape.clear();
    this.ring.clear();
    this.transitioning = false;

    const changed = this.current !== target;
    this.current = target;
    this.applyDimension(target);
    this.scene.registry.set(REGISTRY_DIMENSION, target);
    if (changed) this.scene.game.events.emit(GAME_EVENT.DimensionSwitched, target);
  }

  private commit(target: Dimension): void {
    const from = this.current;
    this.current = target;
    this.transitioning = true;
    this.scene.registry.set(REGISTRY_DIMENSION, target);

    // Physics flips at once: the fairness check already proved the player fits.
    this.colliders[from].active = false;
    this.colliders[target].active = true;

    // The incoming stack sits above the outgoing one and is revealed through the wave.
    this.setStackDepth(target, DEPTH.stackFront);
    this.setStackDepth(from, DEPTH.stackBack);
    this.setStackVisible(target, true);
    this.stacks[target].setMask(this.screenMask);
    this.level.layers[target].setMask(this.worldMask);
    this.maskExtras(target, true);

    const body = this.player.arcadeBody;
    this.wave.centerX = body.center.x;
    this.wave.centerY = body.center.y;
    this.wave.radius = 0;
    this.wave.color = DIMENSION_ACCENT[target];

    this.burst(target);
    this.pulse();
    this.drawWave();

    this.waveTween?.stop();
    this.waveTween = this.scene.tweens.add({
      targets: this.wave,
      radius: MAX_RADIUS,
      duration: SWITCH_DURATION_MS,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onUpdate: () => this.drawWave(),
      onComplete: () => this.finishTransition(from, target),
    });

    this.scene.game.events.emit(GAME_EVENT.DimensionSwitched, target);
  }

  private finishTransition(from: Dimension, target: Dimension): void {
    this.stacks[target].setMask(null);
    this.level.layers[target].clearMask();
    this.maskExtras(target, false);
    this.setStackVisible(from, false);
    this.worldMaskShape.clear();
    this.screenMaskShape.clear();
    this.ring.clear();
    this.transitioning = false;
  }

  /** Shows one dimension and hides the other, with no transition. */
  private applyDimension(dimension: Dimension): void {
    for (const d of DIMENSIONS) {
      this.setStackVisible(d, d === dimension);
      this.setStackDepth(d, d === dimension ? DEPTH.stackFront : DEPTH.stackBack);
      this.colliders[d].active = d === dimension;
    }
  }

  private setStackVisible(dimension: Dimension, visible: boolean): void {
    this.stacks[dimension].setVisible(visible);
    this.level.layers[dimension].setVisible(visible);
    for (const extra of this.extras[dimension]) extra.object.setVisible(visible);
  }

  private setStackDepth(dimension: Dimension, base: number): void {
    this.stacks[dimension].setBaseDepth(base);
    this.level.layers[dimension].setDepth(base + DEPTH.stackTiles);
    for (const extra of this.extras[dimension]) extra.object.setDepth(base + extra.offset);
  }

  private drawWave(): void {
    const camera = this.scene.cameras.main;
    const { centerX, centerY, radius, color } = this.wave;

    this.worldMaskShape.clear().fillStyle(0xffffff).fillCircle(centerX, centerY, radius);
    this.screenMaskShape
      .clear()
      .fillStyle(0xffffff)
      .fillCircle(centerX - camera.scrollX, centerY - camera.scrollY, radius);

    const progress = Phaser.Math.Clamp(radius / MAX_RADIUS, 0, 1);
    this.ring
      .clear()
      .lineStyle(3, color, 0.9 * (1 - progress))
      .strokeCircle(centerX, centerY, radius)
      .lineStyle(1, PALETTE.white, 0.7 * (1 - progress))
      .strokeCircle(centerX, centerY, Math.max(radius - 3, 0));
  }

  private burst(target: Dimension): void {
    const emitter = this.scene.add
      .particles(this.wave.centerX, this.wave.centerY, TEXTURE.pixel, {
        speed: { min: 50, max: 190 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 280, max: 520 },
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [DIMENSION_ACCENT[target], PALETTE.white, PALETTE.magenta],
        gravityY: 40,
        emitting: false,
      })
      .setDepth(DEPTH.playerFx);
    emitter.explode(fx.count(26));
    this.scene.time.delayedCall(700, () => emitter.destroy());
  }

  private pulse(): void {
    if (fx.shake(1) > 0) this.scene.cameras.main.shake(110, 0.0018);
    this.player.setTintFill(PALETTE.white);
    this.scene.time.delayedCall(70, () => this.player.clearTint());
  }

  private rejectFeedback(cells: Cell[]): void {
    const { scene, player } = this;

    // Outline the solid cells that are in the way, so the reason is visible.
    const marks = scene.add.graphics().setDepth(DEPTH.effects);
    marks.fillStyle(PALETTE.blocked, 0.55);
    marks.lineStyle(1, PALETTE.blocked, 1);
    for (const { col, row } of cells) {
      marks.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      marks.strokeRect(col * TILE_SIZE + 0.5, row * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
    scene.tweens.add({
      targets: marks,
      alpha: { from: 1, to: 0 },
      duration: 450,
      ease: 'Quad.In',
      onComplete: () => marks.destroy(),
    });

    // Warning flash on the player, plus a short jolt.
    player.setTintFill(PALETTE.blocked);
    scene.time.delayedCall(90, () => player.setTintFill(PALETTE.white));
    scene.time.delayedCall(150, () => player.clearTint());
    if (fx.shake(1) > 0) scene.cameras.main.shake(80, 0.0012);
  }
}
