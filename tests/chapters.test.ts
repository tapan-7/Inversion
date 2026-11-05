import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../src/game/constants';
import { CHAPTERS } from '../src/game/levels';
import { removalTimeMs } from '../src/game/systems/collapse';
import { DIMENSIONS, canOccupy, isSolidChar, type Dimension } from '../src/game/world/dimensionMath';
import { canTouch, earliestAtOrBeyond, reach, reachesNode, reachesPortal } from './helpers/reach';

const cell = (grids: Record<Dimension, string[]>, d: Dimension, col: number, row: number) =>
  grids[d][row]?.[col];

describe('five chapters', () => {
  it('are numbered 1 to 5 and chained in order', () => {
    expect(CHAPTERS.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5]);
    CHAPTERS.slice(0, 4).forEach((c, i) => expect(c.next).toBe(`chapter${i + 2}`));
    expect(CHAPTERS[4].next).toBeUndefined();
    expect(CHAPTERS[4].final).toBe(true);
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(5);
  });

  it('have globally unique fragment and checkpoint ids, three fragments each', () => {
    const ids = CHAPTERS.flatMap((c) => [...(c.fragments ?? []).map((f) => f.id), ...(c.checkpoints ?? []).map((k) => k.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CHAPTERS) expect(c.fragments, c.id).toHaveLength(3);
  });
});

describe.each(CHAPTERS)('$id layout', (config) => {
  const { grids, spawn } = config;

  it('has equal-sized rectangular grids of known characters, walled left and right', () => {
    for (const d of DIMENSIONS) {
      expect(new Set(grids[d].map((r) => r.length)).size).toBe(1);
      expect(grids[d].join('')).toMatch(/^[#=bc.^]+$/);
      for (const row of grids[d]) {
        expect(row[0]).toBe('#');
        expect(row[row.length - 1]).toBe('#');
      }
    }
    expect(grids.forgotten.length).toBe(grids.awakening.length);
    expect(grids.forgotten[0].length).toBe(grids.awakening[0].length);
  });

  it('lets the player spawn safely in both worlds', () => {
    const body = { x: spawn.col * TILE_SIZE + 3, y: spawn.row * TILE_SIZE - 20, width: 10, height: 20 };
    for (const d of DIMENSIONS) expect(canOccupy(grids[d], body, TILE_SIZE, 0.5)).toBe(true);
  });

  it('keeps fragments out of solid cells in both worlds', () => {
    for (const f of config.fragments ?? []) {
      for (const d of DIMENSIONS) expect(isSolidChar(cell(grids, d, f.col, f.row)), f.id).toBe(false);
    }
  });

  it('puts checkpoints on ground with headroom in both worlds', () => {
    for (const c of config.checkpoints ?? []) {
      for (const d of DIMENSIONS) {
        expect(isSolidChar(cell(grids, d, c.col, c.row + 1)), `${c.id} ground`).toBe(true);
        expect(isSolidChar(cell(grids, d, c.col, c.row)), c.id).toBe(false);
        expect(isSolidChar(cell(grids, d, c.col, c.row - 1)), c.id).toBe(false);
      }
    }
  });

  it('puts the portal on ground with clear space in both worlds', () => {
    const p = config.portal!;
    for (const d of DIMENSIONS) {
      for (const col of [p.col, p.col + 1]) {
        expect(isSolidChar(cell(grids, d, col, p.row + 1))).toBe(true);
        for (let r = 0; r < 3; r++) expect(isSolidChar(cell(grids, d, col, p.row - r))).toBe(false);
      }
    }
  });
});

describe.each(CHAPTERS)('$id is solvable', (config) => {
  const gate = config.sequence?.gate;
  const closed = gate
    ? Array.from({ length: gate.width * gate.height }, (_, i) => ({
        col: gate.col + (i % gate.width),
        row: gate.row + Math.floor(i / gate.width),
      }))
    : [];
  const open = reach(config);
  const gated = reach(config, { closed });

  it('reaches the portal from spawn', () => {
    expect(reachesPortal(open, config)).toBe(true);
  });

  it('reaches every fragment and checkpoint', () => {
    for (const f of config.fragments ?? []) {
      const where = closed.length ? gated : open;
      // Fragments behind the gate only need to be reachable once it is open.
      const ok = canTouch(where, f, f.dimension) || canTouch(open, f, f.dimension);
      expect(ok, f.id).toBe(true);
    }
    for (const c of config.checkpoints ?? []) expect(reachesNode(open, c.col, c.row), c.id).toBe(true);
  });

  it('keeps the portal out of reach while a gate is closed', () => {
    if (!gate) return;
    expect(reachesPortal(gated, config)).toBe(false);
  });

  it('needs no leap of faith: the first pit floor is not a standing spot', () => {
    // At least one stretch of the level is only crossable with a switch, so
    // the reachable set must be smaller than "every floor cell".
    const floors = [...open.values()].filter((r) => r.node.row === config.spawn.row - 1).length;
    expect(floors).toBeGreaterThan(10);
  });
});

describe('watchers', () => {
  const withWatchers = CHAPTERS.filter((c) => c.watchers?.length);

  it('appear in chapters 3 and 5 only', () => {
    expect(withWatchers.map((c) => c.chapter)).toEqual([3, 5]);
  });

  it.each(withWatchers)('$id: every beat has ground underfoot and clear space in Awakening', (config) => {
    for (const w of config.watchers!) {
      expect(w.minCol).toBeLessThan(w.maxCol);
      for (let col = w.minCol; col <= w.maxCol; col++) {
        expect(isSolidChar(cell(config.grids, 'awakening', col, w.row + 1)), `${w.id} floor ${col}`).toBe(true);
        expect(isSolidChar(cell(config.grids, 'awakening', col, w.row)), `${w.id} ${col}`).toBe(false);
        expect(isSolidChar(cell(config.grids, 'awakening', col, w.row - 1)), `${w.id} ${col}`).toBe(false);
      }
    }
  });

  it.each(withWatchers)('$id: no beat covers the spawn, a checkpoint or the portal', (config) => {
    const keepClear = [
      config.spawn.col,
      ...(config.checkpoints ?? []).map((c) => c.col),
      config.portal!.col,
      config.portal!.col + 1,
    ];
    for (const w of config.watchers!) {
      for (const col of keepClear) {
        expect(col < w.minCol - 2 || col > w.maxCol + 2, `${w.id} near column ${col}`).toBe(true);
      }
    }
  });
});

describe('chapter 4 crystal sequence', () => {
  const config = CHAPTERS[3];
  const seq = config.sequence!;

  it('has an order that is a permutation of its crystals', () => {
    expect([...seq.order].sort()).toEqual(seq.crystals.map((_, i) => i).sort());
    expect(new Set(seq.crystals.map((c) => c.color)).size).toBe(seq.crystals.length);
  });

  it('keeps crystals out of solid cells and reachable before the gate opens', () => {
    const closed = Array.from({ length: seq.gate.width * seq.gate.height }, (_, i) => ({
      col: seq.gate.col + (i % seq.gate.width),
      row: seq.gate.row + Math.floor(i / seq.gate.width),
    }));
    const gated = reach(config, { closed });
    seq.crystals.forEach((c, i) => {
      for (const d of DIMENSIONS) expect(isSolidChar(cell(config.grids, d, c.col, c.row)), `crystal ${i}`).toBe(false);
      expect(canTouch(gated, c, c.dimension), `crystal ${i} reachable`).toBe(true);
    });
  });

  it('leaves the gate cells empty in the grids, since the gate is dynamic', () => {
    for (const d of DIMENSIONS) {
      for (let r = seq.gate.row; r < seq.gate.row + seq.gate.height; r++) {
        for (let c = seq.gate.col; c < seq.gate.col + seq.gate.width; c++) {
          expect(isSolidChar(cell(config.grids, d, c, r))).toBe(false);
        }
      }
    }
  });

  it('puts a shrine before the gate and one near it', () => {
    expect(seq.shrines.length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...seq.shrines.map((s) => s.col))).toBeLessThan(config.spawn.col + 10);
    expect(Math.max(...seq.shrines.map((s) => s.col))).toBeLessThan(seq.gate.col);
  });
});

describe('chapter 5 collapse', () => {
  const config = CHAPTERS[4];
  const timing = config.collapse!;
  /** Seconds of slack to keep over the fastest conservative route. */
  const MARGIN = 1.5;

  it('has its last checkpoint before the trigger and none inside the collapse', () => {
    for (const c of config.checkpoints ?? []) expect(c.col).toBeLessThan(timing.triggerCol);
  });

  it('keeps the portal and its approach clear of the collapse', () => {
    expect(config.portal!.col).toBeGreaterThan(timing.toCol + 2);
    expect(timing.toCol).toBeGreaterThan(timing.triggerCol);
  });

  it('keeps the last fragment next to the trigger', () => {
    const last = config.fragments!.reduce((a, b) => (a.col > b.col ? a : b));
    expect(timing.triggerCol - last.col).toBeLessThanOrEqual(4);
    expect(timing.triggerCol - last.col).toBeGreaterThanOrEqual(0);
  });

  it.each(DIMENSIONS)('can be outrun with %s as the starting world', (dim) => {
    const reached = reach(config, { start: { col: timing.triggerCol, row: config.spawn.row - 1, dim }, startCost: 0 });
    expect(reachesPortal(reached, config)).toBe(true);
    for (let col = timing.triggerCol + 1; col <= timing.toCol; col++) {
      const arrive = earliestAtOrBeyond(reached, col + 1);
      const falls = removalTimeMs(col, timing) / 1000;
      expect(arrive + MARGIN, `column ${col}: arrive ${arrive.toFixed(1)}s, falls ${falls.toFixed(1)}s`).toBeLessThanOrEqual(falls);
    }
  });
});

describe('the analyzer is strict enough to be meaningful', () => {
  const strip = (config: (typeof CHAPTERS)[number], keep: (ch: string, row: number, col: number, d: Dimension) => string) => ({
    ...config,
    grids: {
      forgotten: config.grids.forgotten.map((line, r) => [...line].map((ch, c) => keep(ch, r, c, 'forgotten')).join('')),
      awakening: config.grids.awakening.map((line, r) => [...line].map((ch, c) => keep(ch, r, c, 'awakening')).join('')),
    },
  });

  it.each(CHAPTERS.filter((c) => c.grids.awakening.some((r) => r.includes('b'))))(
    '$id cannot be finished without its energy bridge',
    (config) => {
      const broken = strip(config, (ch) => (ch === 'b' ? '.' : ch));
      expect(reachesPortal(reach(broken), broken)).toBe(false);
    },
  );

  it.each([CHAPTERS[1], CHAPTERS[3]])('$id cannot be finished without its world-specific platforms', (config) => {
    // Remove every ledge that exists in only one world.
    const broken = strip(config, (ch, r, c, d) => {
      const otherGrid = config.grids[d === 'forgotten' ? 'awakening' : 'forgotten'];
      return ch === '=' && otherGrid[r][c] !== '=' ? '.' : ch;
    });
    expect(reachesPortal(reach(broken), broken)).toBe(false);
  });
});
