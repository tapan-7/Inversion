import Phaser from 'phaser';
import { DEPTH, GAME_EVENT, TILE_SIZE } from '../constants';
import { Gate } from '../entities/Gate';
import { SequenceCrystal } from '../entities/SequenceCrystal';
import { Shrine } from '../entities/Shrine';
import { Watcher } from '../entities/Watcher';
import type { LevelConfig } from '../levels/types';
import { hazardCellsOverlapping, solidCellsOverlapping, type Dimension } from '../world/dimensionMath';
import { setCell, type LoadedLevel } from '../world/LevelLoader';
import { PALETTE, SEQUENCE_COLORS } from '../world/Palette';
import type { Player } from '../entities/Player';
import { CollapseController } from './CollapseController';
import type { DimensionManager } from './DimensionManager';
import { SequenceState } from './sequence';

export const GATE_FLAG = 'gate';

export interface MechanicsHooks {
  popup(x: number, y: number, text: string, tint: number): void;
  burst(x: number, y: number, tint: number[], count: number): void;
  /** The player was caught by something. The scene decides what happens next. */
  kill(reason: 'watcher' | 'spike'): void;
  allFound(): boolean;
  recordFlag(flag: string): void;
}

const NOTICE_COOLDOWN_MS = 2000;

/**
 * The mechanics that only some chapters use: Watchers, the ordered crystal puzzle
 * with its gate, and the collapsing finale.
 */
export class ChapterMechanics {
  readonly watchers: Watcher[] = [];
  readonly crystals: SequenceCrystal[] = [];
  readonly sequence?: SequenceState;
  readonly gate?: Gate;
  readonly collapse?: CollapseController;

