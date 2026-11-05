import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, TILE_SIZE } from '../constants';
import type { Player } from '../entities/Player';
import type { DimensionManager } from '../systems/DimensionManager';
import { DIMENSION_ACCENT } from '../systems/DimensionManager';
import { settings } from '../systems/Settings';
import type { Dimension } from './dimensionMath';
import { isSolidChar } from './dimensionMath';
import { PALETTE } from './Palette';
import { TEXTURE } from './PixelArt';

/** Depth offsets inside a dimension's stack. Tiles sit at DEPTH.stackTiles (10). */
const BEHIND_TILES = 5;
const IN_FRONT_OF_TILES = 12;

/** Slower emission when Low Effects is on. */
const LOW_EFFECTS_FREQUENCY_FACTOR = 3.5;

interface Quality {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  frequency: number;
  /** Hidden entirely when Low Effects is on. */
  foreground: boolean;
}

/**
 * Ambient life for each world: drifting particles, glowing crystals on the
 * Awakening ruins, and a soft light around the player. Particles and crystals join
 * their dimension's stack, so they reveal through the switch wave and hide with it.
 */
export class Ambient {
  private readonly light: Phaser.GameObjects.Image;
  private emitters: Quality[] = [];
  private glows: Phaser.GameObjects.Image[] = [];
  private readonly unsubscribe: () => void;
  private destroyed = false;
  /** Where particles spawn: the whole screen, kept as wide as the window. */
  private readonly area: Phaser.Geom.Rectangle;
  private readonly onResize: (size: Phaser.Structs.Size) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly dimensions: DimensionManager,
    private readonly player: Player,
    awakeningGrid: readonly string[],
  ) {
    this.area = new Phaser.Geom.Rectangle(0, 0, scene.scale.width, GAME_HEIGHT);
    this.onResize = (size) => {
      this.area.width = size.width;
    };
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.addMotes('forgotten');
    this.addMotes('awakening');
    this.addCrystalGlows(awakeningGrid);

    this.light = scene.add
      .image(player.x, player.y, TEXTURE.halo)
      .setDepth(DEPTH.player - 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.8)
      .setAlpha(0.3);

    this.applyQuality();
    this.unsubscribe = settings.onChange(() => this.applyQuality());
  }

  private addEmitter(
    dimension: Dimension,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    frequency: number,
    offset: number,
    foreground = false,
  ): void {
    const emitter = this.scene.add
      .particles(0, 0, config.texture ?? TEXTURE.pixel, { ...config, frequency })
      .setScrollFactor(0);
    // Prewarm so the screen is not empty when a level opens.
    emitter.fastForward(4000, 250);
    this.dimensions.addToStack(dimension, emitter, offset, 'screen');
    this.emitters.push({ emitter, frequency, foreground });
  }

  private addMotes(dimension: Dimension): void {
    const area = {
      emitZone: {
        type: 'random' as const,
        source: {
          getRandomPoint: (point: Phaser.Types.Math.Vector2Like) => {
            point.x = Math.random() * this.area.width;
            point.y = Math.random() * this.area.height;
            return point;
          },
        },
      },
    };

    if (dimension === 'forgotten') {
      // Cold dust that sinks slowly.
      const dust: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
        ...area,
        speedX: { min: -8, max: 5 },
        speedY: { min: 3, max: 12 },
        lifespan: { min: 6000, max: 11000 },
        scale: { start: 1, end: 0.6 },
        alpha: { values: [0, 0.55, 0.55, 0] },
        tint: [0x5878ab, 0x8fa6d6, PALETTE.cyanAccent],
      };
      this.addEmitter('forgotten', dust, 260, BEHIND_TILES);
      this.addEmitter('forgotten', { ...dust, scale: { start: 2, end: 1.4 }, alpha: { values: [0, 0.3, 0.3, 0] } }, 900, IN_FRONT_OF_TILES, true);
      return;
    }

    // Warm light orbs that rise like dandelion seeds.
    const orbs: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      ...area,
      texture: TEXTURE.halo,
      speedX: { min: -9, max: 9 },
      speedY: { min: -16, max: -5 },
      lifespan: { min: 5000, max: 9000 },
      scale: { min: 0.18, max: 0.42 },
      alpha: { values: [0, 0.75, 0.75, 0] },
      tint: [PALETTE.magenta, PALETTE.energyGlow, PALETTE.cyanAccent],
      blendMode: Phaser.BlendModes.ADD,
    };
    this.addEmitter('awakening', orbs, 380, BEHIND_TILES);
    this.addEmitter(
      'awakening',
      { ...orbs, scale: { min: 0.5, max: 0.8 }, alpha: { values: [0, 0.22, 0.22, 0] } },
      1400,
      IN_FRONT_OF_TILES,
      true,
    );
  }

  /** Glowing crystals growing from the top of the restored stone. */
  private addCrystalGlows(grid: readonly string[]): void {
    for (let row = 1; row < grid.length; row++) {
      for (let col = 1; col < grid[row].length - 1; col++) {
        if (!isSolidChar(grid[row][col]) || isSolidChar(grid[row - 1][col])) continue;
        // Deterministic scatter, a crystal on roughly one top tile in eight.
        if ((col * 31 + row * 17) % 8 !== 0) continue;

        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE;
        const tint = (col + row) % 2 === 0 ? PALETTE.magenta : PALETTE.energyGlow;

        const shard = this.scene.add.image(x, y, TEXTURE.fragment).setOrigin(0.5, 1).setScale(0.5);
        const glow = this.scene.add
          .image(x, y - 4, TEXTURE.halo)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(tint)
          .setScale(1.1)
          .setAlpha(0.7);
        this.scene.tweens.add({
          targets: glow,
          alpha: { from: 0.4, to: 0.9 },
          scale: { from: 0.95, to: 1.25 },
          duration: 1400 + ((col * 53) % 900),
          delay: (col * 97) % 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
        this.dimensions.addToStack('awakening', shard, DEPTH.stackTiles + 1, 'world');
        this.dimensions.addToStack('awakening', glow, DEPTH.stackTiles + 1.5, 'world');
        this.glows.push(glow);
      }
    }
  }

  private applyQuality(): void {
    if (this.destroyed) return;
    const low = settings.data.lowEffects;
    for (const { emitter, frequency, foreground } of this.emitters) {
      if (!emitter || !emitter.scene || (emitter as unknown as { counters?: unknown }).counters === null) {
        continue;
      }
      try {
        emitter.setFrequency(low ? frequency * LOW_EFFECTS_FREQUENCY_FACTOR : frequency, 1);
        emitter.setAlpha(foreground && low ? 0 : 1);
      } catch {
        // Emitter might be destroyed during scene transition.
      }
    }
    // The glow tweens drive alpha, so update() keeps them at zero while Low Effects is on.
    for (const glow of this.glows) {
      if (glow && glow.scene && low) {
        glow.setAlpha(0);
      }
    }
  }

  /** Call every frame. */
  update(time: number, visible = true): void {
    if (this.destroyed) return;
    const body = this.player.arcadeBody;
    const pulse = 0.26 + Math.sin(time / 520) * 0.05;
    this.light
      .setPosition(body.center.x, body.center.y - 2)
      .setTint(DIMENSION_ACCENT[this.dimensions.dimension])
      .setAlpha(visible ? pulse : 0);

    const low = settings.data.lowEffects;
    for (const glow of this.glows) {
      if (glow && glow.scene && low) glow.setAlpha(0);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribe();
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    for (const { emitter } of this.emitters) {
      try {
        emitter.destroy();
      } catch {
        // Ignore
      }
    }
    this.emitters = [];
    for (const glow of this.glows) {
      try {
        glow.destroy();
      } catch {
        // Ignore
      }
    }
    this.glows = [];
    try {
      this.light?.destroy();
    } catch {
      // Ignore
    }
  }
}
