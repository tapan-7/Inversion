import Phaser from 'phaser';
import { GAME_HEIGHT, SCENE } from '../constants';
import { CHAPTERS, getLevel, levelKeyFromSearch } from '../levels';
import { progress, formatTime } from '../systems/ProgressManager';
import { audio } from '../systems/AudioEngine';
import { Parallax } from '../world/Parallax';
import { PALETTE } from '../world/Palette';
import { TEXTURE } from '../world/PixelArt';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import { shouldShowTouchControls } from '../ui/TouchControls';
import { restartOnResize } from '../ui/relayout';
import type { HowToPlaySceneData } from './HowToPlayScene';

export class MenuScene extends Phaser.Scene {
  private parallax!: Parallax;
  private starting = false;
  private levelKey = 'chapter1';
  private continueKey = 'chapter1';
  private scrollX = 0;

  constructor() {
    super(SCENE.Menu);
  }

  create(): void {
    restartOnResize(this);
    this.starting = false;
    this.scrollX = 0;
    this.cameras.main.fadeIn(300, 16, 26, 50);
    this.parallax = new Parallax(this);

    this.addEmbers();

    const cx = this.scale.width / 2;
    const text = (y: number, value: string, scale: number, tint: number) =>
      this.add
        .bitmapText(cx, y, PIXEL_FONT_KEY, value)
        .setOrigin(0.5)
        .setScale(scale)
        .setTint(tint)
        .setDepth(10);

    // Title with a hard drop shadow.
    text(66, 'INVERSION', 5, PALETTE.awakeningPurple).setPosition(cx + 2, 68).setDepth(9);
    text(66, 'INVERSION', 5, PALETTE.energyGlow);
    text(104, 'ECHOES OF TWO WORLDS', 2, 0x8fa6d6);

    this.levelKey = levelKeyFromSearch(window.location.search);
    const level = getLevel(this.levelKey);
    const touch = shouldShowTouchControls(this.game);
    // Continue resumes whichever chapter has a saved run. The test room never saves.
    const savedRun = level.persistent ? progress.run : null;
    const savedLevel = savedRun ? getLevel(savedRun.levelId) : null;
    const canContinue = !!savedLevel?.persistent;
    this.continueKey = savedLevel?.id ?? this.levelKey;
    const ids = CHAPTERS.map((c) => c.id);
    const totals = level.persistent ? progress.totals(ids) : null;
    if (totals && totals.completed > 0) {
      const best = totals.completed === ids.length ? `   ${formatTime(totals.timeMs)}` : '';
      text(126, `CHAPTERS ${totals.completed}/${ids.length} COMPLETE${best}`, 1, PALETTE.cyanAccent);
    }
    const chaptersOpen = level.persistent && progress.isUnlocked(ids, 1);

    // With a saved run, Continue is the main button and New Game sits below it.
    const startY = canContinue ? 150 : 158;
    const startButton = this.makeButton(cx, startY, canContinue ? 'CONTINUE' : 'START GAME');
    const newButton = canContinue ? this.makeButton(cx, startY + 34, 'NEW GAME') : null;

    const hint = canContinue
      ? touch
        ? 'TAP CONTINUE OR NEW GAME'
        : 'ENTER CONTINUE   N NEW GAME'
      : touch
        ? 'TAP START TO PLAY'
        : 'ENTER OR CLICK TO START';
    this.tweens.add({
      targets: text(canContinue ? 216 : 194, hint, 1, 0x8fa6d6),
      alpha: { from: 1, to: 0.35 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    if (!shouldShowTouchControls(this.game)) {
      text(GAME_HEIGHT - 14, 'ENTER START   S SETTINGS   H HOW TO PLAY', 1, 0x5878ab);
    }

    audio.setMenu();
    this.addSettingsButton();
    if (chaptersOpen) this.addChaptersButton();
    this.addHowToPlayButton();

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-S', this.openSettings, this);
    keyboard?.on('keydown-H', this.openHowToPlay, this);
    if (chaptersOpen) keyboard?.on('keydown-C', this.openChapters, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-S', this.openSettings, this);
      keyboard?.off('keydown-H', this.openHowToPlay, this);
      keyboard?.off('keydown-C', this.openChapters, this);
    });
    keyboard?.once('keydown-ENTER', () => this.startGame(canContinue));
    startButton.on('pointerdown', () => this.startGame(canContinue));
    if (newButton) {
      keyboard?.once('keydown-N', () => this.startGame(false));
      newButton.on('pointerdown', () => this.startGame(false));
    }
  }

  private addSettingsButton(): void {
    const label = this.add
      .bitmapText(this.scale.width - 10, 10, PIXEL_FONT_KEY, 'SETTINGS')
      .setOrigin(1, 0)
      .setTint(0x8fa6d6)
      .setDepth(10);
    const hit = this.add
      .zone(this.scale.width - 10, 6, label.width + 16, 22)
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => label.setTint(PALETTE.white));
    hit.on('pointerout',  () => label.setTint(0x8fa6d6));
    hit.on('pointerdown', () => this.openSettings());
  }

  private addHowToPlayButton(): void {
    const y = GAME_HEIGHT - 24;
    const label = this.add
      .bitmapText(10, y, PIXEL_FONT_KEY, 'HOW TO PLAY')
      .setTint(0x8fa6d6)
      .setDepth(10);
    const hit = this.add
      .zone(6, y - 2, label.width + 16, 18)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => label.setTint(PALETTE.cyanAccent));
    hit.on('pointerout',  () => label.setTint(0x8fa6d6));
    hit.on('pointerdown', () => this.openHowToPlay());
  }