  private readonly touching = new Set<number>();
  private lastNotice = -Infinity;
  private readonly decayingTiles = new Map<string, { dimension: Dimension; col: number; row: number; elapsed: number }>();
  private readonly destroyedDecayTiles: Array<{ dimension: Dimension; col: number; row: number }> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    config: LevelConfig,
    private readonly level: LoadedLevel,
    private readonly dimensions: DimensionManager,
    private readonly player: Player,
    private readonly hooks: MechanicsHooks,
    savedFlags: readonly string[],
  ) {
    for (const watcherConfig of config.watchers ?? []) {
      const watcher = new Watcher(scene, watcherConfig);
      this.watchers.push(watcher);
      for (const object of watcher.displayObjects) {
        dimensions.addToStack('awakening', object as never, DEPTH.stackTiles + 2, 'world');
      }
    }
    dimensions.setBlockerProvider((target) =>
      target === 'awakening' ? this.watchers.map((w) => w.switchBlock) : [],
    );

    if (config.sequence) {
      const seq = config.sequence;
      this.sequence = new SequenceState(seq.order);
      seq.crystals.forEach((c, i) => this.crystals.push(new SequenceCrystal(scene, i, c)));
      const colors = Shrine.colorsFor(
        seq.order,
        seq.crystals.map((c) => c.color),
      );
      for (const shrine of seq.shrines) new Shrine(scene, shrine.col, shrine.row, colors);

      this.gate = new Gate(scene, seq.gate);
      scene.physics.add.collider(player, this.gate.sprite);

      if (savedFlags.includes(GATE_FLAG)) {
        for (const index of seq.order) this.sequence.touch(index);
        this.gate.open(true);
      }
      for (const crystal of this.crystals) crystal.setLit(this.sequence.isLit(crystal.index));
      this.refreshCrystals(dimensions.dimension);
    }

    if (config.collapse) this.collapse = new CollapseController(scene, level, config.collapse);
  }

  onDimensionSwitched(dimension: Dimension): void {
    this.refreshCrystals(dimension);
  }

  private refreshCrystals(dimension: Dimension): void {
    for (const crystal of this.crystals) crystal.applyDimension(dimension);
  }

  /** Call every frame while the level is live. */
  update(deltaMs: number, playerBox: Phaser.Geom.Rectangle): void {
    for (const watcher of this.watchers) watcher.update(deltaMs);

    const currentDim = this.dimensions.dimension;
    const activeGrid = this.level.grids[currentDim];

    // 1. Spikes hazard collision in active dimension:
    const hazardBox = {
      x: playerBox.x + 1,
      y: playerBox.y + 1,
      width: Math.max(1, playerBox.width - 2),
      height: playerBox.height + 2,
    };
    const hazards = hazardCellsOverlapping(activeGrid, hazardBox, TILE_SIZE, 0);
    if (hazards.length > 0) {
      this.hooks.kill('spike');
      return;
    }

    // 2. Watcher contact in Awakening:
    if (currentDim === 'awakening') {
      for (const watcher of this.watchers) {
        const h = watcher.hitBox;
        if (Phaser.Geom.Intersects.RectangleToRectangle(playerBox, new Phaser.Geom.Rectangle(h.x, h.y, h.width, h.height))) {
          watcher.flash();
          this.hooks.kill('watcher');
          return;
        }
      }
    }

    // 3. Decaying platforms ('c'):
    // When standing on or touching 'c' tile with feet:
    const footRect = {
      x: playerBox.x + 2,
      y: playerBox.y + playerBox.height - 2,
      width: Math.max(1, playerBox.width - 4),
      height: 4,
    };
    const footCells = solidCellsOverlapping(activeGrid, footRect, TILE_SIZE);
    for (const cell of footCells) {
      if (activeGrid[cell.row]?.[cell.col] === 'c') {
        // Find the whole contiguous platform segment so all connected tiles crumble together
        let minCol = cell.col;
        while (minCol > 0 && activeGrid[cell.row]?.[minCol - 1] === 'c') {
          minCol--;
        }
        let maxCol = cell.col;
        while (maxCol < activeGrid[cell.row].length - 1 && activeGrid[cell.row]?.[maxCol + 1] === 'c') {
          maxCol++;
        }

        for (let col = minCol; col <= maxCol; col++) {
          const key = `${currentDim}:${col}:${cell.row}`;
          if (!this.decayingTiles.has(key)) {
            this.decayingTiles.set(key, {
              dimension: currentDim,
              col,
              row: cell.row,
              elapsed: 0,
            });
          }
        }
      }
    }

    // Advance and collapse decaying tiles:
    for (const [key, dt] of this.decayingTiles.entries()) {
      const prevElapsed = dt.elapsed;
      dt.elapsed += deltaMs;

      // Burst crumbs when starting to break:
      if (prevElapsed < 650 && dt.elapsed >= 650) {
        this.hooks.burst(
          dt.col * TILE_SIZE + TILE_SIZE / 2,
          dt.row * TILE_SIZE + 4,
          [PALETTE.stoneMid, PALETTE.stoneDark],
          6,
        );
      }

      // Tile collapses and vanishes at 950ms:
      if (dt.elapsed >= 950) {
        setCell(this.level, dt.dimension, dt.col, dt.row, '.');
        this.destroyedDecayTiles.push({ dimension: dt.dimension, col: dt.col, row: dt.row });
        this.decayingTiles.delete(key);
      }
    }

    this.updateSequence(playerBox);
    this.updateCollapse(deltaMs);
  }

  private updateSequence(playerBox: Phaser.Geom.Rectangle): void {
    const seq = this.sequence;
    if (!seq) return;

    for (const crystal of this.crystals) {
      const inside = crystal.canTouch && Phaser.Geom.Intersects.RectangleToRectangle(playerBox, crystal.bounds);
      if (!inside) {
        this.touching.delete(crystal.index);
        continue;
      }
      if (this.touching.has(crystal.index)) continue;
      this.touching.add(crystal.index);
      this.touchCrystal(crystal);
    }
  }

  private touchCrystal(crystal: SequenceCrystal): void {
    const seq = this.sequence!;
    const result = seq.touch(crystal.index);
    if (result === 'ignored') return;

    const colorValue = SEQUENCE_COLORS[crystal.config.color];
    if (result === 'wrong') {
      for (const c of this.crystals) {
        c.setLit(false);
        c.flashWrong();
      }
      this.hooks.popup(crystal.x, crystal.y - 18, 'WRONG ORDER', PALETTE.blocked);
      this.scene.game.events.emit(GAME_EVENT.SequenceWrong);
      return;
    }

    crystal.setLit(true);
    this.hooks.burst(crystal.x, crystal.y, [colorValue, PALETTE.white], 14);
    this.scene.game.events.emit(GAME_EVENT.SequenceStep, seq.count - 1);

    if (result === 'complete') {
      this.gate?.open();
      this.hooks.recordFlag(GATE_FLAG);
      this.scene.game.events.emit(GAME_EVENT.GateOpened);
      this.hooks.popup(crystal.x, crystal.y - 18, 'THE GATE OPENS', PALETTE.cyanAccent);
    }
  }

  private updateCollapse(deltaMs: number): void {
    const collapse = this.collapse;
    if (!collapse) return;
    collapse.update(deltaMs, this.player.x);
    if (collapse.state !== 'armed' || this.player.x < collapse.triggerX) return;

    if (this.hooks.allFound()) {
      collapse.start();
      this.hooks.popup(this.player.x, this.player.y - 40, 'RUN!', PALETTE.blocked);
    } else if (this.scene.time.now - this.lastNotice > NOTICE_COOLDOWN_MS) {
      this.lastNotice = this.scene.time.now;
      this.hooks.popup(this.player.x, this.player.y - 40, 'FIND EVERY ECHO FIRST', PALETTE.energyGlow);
    }
  }

  /** The player died and came back. A running collapse starts over, watchers reset, decay tiles restored. */
  onPlayerRespawned(): void {
    this.collapse?.reset();
    this.touching.clear();
    for (const watcher of this.watchers) watcher.reset();

    // Restore destroyed decay tiles back to original:
    for (const dt of this.destroyedDecayTiles) {
      setCell(this.level, dt.dimension, dt.col, dt.row, 'c');
    }
    this.destroyedDecayTiles.length = 0;
    this.decayingTiles.clear();

    // Reset uncompleted sequence puzzle:
    if (this.sequence && this.gate && !this.gate.isOpen) {
      this.sequence.reset();
      for (const crystal of this.crystals) crystal.setLit(false);
    }
  }

  /** Stops the collapse, used when the level is finished. */
  halt(): void {
    if (this.collapse?.running) this.collapse.reset();
  }

  destroy(): void {
    this.collapse?.destroy();
  }
}

