/** Pure grid helpers for dimension switching. No Phaser dependencies. */

export type Dimension = 'forgotten' | 'awakening';

export const DIMENSIONS: readonly Dimension[] = ['forgotten', 'awakening'];

export function otherDimension(dimension: Dimension): Dimension {
  return dimension === 'forgotten' ? 'awakening' : 'forgotten';
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Cell {
  col: number;
  row: number;
}

/** Tile-grid characters that are solid: '#' stone, '=' thin ledge, 'b' energy bridge and 'c' decaying platform. */
export function isSolidChar(ch: string | undefined): boolean {
  return ch === '#' || ch === '=' || ch === 'b' || ch === 'c';
}

/** Hazard tile characters that kill the player on contact: '^' spikes. */
export function isHazardChar(ch: string | undefined): boolean {
  return ch === '^';
}

/**
 * Returns every solid cell of `grid` that the rectangle overlaps.
 * Rectangles that only touch a cell edge do not overlap it. `inset` shrinks the
 * rectangle on every side, so tiny physics penetrations are forgiven.
 * Cells outside the grid are treated as empty.
 */
export function solidCellsOverlapping(
  grid: readonly string[],
  rect: Rect,
  tileSize: number,
  inset = 0,
): Cell[] {
  const left = rect.x + inset;
  const top = rect.y + inset;
  const right = rect.x + rect.width - inset;
  const bottom = rect.y + rect.height - inset;
  if (right <= left || bottom <= top) return [];

  const epsilon = 1e-6;
  const col0 = Math.floor(left / tileSize);
  const col1 = Math.floor((right - epsilon) / tileSize);
  const row0 = Math.floor(top / tileSize);
  const row1 = Math.floor((bottom - epsilon) / tileSize);

  const cells: Cell[] = [];
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      if (isSolidChar(grid[row]?.[col])) cells.push({ col, row });
    }
  }
  return cells;
}

/** Returns every hazard cell ('^') of `grid` that the rectangle overlaps or stands on. */
export function hazardCellsOverlapping(
  grid: readonly string[],
  rect: Rect,
  tileSize: number,
  inset = 2,
): Cell[] {
  const left = rect.x + inset;
  const top = rect.y + inset;
  const right = rect.x + rect.width - inset;
  // Catch both direct penetration and standing/grazing on top of a hazard tile
  const bottom = rect.y + rect.height + 2;
  if (right <= left || bottom <= top) return [];

  const epsilon = 1e-6;
  const col0 = Math.floor(left / tileSize);
  const col1 = Math.floor((right - epsilon) / tileSize);
  const row0 = Math.floor(top / tileSize);
  const row1 = Math.floor((bottom - epsilon) / tileSize);

  const cells: Cell[] = [];
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      if (isHazardChar(grid[row]?.[col])) cells.push({ col, row });
    }
  }
  return cells;
}

export function canOccupy(grid: readonly string[], rect: Rect, tileSize: number, inset = 0): boolean {
  return solidCellsOverlapping(grid, rect, tileSize, inset).length === 0;
}
