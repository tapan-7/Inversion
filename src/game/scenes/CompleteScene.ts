import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../constants';
import { formatTime } from '../systems/ProgressManager';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';

export interface CompleteData {
  levelId: string;
  /** Key used to reopen the level, as passed to the Level scene. */
  levelKey?: string;
  title: string;
  found: number;
  total: number;
  timeMs: number;
  bestTimeMs: number;
  isNewBest: boolean;
  /** Level key of the next chapter, when there is one. */
  next?: string;
}

/** Level complete panel, drawn over the frozen level. */
export class CompleteScene extends Phaser.Scene {
  private data_!: CompleteData;
  private done = false;

  constructor() {
    super(SCENE.Complete);
  }

  init(data: CompleteData): void {
    this.data_ = data;
    this.done = false;
  }

  create(): void {
    const d = this.data_;
    const cx = GAME_WIDTH / 2;
    const depth = DEPTH.ui + 10;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deepNavy, 0.72).setOrigin(0, 0).setDepth(depth);

    const panelW = 260;
    const panelH = 150;
    const panel = this.add.graphics().setDepth(depth + 1);
    panel.fillStyle(PALETTE.deepNavy, 0.95);
    panel.fillRect(cx - panelW / 2, 48, panelW, panelH);
    panel.lineStyle(2, PALETTE.energyGlow, 1);
    panel.strokeRect(cx - panelW / 2 + 1, 49, panelW - 2, panelH - 2);

    const text = (y: number, value: string, scale: number, tint: number) =>
      this.add
        .bitmapText(cx, y, PIXEL_FONT_KEY, value)
        .setOrigin(0.5)
        .setScale(scale)
        .setTint(tint)
        .setDepth(depth + 2);

    text(68, 'CHAPTER COMPLETE', 2, PALETTE.energyGlow);
    text(86, d.title.toUpperCase(), 1, 0x8fa6d6);
    text(112, `ECHOES  ${d.found}/${d.total}`, 2, d.found === d.total ? PALETTE.cyanAccent : PALETTE.white);
    text(134, `TIME  ${formatTime(d.timeMs)}`, 2, PALETTE.white);
    text(
      152,
      d.isNewBest ? 'NEW BEST TIME' : `BEST  ${formatTime(d.bestTimeMs)}`,
      1,
      d.isNewBest ? PALETTE.cyanAccent : 0x8fa6d6,
    );

    const primary = d.next ? () => this.nextChapter() : () => this.replay();
    if (d.next) {
      this.makeButton(cx - 104, 180, 'NEXT', () => this.nextChapter());
      this.makeButton(cx, 180, 'REPLAY', () => this.replay());
      this.makeButton(cx + 104, 180, 'MENU', () => this.menu());
    } else {
      this.makeButton(cx - 60, 180, 'REPLAY', () => this.replay());
      this.makeButton(cx + 60, 180, 'MENU', () => this.menu());
    }
    text(GAME_HEIGHT - 14, d.next ? 'ENTER NEXT CHAPTER   R REPLAY   ESC MENU' : 'ENTER REPLAY   ESC MENU', 1, 0x5878ab);

    this.input.keyboard?.on('keydown-ENTER', primary);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', primary);
    });
  }

  private makeButton(x: number, y: number, label: string, onPress: () => void): void {
    const w = 96;
    const h = 22;
    const depth = DEPTH.ui + 12;
    const frame = this.add.graphics().setDepth(depth);
    const draw = (hover: boolean) => {
      frame.clear();
      frame.fillStyle(hover ? PALETTE.awakeningPurple : PALETTE.deepNavy, 0.95);
      frame.fillRect(x - w / 2, y - h / 2, w, h);
      frame.lineStyle(2, hover ? PALETTE.white : PALETTE.energyGlow, 1);
      frame.strokeRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2);
    };
    draw(false);
    this.add.bitmapText(x, y, PIXEL_FONT_KEY, label).setOrigin(0.5).setScale(2).setTint(PALETTE.white).setDepth(depth + 1);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(depth + 2);
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerdown', onPress);
  }

  private nextChapter(): void {
    if (this.done || !this.data_.next) return;
    this.done = true;
    this.scene.stop();
    this.scene.start(SCENE.Level, { levelId: this.data_.next, resume: false });
  }

  private replay(): void {
    if (this.done) return;
    this.done = true;
    this.scene.stop();
    this.scene.start(SCENE.Level, { levelId: this.data_.levelKey, resume: false });
  }

  private menu(): void {
    if (this.done) return;
    this.done = true;
    this.scene.stop(SCENE.UI);
    this.scene.stop(SCENE.Level);
    this.scene.start(SCENE.Menu);
  }
}
