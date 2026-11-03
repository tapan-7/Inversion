import type { Dimension } from '../world/dimensionMath';

export interface LevelHint {
  /** Tile position of the text's left edge. */
  col: number;
  row: number;
  text: string;
  /** Shown instead of `text` on touch devices. */
  touchText?: string;
}

export interface LevelConfig {
  id: string;
  name: string;
  /**
   * One tile grid per dimension. Both grids must have identical size.
   * '#' solid stone, '=' thin solid ledge, '.' empty.
   */
  grids: Record<Dimension, string[]>;
  /** Spawn position in tiles. The player stands on the top edge of this tile. */
  spawn: { col: number; row: number };
  startDimension: Dimension;
  hints: LevelHint[];
}
