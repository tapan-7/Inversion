/** Timing of the collapsing finale. No Phaser dependencies. */

export interface CollapseTiming {
  /** First column to fall. */
  fromCol: number;
  /** Last column to fall. */
  toCol: number;
  /** Milliseconds between the trigger and the first column falling. */
  delayMs: number;
  /** Columns that fall per second after that. */
  speed: number;
}

/** Milliseconds after the trigger at which a column falls. */
export function removalTimeMs(col: number, timing: CollapseTiming): number {
  return timing.delayMs + ((col - timing.fromCol) / timing.speed) * 1000;
}

/** Columns whose fall time lies in (previousMs, nowMs]. Empty when nothing is due. */
export function columnsDue(previousMs: number, nowMs: number, timing: CollapseTiming): number[] {
  const due: number[] = [];
  for (let col = timing.fromCol; col <= timing.toCol; col++) {
    const t = removalTimeMs(col, timing);
    if (t > previousMs && t <= nowMs) due.push(col);
    if (t > nowMs) break;
  }
  return due;
}
