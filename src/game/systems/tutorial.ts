/** Decides when tutorial banners appear and go away. No Phaser dependencies. */
import type { TipConfig } from '../levels/types';

export interface TipActions {
  switched: boolean;
  jumped: boolean;
}

export type TipChange = { show: TipConfig } | { hide: TipConfig } | null;

/** Seconds a tip stays after the player walks out of its zone. */
const LINGER_SECONDS = 1.2;
const DEFAULT_SECONDS = 7;

export class TutorialState {
  private active: TipConfig | null = null;
  private shownFor = 0;
  private outsideFor = 0;

  constructor(
    private readonly tips: readonly TipConfig[],
    private readonly tileSize: number,
    private readonly isSeen: (id: string) => boolean,
    private readonly markSeen: (id: string) => void,
  ) {}

  get current(): TipConfig | null {
    return this.active;
  }

  private inZone(tip: TipConfig, x: number): boolean {
    const col = x / this.tileSize;
    return col >= tip.fromCol && col < tip.toCol + 1;
  }

  /**
   * Call every frame with the player's x, what the player just did, and the frame time in seconds.
   * Returns a change to apply, or null.
   */
  update(x: number, actions: TipActions, dt: number): TipChange {
    if (this.active) {
      const tip = this.active;
      this.shownFor += dt;
      this.outsideFor = this.inZone(tip, x) ? 0 : this.outsideFor + dt;

      const done =
        (tip.dismiss === 'switch' && actions.switched) ||
        (tip.dismiss === 'jump' && actions.jumped) ||
        this.shownFor >= (tip.seconds ?? DEFAULT_SECONDS) ||
        this.outsideFor >= LINGER_SECONDS;
      if (!done) return null;

      this.markSeen(tip.id);
      this.active = null;
      return { hide: tip };
    }

    const next = this.tips.find((tip) => !this.isSeen(tip.id) && this.inZone(tip, x));
    if (!next) return null;
    this.active = next;
    this.shownFor = 0;
    this.outsideFor = 0;
    return { show: next };
  }

  /** Hides the current tip without marking it seen, e.g. when the level is left. */
  cancel(): TipConfig | null {
    const tip = this.active;
    this.active = null;
    return tip;
  }
}
