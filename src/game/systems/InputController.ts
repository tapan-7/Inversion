import Phaser from 'phaser';

export interface InputState {
  left: boolean;
  right: boolean;
  /** True on the frame jump went down. */
  jumpPressed: boolean;
  /** True while jump is held. */
  jumpHeld: boolean;
}

/** Written by the on-screen touch controls, read by the InputController. */
export const touchState = { left: false, right: false, jump: false };

export function resetTouchState(): void {
  touchState.left = false;
  touchState.right = false;
  touchState.jump = false;
}

/**
 * Merges keyboard and touch input into one set of actions.
 * Jump is W, Up or Z. SPACE is reserved for dimension switching (Phase 2).
 */
export class InputController {
  private readonly keys: {
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    jump: Phaser.Input.Keyboard.Key[];
  };
  private previousJumpHeld = false;
  private readonly state: InputState = {
    left: false,
    right: false,
    jumpPressed: false,
    jumpHeld: false,
  };

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const add = (...codes: number[]) =>
      keyboard ? codes.map((code) => keyboard.addKey(code, false)) : [];
    this.keys = {
      left: add(K.A, K.LEFT),
      right: add(K.D, K.RIGHT),
      jump: add(K.W, K.UP, K.Z),
    };
    // Stop arrow keys from scrolling the page.
    keyboard?.addCapture([K.LEFT, K.RIGHT, K.UP, K.DOWN, K.SPACE]);
  }

  read(): InputState {
    const down = (list: Phaser.Input.Keyboard.Key[]) => list.some((key) => key.isDown);
    const jumpHeld = down(this.keys.jump) || touchState.jump;

    this.state.left = down(this.keys.left) || touchState.left;
    this.state.right = down(this.keys.right) || touchState.right;
    this.state.jumpHeld = jumpHeld;
    this.state.jumpPressed = jumpHeld && !this.previousJumpHeld;
    this.previousJumpHeld = jumpHeld;
    return this.state;
  }

  destroy(scene: Phaser.Scene): void {
    const keyboard = scene.input.keyboard;
    if (!keyboard) return;
    for (const key of [...this.keys.left, ...this.keys.right, ...this.keys.jump]) {
      keyboard.removeKey(key, true);
    }
  }
}
