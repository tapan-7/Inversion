import Phaser from 'phaser';
import { DEPTH, GAME_EVENT } from '../constants';
import { Gate } from '../entities/Gate';
import { SequenceCrystal } from '../entities/SequenceCrystal';
import { Shrine } from '../entities/Shrine';
import { Watcher } from '../entities/Watcher';
import type { LevelConfig } from '../levels/types';
import type { Dimension } from '../world/dimensionMath';
import type { LoadedLevel } from '../world/LevelLoader';
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
  kill(reason: 'watcher'): void;
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

  constructor(
    private readonly scene: Phaser.Scene,
    config: LevelConfig,
    level: LoadedLevel,
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

    if (this.dimensions.dimension === 'awakening') {
      for (const watcher of this.watchers) {
        const h = watcher.hitBox;
        if (Phaser.Geom.Intersects.RectangleToRectangle(playerBox, new Phaser.Geom.Rectangle(h.x, h.y, h.width, h.height))) {
          watcher.flash();
          this.hooks.kill('watcher');
          return;
        }
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

  /** The player died and came back. A running collapse starts over. */
  onPlayerRespawned(): void {
    this.collapse?.reset();
    this.touching.clear();
  }

  /** Stops the collapse, used when the level is finished. */
  halt(): void {
    if (this.collapse?.running) this.collapse.reset();
  }

  destroy(): void {
    this.collapse?.destroy();
  }
}

