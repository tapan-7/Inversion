import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, SCENE } from '../constants';
import { CHAPTERS } from '../levels';
import { formatTime, progress } from '../systems/ProgressManager';
import { MenuList } from '../ui/MenuList';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';

/** Chapter select. A chapter opens once the one before it has been finished. */
export class ChaptersScene extends Phaser.Scene {
  private closing = false;

  constructor() {
    super(SCENE.Chapters);
  }

  init(): void {
    this.closing = false;
  }

  create(): void {
    const depth = DEPTH.ui + 30;
    const cx = GAME_WIDTH / 2;
    const ids = CHAPTERS.map((c) => c.id);

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.deepNavy, 1).setOrigin(0, 0).setDepth(depth);
    this.add
      .bitmapText(cx, 34, PIXEL_FONT_KEY, 'CHAPTERS')
      .setOrigin(0.5)
      .setScale(3)
      .setTint(PALETTE.energyGlow)
      .setDepth(depth + 1);

    new MenuList(
      this,
      [
        ...CHAPTERS.map((chapter, index) => ({
          label: () => {
            const open = progress.isUnlocked(ids, index);
            const record = progress.chapter(chapter.id);
            const best = record?.bestTimeMs ? `  ${formatTime(record.bestTimeMs)}` : '';
            return open
              ? `${chapter.chapter} ${chapter.name.toUpperCase()}${record?.completed ? ' *' : ''}${best}`
              : `${chapter.chapter} LOCKED`;
          },
          onSelect: () => {
            if (!progress.isUnlocked(ids, index)) return;
            this.start(chapter.id);
          },
        })),
        { label: () => 'BACK', onSelect: () => this.close() },
      ],
      { y: 72, rowHeight: 26, depth: depth + 1, width: 420 },
    );

    this.add
      .bitmapText(cx, GAME_HEIGHT - 14, PIXEL_FONT_KEY, 'UP DOWN SELECT   ENTER PLAY   ESC BACK   * FINISHED')
      .setOrigin(0.5)
      .setTint(0x5878ab)
      .setDepth(depth + 1);

    this.input.keyboard?.on('keydown-ESC', this.close, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
    });
  }

  private start(levelKey: string): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop(SCENE.Menu);
    this.scene.stop();
    this.scene.start(SCENE.Level, { levelId: levelKey, resume: false });
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop();
    this.scene.resume(SCENE.Menu);
  }
}
