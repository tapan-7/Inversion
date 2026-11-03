import Phaser from 'phaser';
import { DEPTH, GAME_EVENT, REGISTRY_DIMENSION, REGISTRY_FRAGMENTS, SCENE } from '../constants';
import { DIMENSION_ACCENT } from '../systems/DimensionManager';
import type { Dimension } from '../world/dimensionMath';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import { TouchControls, shouldShowTouchControls } from '../ui/TouchControls';

interface FragmentCount {
  found: number;
  total: number;
}

/** Overlay scene: HUD text and on-screen touch controls. Runs above the level. */
export class UIScene extends Phaser.Scene {
  private touch?: TouchControls;
  private indicator!: Phaser.GameObjects.BitmapText;
  private echoes!: Phaser.GameObjects.BitmapText;
  private dimension: Dimension = 'forgotten';

  constructor() {
    super(SCENE.UI);
  }

  create(data: { chapter?: string }): void {
    this.add
      .bitmapText(8, 8, PIXEL_FONT_KEY, (data.chapter ?? '').toUpperCase())
      .setTint(PALETTE.energyGlow)
      .setAlpha(0.85)
      .setDepth(DEPTH.ui);

    this.dimension = (this.registry.get(REGISTRY_DIMENSION) as Dimension | undefined) ?? 'forgotten';
    this.indicator = this.add
      .bitmapText(8, 20, PIXEL_FONT_KEY, '')
      .setDepth(DEPTH.ui);
    this.showDimension();

    this.echoes = this.add
      .bitmapText(8, 32, PIXEL_FONT_KEY, '')
      .setTint(PALETTE.energyGlow)
      .setDepth(DEPTH.ui);
    this.showFragments(this.registry.get(REGISTRY_FRAGMENTS) as FragmentCount | undefined);
    const onFragments = (_parent: unknown, value: FragmentCount) => this.showFragments(value, true);
    this.registry.events.on(`changedata-${REGISTRY_FRAGMENTS}`, onFragments);

    const onChange = (_parent: unknown, value: Dimension) => {
      this.dimension = value;
      this.showDimension();
    };
    const onBlocked = () => this.flashBlocked();
    this.registry.events.on(`changedata-${REGISTRY_DIMENSION}`, onChange);
    this.game.events.on(GAME_EVENT.DimensionBlocked, onBlocked);

    if (shouldShowTouchControls(this.game)) {
      this.touch = new TouchControls(this);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off(`changedata-${REGISTRY_DIMENSION}`, onChange);
      this.registry.events.off(`changedata-${REGISTRY_FRAGMENTS}`, onFragments);
      this.game.events.off(GAME_EVENT.DimensionBlocked, onBlocked);
      this.touch?.destroy();
      this.touch = undefined;
    });
  }

  private showFragments(count: FragmentCount | undefined, pop = false): void {
    if (!count || count.total === 0) {
      this.echoes.setText('');
      return;
    }
    this.echoes.setText(`ECHOES ${count.found}/${count.total}`);
    this.echoes.setTint(count.found === count.total ? PALETTE.cyanAccent : PALETTE.energyGlow);
    if (!pop) return;
    this.tweens.add({ targets: this.echoes, scale: { from: 1.5, to: 1 }, duration: 260, ease: 'Back.Out' });
  }

  private showDimension(): void {
    this.indicator
      .setText(this.dimension.toUpperCase())
      .setTint(DIMENSION_ACCENT[this.dimension])
      .setAlpha(0.95);
  }

  private flashBlocked(): void {
    this.indicator.setText('BLOCKED').setTint(PALETTE.blocked);
    this.time.delayedCall(550, () => this.showDimension());
  }

  update(): void {
    this.touch?.update();
  }
}
