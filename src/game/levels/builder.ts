import type { Dimension } from '../world/dimensionMath';

export type Grid = string[][];

/** Helpers for authoring a pair of same-sized tile grids. */
export class GridPair {
  readonly forgotten: Grid;
  readonly awakening: Grid;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    const blank = (): Grid => Array.from({ length: height }, () => Array<string>(width).fill('.'));
    this.forgotten = blank();
    this.awakening = blank();
  }

  private paint(grid: Grid, c0: number, r0: number, c1: number, r1: number, ch: string): void {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = ch;
  }

  both(c0: number, r0: number, c1: number, r1: number, ch: string): void {
    this.paint(this.forgotten, c0, r0, c1, r1, ch);
    this.paint(this.awakening, c0, r0, c1, r1, ch);
  }

  only(dimension: Dimension, c0: number, r0: number, c1: number, r1: number, ch: string): void {
    this.paint(this[dimension], c0, r0, c1, r1, ch);
  }

  rows(): Record<Dimension, string[]> {
    return {
      forgotten: this.forgotten.map((row) => row.join('')),
      awakening: this.awakening.map((row) => row.join('')),
    };
  }
}
