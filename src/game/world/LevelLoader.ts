import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import type { LevelConfig } from '../levels/types';
import { TEXTURE, TILE } from './PixelArt';

export interface LoadedLevel {
  map: Phaser.Tilemaps.Tilemap;
  layer: Phaser.Tilemaps.TilemapLayer;
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

export function loadLevel(scene: Phaser.Scene, config: LevelConfig): LoadedLevel {
  const data = config.rows.map((line, row) =>
    [...line].map((_, col) => tileIndexFor(config.rows, row, col)),
  );

  const map = scene.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const tileset = map.addTilesetImage(TEXTURE.tiles, TEXTURE.tiles, TILE_SIZE, TILE_SIZE, 0, 0);
  if (!tileset) throw new Error('Could not create the tileset.');
  const layer = map.createLayer(0, tileset, 0, 0);
  if (!layer) throw new Error('Could not create the tile layer.');

  layer.setDepth(DEPTH.tiles);
  layer.setCollisionByExclusion([-1]);

  return {
    map,
    layer,
    spawn: {
      x: config.spawn.col * TILE_SIZE + TILE_SIZE / 2,
      y: config.spawn.row * TILE_SIZE,
    },
    widthPx: map.widthInPixels,
    heightPx: map.heightInPixels,
  };
}
