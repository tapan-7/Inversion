import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, SCENE } from '../constants';
import { settings, stepVolume, TOUCH_MODES } from '../systems/Settings';
import { MenuList } from '../ui/MenuList';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import { restartOnResize } from '../ui/relayout';
import type { HowToPlaySceneData } from './HowToPlayScene';

export interface SettingsSceneData {
  /** Scene to resume when this one closes. */
  returnTo: string;
}

const onOff = (v: boolean) => (v ? 'ON' : 'OFF');

/** Settings overlay, opened from the main menu or the pause menu. */
export class SettingsScene extends Phaser.Scene {
  private returnTo: string = SCENE.Menu;
  private closing = false;

  constructor() {
    super(SCENE.Settings);
  }

  init(data: SettingsSceneData): void {
    this.returnTo = data.returnTo;
    this.closing = false;
  }

  create(): void {
    restartOnResize(this);
    const depth = DEPTH.ui + 30;
    const cx = this.scale.width / 2;
    this.add.rectangle(0, 0, this.scale.width, GAME_HEIGHT, PALETTE.deepNavy, 1).setOrigin(0, 0).setDepth(depth);
    this.add
      .bitmapText(cx, 34, PIXEL_FONT_KEY, 'SETTINGS')
      .setOrigin(0.5)
      .setScale(3)
      .setTint(PALETTE.energyGlow)
      .setDepth(depth + 1);

    const list = new MenuList(
      this,
      [
        {
          label: () => `VOLUME ${Math.round(settings.data.volume * 10)}/10`,
          onSelect: () => {
            const v = settings.data.volume;
            settings.update({ volume: v >= 1 ? 0 : stepVolume(v, 1) });
          },
          onLeft: () => settings.update({ volume: stepVolume(settings.data.volume, -1) }),
          onRight: () => settings.update({ volume: stepVolume(settings.data.volume, 1) }),
        },
        {
          label: () => `SOUND ${onOff(!settings.data.muted)}`,
          onSelect: () => settings.update({ muted: !settings.data.muted }),
          onLeft: () => settings.update({ muted: !settings.data.muted }),
          onRight: () => settings.update({ muted: !settings.data.muted }),
        },
        {
          label: () => `LOW EFFECTS ${onOff(settings.data.lowEffects)}`,
          onSelect: () => settings.update({ lowEffects: !settings.data.lowEffects }),
          onLeft: () => settings.update({ lowEffects: !settings.data.lowEffects }),
          onRight: () => settings.update({ lowEffects: !settings.data.lowEffects }),
        },
        {
          label: () => `TOUCH CONTROLS ${settings.data.touchControls.toUpperCase()}`,
          onSelect: () => this.cycleTouch(1),
          onLeft: () => this.cycleTouch(-1),
          onRight: () => this.cycleTouch(1),
        },
        {
          label: () => 'RESET TIPS',
          onSelect: () => settings.resetTips(),
        },
        { label: () => 'HOW TO PLAY', onSelect: () => this.openHowToPlay() },
        { label: () => 'BACK', onSelect: () => this.close() },
      ],
      { y: 70, rowHeight: 23, depth: depth + 1, width: 300 },
    );
    void list;

    this.add
      .bitmapText(cx, GAME_HEIGHT - 16, PIXEL_FONT_KEY, 'UP DOWN SELECT   LEFT RIGHT CHANGE   ESC BACK')
      .setOrigin(0.5)
      .setTint(0x5878ab)
      .setDepth(depth + 1);

    this.input.keyboard?.on('keydown-ESC', this.close, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
    });
  }

  private openHowToPlay(): void {
    this.scene.pause();
    this.scene.launch(SCENE.HowToPlay, { returnTo: SCENE.Settings } satisfies HowToPlaySceneData);
    this.scene.bringToTop(SCENE.HowToPlay);
  }

  private cycleTouch(step: 1 | -1): void {
    const i = TOUCH_MODES.indexOf(settings.data.touchControls);
    const next = TOUCH_MODES[(i + step + TOUCH_MODES.length) % TOUCH_MODES.length];
    settings.update({ touchControls: next });
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop();
    this.scene.resume(this.returnTo);
  }
}
