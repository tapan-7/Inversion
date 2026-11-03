import Phaser from 'phaser';
import { GAME_EVENT, MOVE, SCENE } from '../constants';
import { Player } from '../entities/Player';
import { TEST_LEVEL } from '../levels/testLevel';
import { InputController } from '../systems/InputController';
import { LoadedLevel, loadLevel } from '../world/LevelLoader';
import { Parallax } from '../world/Parallax';
import { PALETTE } from '../world/Palette';

export class LevelScene extends Phaser.Scene {
  private level!: LoadedLevel;
  private player!: Player;
  private controls!: InputController;
  private parallax!: Parallax;
  private leaving = false;

  constructor() {
    super(SCENE.Level);
  }

  create(): void {
    this.leaving = false;
    this.cameras.main.setBackgroundColor(PALETTE.deepNavy);
    this.cameras.main.fadeIn(300, 16, 26, 50);

    this.parallax = new Parallax(this);
    this.level = loadLevel(this, TEST_LEVEL);

    this.physics.world.gravity.y = MOVE.gravity;
    this.physics.world.setBounds(0, 0, this.level.widthPx, this.level.heightPx + 64);

    this.player = new Player(this, this.level.spawn.x, this.level.spawn.y);
    this.physics.add.collider(this.player, this.level.layer);

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
    this.player.updateMovement(delta, this.controls.read());
    this.parallax.update(this.cameras.main.scrollX, delta);

    // Fell into a pit: return to the spawn point.
    if (this.player.y > this.level.heightPx + 48) {
      this.player.respawn(this.level.spawn.x, this.level.spawn.y);
      this.cameras.main.shake(120, 0.004);
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
  }
}
