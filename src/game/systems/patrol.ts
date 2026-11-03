/** Back and forth patrol for the Watcher. No Phaser dependencies. */

export interface PatrolState {
  x: number;
  dir: 1 | -1;
  /** Seconds left standing still at an end of the route. */
  pause: number;
}

/** Advances a patrol by `dt` seconds. Waits at each end, then turns around. */
export function stepPatrol(
  state: PatrolState,
  minX: number,
  maxX: number,
  speed: number,
  pauseSeconds: number,
  dt: number,
): PatrolState {
  let { x, dir, pause } = state;
  if (pause > 0) {
    pause = Math.max(0, pause - dt);
    return { x, dir, pause };
  }

  x += dir * speed * dt;
  if (x >= maxX) {
    x = maxX;
    dir = -1;
    pause = pauseSeconds;
  } else if (x <= minX) {
    x = minX;
    dir = 1;
    pause = pauseSeconds;
  }
  return { x, dir, pause };
}
