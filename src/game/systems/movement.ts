/** Pure movement helpers. No Phaser dependencies so they are unit-testable. */

export function moveToward(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

/**
 * Tracks coyote time (jump shortly after leaving a ledge) and jump buffering
 * (press jump shortly before landing). Call `update` once per frame.
 */
export class JumpTimers {
  private coyote = 0;
  private buffer = 0;

  constructor(
    private readonly coyoteTime: number,
    private readonly bufferTime: number,
  ) {}

  /** Returns true on the frame a jump should start. */
  update(dt: number, grounded: boolean, jumpPressed: boolean): boolean {
    this.coyote = grounded ? this.coyoteTime : Math.max(0, this.coyote - dt);
    this.buffer = jumpPressed ? this.bufferTime : Math.max(0, this.buffer - dt);

    if (this.coyote > 0 && this.buffer > 0) {
      this.consume();
      return true;
    }
    return false;
  }

  /** Clears both timers so a single press cannot trigger two jumps. */
  consume(): void {
    this.coyote = 0;
    this.buffer = 0;
  }
}
