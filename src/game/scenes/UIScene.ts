import Phaser from 'phaser';
import { DEPTH, SCENE } from '../constants';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import { TouchControls, shouldShowTouchControls } from '../ui/TouchControls';

/** Overlay scene: HUD text and on-screen touch controls. Runs above the level. */
export class UIScene extends Phaser.Scene {
  private touch?: TouchControls;

  constructor() {
    super(SCENE.UI);
  }

  create(data: { chapter?: string }): void {
    this.add
      .bitmapText(8, 8, PIXEL_FONT_KEY, (data.chapter ?? '').toUpperCase())
      .setTint(PALETTE.energyGlow)
      .setAlpha(0.85)
      .setDepth(DEPTH.ui);

    if (shouldShowTouchControls(this.game)) {
      this.touch = new TouchControls(this);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.touch?.destroy();
      this.touch = undefined;
    });
  }

  update(): void {
    this.touch?.update();
  }
}
