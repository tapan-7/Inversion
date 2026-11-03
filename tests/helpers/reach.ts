/**
 * Conservative solvability analysis for level grids. It is a test aid, not the
 * game's physics: jumps are shorter than the real ones and mid-air switching is
 * free, so "reachable" here means "comfortably playable", not "provably playable".
 */
import type { LevelConfig } from '../../src/game/levels/types';
import { isSolidChar, type Dimension } from '../../src/game/world/dimensionMath';

export interface Node {
  col: number;
  row: number;
  dim: Dimension;
}
export interface Cell {
  col: number;
  row: number;
}
export interface Reached {
  node: Node;
  /** Seconds, pessimistic. */
  cost: number;
}

const other = (d: Dimension): Dimension => (d === 'forgotten' ? 'awakening' : 'forgotten');
const keyOf = (n: Node) => `${n.col},${n.row},${n.dim}`;

/** Largest horizontal distance, in cells, for a jump that rises `dy` cells (negative is a drop). */
function maxDx(dy: number): number {
  if (dy >= 3) return 2;
  if (dy === 2) return 3;
  if (dy === 1 || dy === 0) return 4;
  if (dy === -1) return 5;
  return 6;
}

export interface ReachOptions {
  /** Extra cells that are solid in both worlds, such as a closed gate. */
  closed?: Cell[];
  start?: Node;
  /** Cost at the start node, to model a delayed start. */
  startCost?: number;
}

export function reach(config: LevelConfig, options: ReachOptions = {}): Map<string, Reached> {
  const { grids } = config;
  const H = grids.forgotten.length;
  const W = grids.forgotten[0].length;
  const closed = new Set((options.closed ?? []).map((c) => `${c.col},${c.row}`));

  const solid = (d: Dimension, c: number, r: number): boolean => {
    if (c < 0 || c >= W) return true;
    if (r < 0) return false;
    if (r >= H) return false;
    return closed.has(`${c},${r}`) || isSolidChar(grids[d][r][c]);
  };
  const free2 = (d: Dimension, c: number, r: number) => !solid(d, c, r) && !solid(d, c, r - 1);
  const standable = (d: Dimension, c: number, r: number) =>
    c > 0 && c < W - 1 && r >= 1 && r <= H - 2 && free2(d, c, r) && solid(d, c, r + 1);

  /** Row where something dropped from (c, r) comes to rest, or null when it falls out of the level. */
  const landing = (d: Dimension, c: number, r: number): number | null => {
    if (!free2(d, c, r)) return null;
    for (let r2 = r; r2 < H - 1; r2++) {
      if (solid(d, c, r2 + 1)) return r2;
      if (solid(d, c, r2 + 1)) return null;
    }
    return null;
  };

  const start: Node = options.start ?? {
    col: config.spawn.col,
    row: config.spawn.row - 1,
    dim: config.startDimension,
  };

  const best = new Map<string, Reached>();
  const queue: Reached[] = [{ node: start, cost: options.startCost ?? 0 }];
  best.set(keyOf(start), queue[0]);

  const push = (node: Node, cost: number) => {
    const k = keyOf(node);
    const known = best.get(k);
    if (known && known.cost <= cost) return;
    const entry = { node, cost };
    best.set(k, entry);
    queue.push(entry);
  };

  while (queue.length) {
    // Small graph: a linear scan for the cheapest entry is plenty fast.
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].cost < queue[bi].cost) bi = i;
    const { node, cost } = queue.splice(bi, 1)[0];
    if ((best.get(keyOf(node))?.cost ?? Infinity) < cost) continue;
    const { col: c, row: r, dim: d } = node;

    // Switch in place.
    const d2 = other(d);
    if (free2(d2, c, r)) {
      const row2 = landing(d2, c, r);
      if (row2 !== null) push({ col: c, row: row2, dim: d2 }, cost + 0.1 + 0.15 * (row2 - r));
    }

    // Walk or step off an edge.
    for (const dir of [-1, 1]) {
      const c2 = c + dir;
      if (c2 <= 0 || c2 >= W - 1) continue;
      if (!free2(d, c2, r)) continue;
      const row2 = solid(d, c2, r + 1) ? r : landing(d, c2, r);
      if (row2 !== null) push({ col: c2, row: row2, dim: d }, cost + 0.2 + 0.15 * (row2 - r));
    }

    // Jumps, with a switch in mid-air allowed.
    for (const dTarget of [d, d2]) {
      for (let dx = -6; dx <= 6; dx++) {
        for (let r2 = r - 3; r2 <= r + 9; r2++) {
          const c2 = c + dx;
          if (dx === 0 && r2 === r) continue;
          if (!standable(dTarget, c2, r2)) continue;
          const dy = r - r2;
          if (Math.abs(dx) > maxDx(dy)) continue;

          const apex = Math.min(r, r2) - 3;
          const lowest = Math.max(r, r2) - 1;
          const lo = Math.min(c, c2);
          const hi = Math.max(c, c2);
          let clear = true;
          // Launch and landing columns need headroom for the rise and the fall.
          for (let rr = Math.max(apex, r - 4); rr <= r - 1 && clear; rr++) clear = !solid(d, c, rr);
          for (let rr = Math.max(apex, r2 - 4); rr <= r2 - 1 && clear; rr++) clear = !solid(dTarget, c2, rr);
          // Columns in between: the first half in the launch world, the rest in the landing world.
          for (let cc = lo + 1; cc < hi && clear; cc++) {
            const nearStart = Math.abs(cc - c) <= Math.abs(cc - c2);
            const world = nearStart ? d : dTarget;
            for (let rr = apex; rr <= lowest && clear; rr++) clear = !solid(world, cc, rr);
          }
          if (clear) push({ col: c2, row: r2, dim: dTarget }, cost + 0.6 + 0.08 * Math.abs(dx));
        }
      }
    }
  }
  return best;
}

/** Whether something at `cell` can be touched from a reached node (standing or a jump away). */
export function canTouch(reached: Map<string, Reached>, cell: Cell, dimension?: Dimension): boolean {
  for (const { node } of reached.values()) {
    if (Math.abs(node.col - cell.col) > 1) continue;
    if (cell.row > node.row || cell.row < node.row - 3) continue;
    // A world-locked pickup can be taken with a switch while jumping, so either world qualifies.
    void dimension;
    return true;
  }
  return false;
}

/** Cheapest cost to be standing anywhere at or beyond `col`. */
export function earliestAtOrBeyond(reached: Map<string, Reached>, col: number): number {
  let best = Infinity;
  for (const { node, cost } of reached.values()) if (node.col >= col && cost < best) best = cost;
  return best;
}

export function reachesNode(reached: Map<string, Reached>, col: number, row: number): boolean {
  return reached.has(`${col},${row},forgotten`) || reached.has(`${col},${row},awakening`);
}

/** Reach test for a portal: standing on either of its two columns. */
export function reachesPortal(reached: Map<string, Reached>, config: LevelConfig): boolean {
  const p = config.portal;
  if (!p) return false;
  return reachesNode(reached, p.col, p.row) || reachesNode(reached, p.col + 1, p.row);
}
