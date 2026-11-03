import Phaser from 'phaser';
import { DEPTH, GAME_EVENT, MOVE, SCENE, TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { TEST_LEVEL } from '../levels/testLevel';
import { DimensionManager, DIMENSION_ACCENT } from '../systems/DimensionManager';
import { InputController } from '../systems/InputController';
import { shouldShowTouchControls } from '../ui/TouchControls';
import type { Dimension } from '../world/dimensionMath';
import { LoadedLevel, loadLevel } from '../world/LevelLoader';
import { Parallax } from '../world/Parallax';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';

export class LevelScene extends Phaser.Scene {
  private level!: LoadedLevel;
  private player!: Player;
  private controls!: InputController;
  private stacks!: Record<Dimension, Parallax>;
  private dimensions!: DimensionManager;
  private leaving = false;

  constructor() {
    super(SCENE.Level);
  }

  create(): void {
    this.leaving = false;
    this.cameras.main.setBackgroundColor(PALETTE.deepNavy);
    this.cameras.main.fadeIn(300, 16, 26, 50);

    this.stacks = {
      forgotten: new Parallax(this, 'forgotten'),
      awakening: new Parallax(this, 'awakening'),
    };
    this.level = loadLevel(this, TEST_LEVEL);

    this.physics.world.gravity.y = MOVE.gravity;
    this.physics.world.setBounds(0, 0, this.level.widthPx, this.level.heightPx + 64);

    this.player = new Player(this, this.level.spawn.x, this.level.spawn.y);
    this.dimensions = new DimensionManager(
      this,
      this.level,
      this.player,
      this.stacks,
      TEST_LEVEL.startDimension,
    );
    this.addHints();

    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    camera.startFollow(this.player, true, 0.12, 0.12);
    camera.setDeadzone(24, 16);
    camera.setRoundPixels(true);

    this.controls = new InputController(this);
    this.input.keyboard?.on('keydown-R', this.restart, this);
    this.input.keyboard?.on('keydown-ESC', this.goToMenu, this);
    this.game.events.on(GAME_EVENT.RequestMenu, this.goToMenu, this);

    if (!this.scene.isActive(SCENE.UI)) {
      this.scene.launch(SCENE.UI, { chapter: `Chapter 00  ${TEST_LEVEL.name}` });
    }
    this.scene.bringToTop(SCENE.UI);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(_time: number, delta: number): void {
    const input = this.controls.read();
    if (input.switchPressed) this.dimensions.trySwitch();
    this.player.updateMovement(delta, input);

    const scrollX = this.cameras.main.scrollX;
    this.stacks.forgotten.update(scrollX, delta);
    this.stacks.awakening.update(scrollX, delta);
    this.dimensions.update();

    // Fell into a pit: return to the spawn point.
    if (this.player.y > this.level.heightPx + 48) {
      this.player.respawn(this.level.spawn.x, this.level.spawn.y);
      this.cameras.main.shake(120, 0.004);
    }
  }

  private addHints(): void {
    const touch = shouldShowTouchControls(this.game);
    for (const hint of TEST_LEVEL.hints) {
      this.add
        .bitmapText(
          hint.col * TILE_SIZE,
          hint.row * TILE_SIZE,
          PIXEL_FONT_KEY,
          (touch && hint.touchText ? hint.touchText : hint.text).toUpperCase(),
        )
        .setTint(DIMENSION_ACCENT.forgotten)
        .setAlpha(0.6)
        .setDepth(DEPTH.hints);
    }
  }

  private restart(): void {
    if (this.leaving) return;
    this.scene.restart();
  }

  private goToMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop(SCENE.UI);
    this.scene.start(SCENE.Menu);
  }

  private cleanup(): void {
    this.game.events.off(GAME_EVENT.RequestMenu, this.goToMenu, this);
    this.input.keyboard?.off('keydown-R', this.restart, this);
    this.input.keyboard?.off('keydown-ESC', this.goToMenu, this);
    this.controls.destroy(this);
    this.dimensions.destroy();
  }
}
