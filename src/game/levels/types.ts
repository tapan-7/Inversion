import type { Dimension } from '../world/dimensionMath';

export interface LevelHint {
  /** Tile position of the text's left edge. */
  col: number;
  row: number;
  text: string;
  /** Shown instead of `text` on touch devices. */
  touchText?: string;
}

export interface FragmentConfig {
  id: string;
  /** Tile the fragment's centre sits in. */
  col: number;
  row: number;
  /** When set, the fragment can only be collected while this world is active. */
  dimension?: Dimension;
}

export interface CheckpointConfig {
  id: string;
  /** Tile the pylon stands in. Its feet rest on the bottom edge of this tile. */
  col: number;
  row: number;
}

export interface PortalConfig {
  /** Left tile of the two-tile-wide gate. */
  col: number;
  /** Row the gate's feet rest on, as the tile above the ground. */
  row: number;
}

export interface TipConfig {
  id: string;
  text: string;
  /** Shown instead of `text` on touch devices. */
  touchText?: string;
  /** The tip appears while the player is between these tile columns. */
  fromCol: number;
  toCol: number;
  /** What the player does to dismiss it. `time` hides it after `seconds`. */
  dismiss: 'switch' | 'jump' | 'time';
  seconds?: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  /** Shown in the HUD as CHAPTER 0N. */
  chapter: number;
  /**
   * One tile grid per dimension. Both grids must have identical size.
   * '#' solid stone, '=' thin solid ledge, 'b' energy bridge, '.' empty.
   */
  grids: Record<Dimension, string[]>;
  /** Spawn position in tiles. The player stands on the top edge of this tile. */
  spawn: { col: number; row: number };
  startDimension: Dimension;
  hints: LevelHint[];
  /** One-time tutorial banners, shown once per player. */
  tips?: TipConfig[];
  /** Progress is saved and the level can be continued. Off for the test level. */
  persistent?: boolean;
  fragments?: FragmentConfig[];
  checkpoints?: CheckpointConfig[];
  /** Exit gate. Opens once every fragment is collected. */
  portal?: PortalConfig;
}
