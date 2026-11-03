/** Ordered crystal puzzle state. No Phaser dependencies. */

export type SequenceResult = 'correct' | 'wrong' | 'complete' | 'ignored';

export class SequenceState {
  private progress = 0;

  /** `order` lists crystal indices in the order they must be touched. */
  constructor(readonly order: readonly number[]) {}

  get count(): number {
    return this.progress;
  }

  get solved(): boolean {
    return this.progress >= this.order.length;
  }

  /** Whether this crystal is currently lit. */
  isLit(crystal: number): boolean {
    return this.order.slice(0, this.progress).includes(crystal);
  }

  /**
   * Touching the next crystal in order lights it. Touching one already lit does
   * nothing. Touching any other crystal is a mistake and unlights everything.
   */
  touch(crystal: number): SequenceResult {
    if (this.solved) return 'ignored';
    if (this.isLit(crystal)) return 'ignored';
    if (crystal === this.order[this.progress]) {
      this.progress++;
      return this.solved ? 'complete' : 'correct';
    }
    this.progress = 0;
    return 'wrong';
  }

  reset(): void {
    this.progress = 0;
  }
}
