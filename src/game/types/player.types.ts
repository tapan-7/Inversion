import type { PlayerState } from '../enums/player-state.enum';

export interface PlayerMovementState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  state: PlayerState;
}

export interface PlayerBounds {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

