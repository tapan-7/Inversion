import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../constants';
import { CHAPTERS } from '../levels';
import { audio } from '../systems/AudioEngine';
import { formatTime, progress } from '../systems/ProgressManager';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import { TEXTURE } from '../world/PixelArt';
import type { CompleteData } from './CompleteScene';

/** The ending: what the whole journey added up to. Drawn over the finished final chapter. */
export class EndingScene extends Phaser.Scene {
  private data_!: CompleteData;
  private done = false;

  constructor() {
    super(SCENE.Ending);
  }

  init(data: CompleteData): void {
    this.data_ = data;
    this.done = false;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const depth = DEPTH.ui + 40;
    const totals = progress.totals(CHAPTERS.map((c) => c.id));
    const totalEchoes = CHAPTERS.reduce((sum, c) => sum + (c.fragments?.length ?? 0), 0);
    const allFound = totals.fragments >= totalEchoes;

    // Both worlds sound together for the ending.
    audio.setMix(0.8, 0.8);
    audio.sfx('ending');

    const veil = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deepNavy, 0).setOrigin(0, 0).setDepth(depth);
    this.tweens.add({ targets: veil, fillAlpha: 0.94, duration: 1600, ease: 'Sine.InOut' });

    // Slow rising light, like the Awakening orbs.
    this.add
      .particles(0, GAME_HEIGHT + 4, TEXTURE.halo, {
        x: { min: 0, max: GAME_WIDTH },
        speedY: { min: -30, max: -12 },
        speedX: { min: -8, max: 8 },
        lifespan: { min: 5000, max: 9000 },
        frequency: 160,
        scale: { min: 0.15, max: 0.45 },
        alpha: { values: [0, 0.7, 0.7, 0] },
        tint: [PALETTE.energyGlow, PALETTE.cyanAccent, PALETTE.magenta],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(depth + 1);

    const lines: Array<{ y: number; text: string; scale: number; tint: number; delay: number }> = [
      { y: 40, text: 'THE ECHOES ARE RESTORED', scale: 3, tint: PALETTE.energyGlow, delay: 1400 },
      { y: 68, text: 'BOTH WORLDS ARE ONE AGAIN', scale: 1, tint: 0x8fa6d6, delay: 2200 },
      {
        y: 110,
        text: `ECHOES  ${totals.fragments}/${totalEchoes}`,
        scale: 2,
        tint: allFound ? PALETTE.cyanAccent : PALETTE.white,
        delay: 3000,
      },
      { y: 136, text: `TOTAL TIME  ${formatTime(totals.timeMs)}`, scale: 2, tint: PALETTE.white, delay: 3600 },
      { y: 158, text: `THIS RUN  ${formatTime(this.data_.timeMs)}`, scale: 1, tint: 0x8fa6d6, delay: 3900 },
      {
        y: 176,
        text: allFound ? 'EVERY ECHO WAS FOUND' : 'REPLAY ANY CHAPTER TO FIND THE REST',
        scale: 1,
        tint: allFound ? PALETTE.cyanAccent : 0x8fa6d6,
        delay: 4200,
      },
    ];
    for (const line of lines) {
      const label = this.add
        .bitmapText(cx, line.y, PIXEL_FONT_KEY, line.text)
        .setOrigin(0.5)
        .setScale(line.scale)
        .setTint(line.tint)
        .setDepth(depth + 2)
        .setAlpha(0);
      this.tweens.add({ targets: label, alpha: 1, y: line.y - 4, duration: 700, delay: line.delay, ease: 'Sine.Out' });
    }

    const menuHint = this.add
      .bitmapText(cx, GAME_HEIGHT - 28, PIXEL_FONT_KEY, 'ENTER OR TAP FOR THE MENU')
      .setOrigin(0.5)
      .setTint(0x8fa6d6)
      .setDepth(depth + 2)
      .setAlpha(0);
    this.tweens.add({ targets: menuHint, alpha: { from: 0.2, to: 1 }, duration: 900, delay: 5200, yoyo: true, repeat: -1 });

    // Input only counts once the lines have appeared, so a stray press cannot skip the ending.
    this.time.delayedCall(5000, () => {
      this.input.keyboard?.on('keydown-ENTER', this.menu, this);
      this.input.on('pointerdown', this.menu, this);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', this.menu, this);
      this.input.off('pointerdown', this.menu, this);
    });
  }

  private menu(): void {
    if (this.done) return;
    this.done = true;
    this.scene.stop(SCENE.UI);
    this.scene.stop(SCENE.Level);
    this.scene.start(SCENE.Menu);
  }
}
