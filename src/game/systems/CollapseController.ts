import Phaser from 'phaser';
import { DEPTH, GAME_EVENT, GAME_HEIGHT, TILE_SIZE } from '../constants';
import type { CollapseConfig } from '../levels/types';
import { DIMENSIONS, isSolidChar } from '../world/dimensionMath';
import { setCell, type LoadedLevel } from '../world/LevelLoader';
import { PALETTE } from '../world/Palette';
import { TEXTURE } from '../world/PixelArt';
import { columnsDue, removalTimeMs } from './collapse';
import { fx } from './effects';

export type CollapseState = 'armed' | 'running' | 'done';

/**
 * Brings the world down column by column once triggered. Columns vanish from both
 * worlds, from the left, at a steady pace. `reset()` puts everything back.
 */
export class CollapseController {
  private current: CollapseState = 'armed';
  private elapsed = 0;
  private readonly front: Phaser.GameObjects.Graphics;
  /** Screen-locked glow on the left edge that warns of a collapse chasing from behind. */
  private readonly warning: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LoadedLevel,
    private readonly config: CollapseConfig,
  ) {
    this.front = scene.add.graphics().setDepth(DEPTH.effects).setBlendMode(Phaser.BlendModes.ADD);
    this.warning = scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.ui - 1)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  get state(): CollapseState {
    return this.current;
  }

  get running(): boolean {
    return this.current === 'running';
  }

  get triggerX(): number {
    return this.config.triggerCol * TILE_SIZE;
  }

  start(): void {
    if (this.current !== 'armed') return;
    this.current = 'running';
    this.elapsed = 0;
    this.scene.game.events.emit(GAME_EVENT.CollapseStarted);
  }

  /** Restores every column and re-arms the trigger. */
  reset(): void {
    this.current = 'armed';
    this.elapsed = 0;
    this.front.clear();
    this.warning.clear();
    for (let col = this.config.fromCol; col <= this.config.toCol; col++) {
      for (const dimension of DIMENSIONS) {
        const original = this.level.original[dimension];
        for (let row = 0; row < original.length; row++) {
          const ch = original[row][col];
          if (this.level.grids[dimension][row][col] !== ch) setCell(this.level, dimension, col, row, ch);
        }
      }
    }
  }

  update(deltaMs: number, playerX: number): void {
    if (this.current !== 'running') return;
    const previous = this.elapsed;
    this.elapsed += Math.min(deltaMs, 50);

    for (const col of columnsDue(previous, this.elapsed, this.config)) this.collapseColumn(col);
    this.drawFront(playerX);

    if (this.elapsed >= removalTimeMs(this.config.toCol, this.config)) {
      this.current = 'done';
      this.front.clear();
      this.warning.clear();
    }
  }

  private collapseColumn(col: number): void {
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const debrisRows: number[] = [];
    for (const dimension of DIMENSIONS) {
      const rows = this.level.grids[dimension];
      for (let row = 0; row < rows.length; row++) {
        if (!isSolidChar(rows[row][col])) continue;
        if (!debrisRows.includes(row)) debrisRows.push(row);
        setCell(this.level, dimension, col, row, '.');
      }
    }

    // A puff of rubble where the ground fell away.
    const top = Math.min(...debrisRows, this.level.original.forgotten.length);
    if (debrisRows.length) {
      const emitter = this.scene.add
        .particles(x, top * TILE_SIZE, TEXTURE.pixel, {
          x: { min: -6, max: 6 },
          speedX: { min: -30, max: 30 },
          speedY: { min: -60, max: -10 },
          gravityY: 260,
          lifespan: { min: 400, max: 800 },
          scale: { start: 1.6, end: 0.4 },
          alpha: { start: 1, end: 0 },
          tint: [PALETTE.stoneHighlight, PALETTE.stoneLight, PALETTE.crystalLight, PALETTE.white],
          emitting: false,
        })
        .setDepth(DEPTH.playerFx);
      emitter.explode(fx.count(8));
      this.scene.time.delayedCall(900, () => emitter.destroy());
    }
    if (fx.shake(1) > 0 && col % 2 === 0) this.scene.cameras.main.shake(90, fx.shake(0.003));
    this.scene.game.events.emit(GAME_EVENT.CollapseStep, col);
  }

  /** A glowing line at the edge of the collapse, so the danger is visible. */
  private drawFront(playerX: number): void {
    const { fromCol, speed, delayMs } = this.config;
    const colsPerMs = speed / 1000;
    const x = (fromCol + Math.max(0, this.elapsed - delayMs) * colsPerMs) * TILE_SIZE;
    const flicker = 0.6 + Math.sin(this.elapsed / 70) * 0.25;
    const height = this.level.heightPx;
    this.front.clear();
    this.front.fillStyle(0xff4b5c, 0.5 * flicker);
    this.front.fillRect(x - 2, 0, 4, height);
    this.front.fillStyle(0xff4b5c, 0.12 * flicker);
    this.front.fillRect(x - 24, 0, 24, height);
    this.front.fillStyle(PALETTE.white, 0.25 * flicker);
    this.front.fillRect(x - 0.5, 0, 1, height);

    // When the front is off screen, glow the left edge harder the closer it gets.
    const camera = this.scene.cameras.main;
    const behind = x < camera.scrollX;
    this.warning.clear();
    if (!behind) return;
    const gap = playerX - x;
    const closeness = Phaser.Math.Clamp(1 - gap / (24 * TILE_SIZE), 0, 1);
    if (closeness <= 0) return;
    const bands = 8;
    for (let i = 0; i < bands; i++) {
      const alpha = (0.55 * closeness * flicker * (bands - i)) / bands;
      this.warning.fillStyle(0xff4b5c, alpha);
      this.warning.fillRect(i * 6, 0, 6, GAME_HEIGHT);
    }
  }

  destroy(): void {
    this.front.destroy();
    this.warning.destroy();
  }
}
