export interface LevelConfig {
  id: string;
  name: string;
  /** Tile-grid rows. '#' solid stone, '=' thin solid ledge, '.' empty. */
  rows: string[];
  /** Spawn position in tiles. The player stands on the top edge of this tile. */
  spawn: { col: number; row: number };
}
