import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import type { LevelConfig } from '../levels/types';
import { DIMENSIONS, type Dimension } from './dimensionMath';
import { DIMENSION_TEXTURES, TILE } from './PixelArt';

export interface LoadedLevel {
  /** One tile layer per dimension. Both exist at all times, only one collides. */
  layers: Record<Dimension, Phaser.Tilemaps.TilemapLayer>;
  grids: Record<Dimension, string[]>;
  spawn: { x: number; y: number };
  widthPx: number;
  heightPx: number;
}

export function tileIndexFor(rows: string[], row: number, col: number): number {
  const ch = rows[row][col];
  if (ch === '=') return TILE.ledge;
  if (ch !== '#') return -1;
  const above = row > 0 ? rows[row - 1][col] : '#';
  if (above !== '#') return TILE.top;
  // Deterministic variation so the same cell always gets the same tile.
  return (row * 7 + col * 13) % 5 === 0 ? TILE.bodyCrack : TILE.body;
}

function createLayer(
  scene: Phaser.Scene,
  rows: string[],
  textureKey: string,
): Phaser.Tilemaps.TilemapLayer {
  const data = rows.map((line, row) => [...line].map((_, col) => tileIndexFor(rows, row, col)));
  const map = scene.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const tileset = map.addTilesetImage(textureKey, textureKey, TILE_SIZE, TILE_SIZE, 0, 0);
  if (!tileset) throw new Error('Could not create the tileset.');
  const layer = map.createLayer(0, tileset, 0, 0);
  if (!layer) throw new Error('Could not create the tile layer.');
  layer.setDepth(DEPTH.stackBack + DEPTH.stackTiles);
  layer.setCollisionByExclusion([-1]);
  return layer;
}

export function loadLevel(scene: Phaser.Scene, config: LevelConfig): LoadedLevel {
  const sizes = new Set(DIMENSIONS.map((d) => `${config.grids[d].length}x${config.grids[d][0].length}`));
  if (sizes.size !== 1) throw new Error(`Level "${config.id}" has grids of different sizes.`);

  const layers = {} as Record<Dimension, Phaser.Tilemaps.TilemapLayer>;
  for (const dimension of DIMENSIONS) {
    layers[dimension] = createLayer(scene, config.grids[dimension], DIMENSION_TEXTURES[dimension].tiles);
  }

  return {
    layers,
    grids: config.grids,
    spawn: {
      x: config.spawn.col * TILE_SIZE + TILE_SIZE / 2,
      y: config.spawn.row * TILE_SIZE,
    },
    widthPx: layers.forgotten.width,
    heightPx: layers.forgotten.height,
  };
}
