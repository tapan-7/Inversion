import Phaser from 'phaser';
import { DEPTH, GAME_EVENT, MOVE, PLAYER_BODY } from '../constants';
import type { InputState } from '../systems/InputController';
import { JumpTimers, moveToward } from '../systems/movement';
import { TEXTURE } from '../world/PixelArt';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly timers = new JumpTimers(MOVE.coyoteTime, MOVE.jumpBuffer);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURE.player, 'idle0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Origin at the feet so spawn and respawn positions are "standing on" points.
    this.setOrigin(0.5, 1).setDepth(DEPTH.player);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body
      .setSize(PLAYER_BODY.width, PLAYER_BODY.height)
      .setOffset(PLAYER_BODY.offsetX, PLAYER_BODY.offsetY)
      .setMaxVelocity(MOVE.maxSpeed * 2, MOVE.maxFallSpeed);
    this.play('player-idle');
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  respawn(x: number, y: number): void {
    this.setPosition(x, y);
    this.arcadeBody.setVelocity(0, 0);
    this.timers.consume();
  }

  updateMovement(deltaMs: number, input: InputState): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const body = this.arcadeBody;
    const grounded = body.blocked.down;

    // Horizontal: accelerate toward the target, friction when no input.
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const accel =
      dir === 0
        ? grounded
          ? MOVE.frictionGround
          : MOVE.frictionAir
        : grounded
          ? MOVE.accelGround
          : MOVE.accelAir;
    body.setVelocityX(moveToward(body.velocity.x, dir * MOVE.maxSpeed, accel * dt));
    if (dir !== 0) this.setFlipX(dir < 0);

    // Vertical: coyote time and jump buffering decide when a jump starts.
    if (this.timers.update(dt, grounded, input.jumpPressed)) {
      body.setVelocityY(-MOVE.jumpVelocity);
      this.scene.game.events.emit(GAME_EVENT.PlayerJumped);
    } else if (body.velocity.y < 0 && !input.jumpHeld) {
      // Released early while rising: pull down harder for a shorter hop.
      body.setVelocityY(body.velocity.y + MOVE.jumpCutGravity * dt);
    }

    this.updateAnimation(grounded);
  }

  private updateAnimation(grounded: boolean): void {
    const body = this.arcadeBody;
    let key = 'player-idle';
    if (!grounded) key = body.velocity.y < 0 ? 'player-jump' : 'player-fall';
    else if (Math.abs(body.velocity.x) > 12) key = 'player-run';
    this.play(key, true);
  }
}
