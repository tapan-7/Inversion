import Phaser from 'phaser';
import {
  DEFAULT_LIVES,
  DEPTH,
  GAME_EVENT,
  MAX_LIVES,
  REGISTRY_CHAPTER,
  REGISTRY_DIMENSION,
  REGISTRY_FRAGMENTS,
  REGISTRY_LIVES,
  SCENE,
} from '../constants';
import { DIMENSION_ACCENT } from '../systems/DimensionManager';
import { settings } from '../systems/Settings';
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
  private chapterHeader!: Phaser.GameObjects.BitmapText;
  private indicator!: Phaser.GameObjects.BitmapText;
  private echoes!: Phaser.GameObjects.BitmapText;
  private livesText!: Phaser.GameObjects.BitmapText;
  private tip?: Phaser.GameObjects.Container;
  private dimension: Dimension = 'forgotten';

  constructor() {
    super(SCENE.UI);
  }

  create(data: { chapter?: string }): void {
    const initialChapter = (this.registry.get(REGISTRY_CHAPTER) as string | undefined) ?? data.chapter ?? '';
    this.chapterHeader = this.add
      .bitmapText(8, 8, PIXEL_FONT_KEY, initialChapter.toUpperCase())
      .setTint(PALETTE.energyGlow)
      .setAlpha(0.85)
      .setDepth(DEPTH.ui);

    const onChapter = (_parent: unknown, value: string) => {
      this.chapterHeader.setText((value ?? '').toUpperCase());
    };
    this.registry.events.on(`changedata-${REGISTRY_CHAPTER}`, onChapter);

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

    this.livesText = this.add
      .bitmapText(8, 44, PIXEL_FONT_KEY, '')
      .setTint(PALETTE.neonCoral)
      .setDepth(DEPTH.ui);
    this.showLives((this.registry.get(REGISTRY_LIVES) as number | undefined) ?? DEFAULT_LIVES);
    const onLives = (_parent: unknown, value: number) => this.showLives(value, true);
    this.registry.events.on(`changedata-${REGISTRY_LIVES}`, onLives);

    const onChange = (_parent: unknown, value: Dimension) => {
      this.dimension = value;
      this.showDimension();
    };
    const onBlocked = () => this.flashBlocked();
    this.registry.events.on(`changedata-${REGISTRY_DIMENSION}`, onChange);
    this.game.events.on(GAME_EVENT.DimensionBlocked, onBlocked);

    this.syncTouch();
    // The touch buttons hug the screen edges, so they move when the window changes shape.
    const onResize = () => {
      this.touch?.destroy();
      this.touch = undefined;
      this.syncTouch();
      this.tip?.setX(this.scale.width / 2);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    const stopSettings = settings.onChange(() => this.syncTouch());

    const onTipShow = (tip: { id: string; text: string }) => this.showTip(tip.text);
    const onTipHide = () => this.hideTip();
    this.game.events.on(GAME_EVENT.TipShow, onTipShow);
    this.game.events.on(GAME_EVENT.TipHide, onTipHide);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      stopSettings();
      this.game.events.off(GAME_EVENT.TipShow, onTipShow);
      this.game.events.off(GAME_EVENT.TipHide, onTipHide);
      this.tip = undefined;
      this.registry.events.off(`changedata-${REGISTRY_CHAPTER}`, onChapter);
      this.registry.events.off(`changedata-${REGISTRY_DIMENSION}`, onChange);
      this.registry.events.off(`changedata-${REGISTRY_FRAGMENTS}`, onFragments);
      this.registry.events.off(`changedata-${REGISTRY_LIVES}`, onLives);
      this.game.events.off(GAME_EVENT.DimensionBlocked, onBlocked);
      this.touch?.destroy();
      this.touch = undefined;
    });
  }

  /** Creates or removes the touch buttons to match the Touch Controls setting. */
  private syncTouch(): void {
    const want = shouldShowTouchControls(this.game);
    if (want && !this.touch) this.touch = new TouchControls(this);
    if (!want && this.touch) {
      this.touch.destroy();
      this.touch = undefined;
    }
  }

  private showTip(text: string): void {
    this.hideTip(true);
    const label = this.add.bitmapText(0, 0, PIXEL_FONT_KEY, text).setOrigin(0.5).setTint(PALETTE.white);
    const w = label.width + 22;
    const frame = this.add.graphics();
    frame.fillStyle(PALETTE.deepNavy, 0.85);
    frame.fillRect(-w / 2, -11, w, 22);
    frame.lineStyle(1, PALETTE.cyanAccent, 1);
    frame.strokeRect(-w / 2 + 0.5, -10.5, w - 1, 21);
    const container = this.add
      .container(this.scale.width / 2, 66, [frame, label])
      .setDepth(DEPTH.ui)
      .setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, y: 62, duration: 280, ease: 'Sine.Out' });
    this.tip = container;
  }

  private hideTip(immediate = false): void {
    const tip = this.tip;
    if (!tip) return;
    this.tip = undefined;
    if (immediate) {
      tip.destroy();
      return;
    }
    this.tweens.add({ targets: tip, alpha: 0, duration: 260, onComplete: () => tip.destroy() });
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

  private showLives(lives: number, pop = false): void {
    const full = '♥';
    const empty = '♡';
    const total = MAX_LIVES;
    const count = Math.max(0, Math.min(total, lives));
    const hearts = `${full.repeat(count)}${empty.repeat(total - count)}`;
    this.livesText.setText(`LIVES ${hearts}`);
    if (!pop) return;
    this.tweens.add({
      targets: this.livesText,
      scale: { from: 1.3, to: 1 },
      duration: 220,
      ease: 'Back.Out',
    });
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