  private addChaptersButton(): void {
    const label = this.add.bitmapText(10, 10, PIXEL_FONT_KEY, 'CHAPTERS').setTint(0x8fa6d6).setDepth(10);
    const hit = this.add
      .zone(6, 6, label.width + 16, 22)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => label.setTint(PALETTE.white));
    hit.on('pointerout', () => label.setTint(0x8fa6d6));
    hit.on('pointerdown', () => this.openChapters());
  }

  private openChapters(): void {
    if (this.starting) return;
    this.scene.pause();
    this.scene.launch(SCENE.Chapters);
    this.scene.bringToTop(SCENE.Chapters);
  }

  private openHowToPlay(): void {
    if (this.starting) return;
    this.scene.pause();
    this.scene.launch(SCENE.HowToPlay, { returnTo: SCENE.Menu } satisfies HowToPlaySceneData);
    this.scene.bringToTop(SCENE.HowToPlay);
  }

  private openSettings(): void {
    if (this.starting) return;
    this.scene.pause();
    this.scene.launch(SCENE.Settings, { returnTo: SCENE.Menu });
    this.scene.bringToTop(SCENE.Settings);
  }

  private makeButton(x: number, y: number, label: string): Phaser.GameObjects.Zone {
    const w = 140;
    const h = 28;
    const frame = this.add.graphics().setDepth(9);
    const draw = (hover: boolean) => {
      frame.clear();
      frame.fillStyle(hover ? PALETTE.awakeningPurple : PALETTE.deepNavy, 0.9);
      frame.fillRect(x - w / 2, y - h / 2, w, h);
      frame.lineStyle(2, hover ? PALETTE.white : PALETTE.energyGlow, 1);
      frame.strokeRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2);
    };
    draw(false);

    this.add
      .bitmapText(x, y, PIXEL_FONT_KEY, label)
      .setOrigin(0.5)
      .setScale(2)
      .setTint(PALETTE.white)
      .setDepth(10);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    return zone;
  }

  private addEmbers(): void {
    this.add
      .particles(0, GAME_HEIGHT + 4, TEXTURE.pixel, {
        x: { min: 0, max: this.scale.width },
        speedY: { min: -26, max: -10 },
        speedX: { min: -6, max: 6 },
        lifespan: { min: 4000, max: 9000 },
        frequency: 220,
        scale: { start: 1, end: 0.5 },
        alpha: { start: 0.9, end: 0 },
        tint: [PALETTE.energyGlow, PALETTE.cyanAccent, PALETTE.stoneHighlight],
      })
      .setDepth(5);
  }

  private startGame(resume: boolean): void {
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(250, 16, 26, 50);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE.Level, { levelId: resume ? this.continueKey : this.levelKey, resume });
    });
  }

  update(_time: number, delta: number): void {
    this.scrollX += delta * 0.012;
    this.parallax.update(this.scrollX * 100, delta);
  }
}
