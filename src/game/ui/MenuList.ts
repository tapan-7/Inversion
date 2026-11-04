import Phaser from 'phaser';
import { audio } from '../systems/AudioEngine';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';

export interface MenuItem {
  label: () => string;
  /** Enter, Space, click or tap. */
  onSelect: () => void;
  /** Left and right keys, for rows that adjust a value. */
  onLeft?: () => void;
  onRight?: () => void;
}

interface Row {
  text: Phaser.GameObjects.BitmapText;
  zone: Phaser.GameObjects.Zone;
  item: MenuItem;
}

/** A vertical menu driven by keyboard (arrows, W/S, Enter) and pointer or touch. */
export class MenuList {
  private readonly rows: Row[] = [];
  private selected = 0;
  private readonly marker: Phaser.GameObjects.Graphics;
  private readonly cleanup: () => void;
  private readonly centerX: number;

  constructor(
    scene: Phaser.Scene,
    items: MenuItem[],
    options: { y: number; rowHeight?: number; depth: number; width?: number },
  ) {
    this.centerX = scene.scale.width / 2;
    const rowHeight = options.rowHeight ?? 26;
    const width = options.width ?? 220;
    const cx = scene.scale.width / 2;
    this.marker = scene.add.graphics().setDepth(options.depth);

    items.forEach((item, index) => {
      const y = options.y + index * rowHeight;
      const text = scene.add
        .bitmapText(cx, y, PIXEL_FONT_KEY, item.label())
        .setOrigin(0.5)
        .setScale(2)
        .setDepth(options.depth + 1);
      const zone = scene.add
        .zone(cx, y, width, rowHeight - 2)
        .setInteractive({ useHandCursor: true })
        .setDepth(options.depth + 2);
      zone.on('pointerover', () => this.select(index));
      zone.on('pointerdown', () => {
        this.select(index);
        this.activate();
      });
      this.rows.push({ text, zone, item });
    });

    const keyboard = scene.input.keyboard;
    const bind = (names: string[], fn: () => void) => names.forEach((n) => keyboard?.on(`keydown-${n}`, fn));
    const up = () => this.move(-1);
    const down = () => this.move(1);
    const left = () => this.adjust('onLeft');
    const right = () => this.adjust('onRight');
    const select = () => this.activate();
    bind(['UP', 'W'], up);
    bind(['DOWN', 'S'], down);
    bind(['LEFT', 'A'], left);
    bind(['RIGHT', 'D'], right);
    bind(['ENTER', 'SPACE'], select);
    this.cleanup = () => {
      for (const [names, fn] of [
        [['UP', 'W'], up],
        [['DOWN', 'S'], down],
        [['LEFT', 'A'], left],
        [['RIGHT', 'D'], right],
        [['ENTER', 'SPACE'], select],
      ] as const) {
        names.forEach((n) => keyboard?.off(`keydown-${n}`, fn));
      }
    };
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    this.refresh();
  }

  /** Re-reads every label and redraws the selection. */
  refresh(): void {
    this.rows.forEach((row, i) => {
      row.text.setText(row.item.label());
      row.text.setTint(i === this.selected ? PALETTE.cyanAccent : PALETTE.white);
    });
    const row = this.rows[this.selected];
    this.marker.clear();
    if (!row) return;
    // The text is already scaled, so its width is the displayed width.
    const w = Math.max(row.text.width + 28, 120);
    this.marker.lineStyle(2, PALETTE.energyGlow, 1);
    this.marker.strokeRect(this.centerX - w / 2, row.text.y - 12, w, 24);
  }

  private select(index: number): void {
    if (index === this.selected) return;
    this.selected = index;
    audio.sfx('click');
    this.refresh();
  }

  private move(direction: 1 | -1): void {
    this.select((this.selected + direction + this.rows.length) % this.rows.length);
  }

  private adjust(which: 'onLeft' | 'onRight'): void {
    const fn = this.rows[this.selected]?.item[which];
    if (!fn) return;
    fn();
    audio.sfx('click');
    this.refresh();
  }

  private activate(): void {
    const item = this.rows[this.selected]?.item;
    if (!item) return;
    audio.sfx('click');
    item.onSelect();
    this.refresh();
  }

  get selectedIndex(): number {
    return this.selected;
  }
}
