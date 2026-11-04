import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, SCENE } from '../constants';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import { restartOnResize } from '../ui/relayout';

export interface HowToPlaySceneData {
  /** Scene to resume/stop when this overlay closes. */
  returnTo: string;
}

// ─── pixel-art panel helpers ─────────────────────────────────────────────────

function drawPixelPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: number = PALETTE.cyanAccent,
): void {
  // Fill
  g.fillStyle(PALETTE.deepNavy, 0.96);
  g.fillRect(x + 4, y, w - 8, h);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillRect(x, y + 4, w, h - 8);

  // Border
  g.fillStyle(borderColor, 1);
  g.fillRect(x + 4, y, w - 8, 2);
  g.fillRect(x + 4, y + h - 2, w - 8, 2);
  g.fillRect(x, y + 4, 2, h - 8);
  g.fillRect(x + w - 2, y + 4, 2, h - 8);
  // Stepped corners
  g.fillRect(x + 2, y + 2, 2, 2);
  g.fillRect(x + w - 4, y + 2, 2, 2);
  g.fillRect(x + 2, y + h - 4, 2, 2);
  g.fillRect(x + w - 4, y + h - 4, 2, 2);

  // Inner top highlight
  g.fillStyle(PALETTE.white, 0.08);
  g.fillRect(x + 6, y + 2, w - 12, 1);
  // Bottom shadow
  g.fillStyle(PALETTE.stoneShadow, 0.5);
  g.fillRect(x + 6, y + h - 3, w - 12, 1);

  // Accent pixel dots
  g.fillStyle(PALETTE.magenta, 1);
  g.fillRect(x + 6, y - 2, 2, 2);
  g.fillRect(x + w - 8, y + h, 2, 2);
}

/** Draws a pixelated key cap badge. */
function drawKeyBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // Key body
  g.fillStyle(PALETTE.stoneMid, 1);
  g.fillRect(x + 2, y, w - 4, h);
  g.fillRect(x, y + 2, w, h - 4);
  // Key border
  g.fillStyle(PALETTE.cyanAccent, 0.9);
  g.fillRect(x + 2, y, w - 4, 1);
  g.fillRect(x + 2, y + h - 1, w - 4, 1);
  g.fillRect(x, y + 2, 1, h - 4);
  g.fillRect(x + w - 1, y + 2, 1, h - 4);
  // Key top sheen
  g.fillStyle(PALETTE.white, 0.18);
  g.fillRect(x + 3, y + 1, w - 6, 1);
  // Key bottom shadow
  g.fillStyle(PALETTE.stoneShadow, 0.8);
  g.fillRect(x + 3, y + h - 2, w - 6, 1);
}

// ─── control definitions ─────────────────────────────────────────────────────

interface ControlEntry {
  num: string;
  action: string;
  desc: string;
  keys: { label: string; wide?: boolean }[];
  color?: number;
}

const CONTROLS: ControlEntry[] = [
  {
    num: '01',
    action: 'MOVE',
    desc: 'Walk left or right',
    keys: [{ label: 'A' }, { label: 'D' }],
    color: PALETTE.cyanAccent,
  },
  {
    num: '02',
    action: 'MOVE (ALT)',
    desc: 'Arrow keys also move',
    keys: [{ label: '\u2190' }, { label: '\u2192' }],
    color: PALETTE.cyanAccent,
  },
  {
    num: '03',
    action: 'JUMP',
    desc: 'Short tap = small hop',
    keys: [{ label: 'W' }, { label: 'Z' }],
    color: PALETTE.energyGlow,
  },
  {
    num: '04',
    action: 'HIGH JUMP',
    desc: 'Hold jump key longer',
    keys: [{ label: 'W', wide: false }],
    color: PALETTE.energyGlow,
  },
  {
    num: '05',
    action: 'SWITCH',
    desc: 'Flip between worlds',
    keys: [{ label: 'SPACE', wide: true }],
    color: PALETTE.magenta,
  },
  {
    num: '06',
    action: 'MID-AIR SWITCH',
    desc: 'Switch while jumping to\ncross gaps & reach paths',
    keys: [{ label: 'SPACE', wide: true }],
    color: PALETTE.magenta,
  },
  {
    num: '07',
    action: 'PAUSE',
    desc: 'Open pause menu',
    keys: [{ label: 'ESC' }, { label: 'P' }],
    color: PALETTE.stoneHighlight,
  },
  {
    num: '08',
    action: 'RESTART',
    desc: 'Restart current level',
    keys: [{ label: 'R' }],
    color: PALETTE.stoneHighlight,
  },
];

const TIPS = [
  { icon: '\u25C6', text: 'Worlds share the same space — objects exist in one or both.' },
  { icon: '\u25C6', text: 'Some walls only block you in one world. Use that to your advantage.' },
  { icon: '\u25C6', text: 'Energy bridges only appear in the Awakening world.' },
  { icon: '\u25C6', text: 'You cannot switch if you would land inside a solid.' },
  { icon: '\u25C6', text: 'Collect all 3 Echo Fragments to unlock the portal.' },
];

// ─── scene ───────────────────────────────────────────────────────────────────

export class HowToPlayScene extends Phaser.Scene {
  private returnTo: string = SCENE.Menu;
  private closing = false;

  constructor() {
    super(SCENE.HowToPlay);
  }

  init(data: HowToPlaySceneData): void {
    this.returnTo = data.returnTo;
    this.closing = false;
  }

  create(): void {
    restartOnResize(this);
    const depth = DEPTH.ui + 30;
    const sw = this.scale.width;
    const sh = GAME_HEIGHT;

    // Full-screen dark overlay
    this.add
      .rectangle(0, 0, sw, sh, PALETTE.deepNavy, 1)
      .setOrigin(0, 0)
      .setDepth(depth);

    // ── Header ──────────────────────────────────────────────────────────────
    const cx = sw / 2;
    this.add
      .bitmapText(cx, 14, PIXEL_FONT_KEY, 'HOW TO')
      .setOrigin(0.5)
      .setScale(3)
      .setTint(PALETTE.white)
      .setDepth(depth + 1);
    this.add
      .bitmapText(cx + 44, 14, PIXEL_FONT_KEY, 'PLAY')
      .setOrigin(0.5)
      .setScale(3)
      .setTint(PALETTE.cyanAccent)
      .setDepth(depth + 1);
    this.add
      .bitmapText(cx, 34, PIXEL_FONT_KEY, 'LEARN THE CONTROLS')
      .setOrigin(0.5)
      .setScale(1)
      .setTint(0x8fa6d6)
      .setDepth(depth + 1);

    // Divider under header
    const divG = this.add.graphics().setDepth(depth + 1);
    divG.fillStyle(PALETTE.cyanAccent, 0.4);
    divG.fillRect(16, 44, sw - 32, 1);

    // ── Two-column layout ────────────────────────────────────────────────────
    const colW = Math.floor((sw - 48) / 2);   // width of each column
    const leftX  = 12;
    const rightX = leftX + colW + 12;
    const startY = 50;
    const ROW_H  = 28;

    // Left column: keyboard controls (first 4 items)
    const leftItems  = CONTROLS.slice(0, 4);
    // Right column: controls 5-8
    const rightItems = CONTROLS.slice(4);

    this.drawControlsColumn(leftItems,  leftX,  startY, colW, ROW_H, depth + 1);
    this.drawControlsColumn(rightItems, rightX, startY, colW, ROW_H, depth + 1);

    // ── Tips panel ───────────────────────────────────────────────────────────
    const tipsY = startY + Math.max(leftItems.length, rightItems.length) * ROW_H + 8;
    const tipsH = TIPS.length * 14 + 14;
    const tipsG = this.add.graphics().setDepth(depth + 1);
    drawPixelPanel(tipsG, 12, tipsY, sw - 24, tipsH, PALETTE.energyGlow);

    this.add
      .bitmapText(20, tipsY + 5, PIXEL_FONT_KEY, 'GAME TIPS')
      .setTint(PALETTE.energyGlow)
      .setScale(1)
      .setDepth(depth + 2);

    TIPS.forEach((tip, i) => {
      this.add
        .bitmapText(20, tipsY + 16 + i * 14, PIXEL_FONT_KEY, `${tip.icon} ${tip.text.toUpperCase()}`)
        .setTint(PALETTE.white)
        .setAlpha(0.8)
        .setScale(1)
        .setDepth(depth + 2);
    });

    // ── BACK button ───────────────────────────────────────────────────────────
    const backY = sh - 20;
    this.add
      .bitmapText(cx, backY, PIXEL_FONT_KEY, 'ESC  OR  CLICK TO CLOSE')
      .setOrigin(0.5)
      .setScale(1)
      .setTint(0x5878ab)
      .setDepth(depth + 2);

    // Clickable BACK label (top-left)
    const backLabel = this.add
      .bitmapText(12, 12, PIXEL_FONT_KEY, '< BACK')
      .setTint(0x8fa6d6)
      .setDepth(depth + 2);
    const backHit = this.add
      .zone(12, 10, backLabel.width + 16, 18)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    backHit.on('pointerover', () => backLabel.setTint(PALETTE.white));
    backHit.on('pointerout',  () => backLabel.setTint(0x8fa6d6));
    backHit.on('pointerdown', () => this.close());

    // Click anywhere else also closes
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, objs: Phaser.GameObjects.GameObject[]) => {
      if (objs.length === 0) this.close();
    });

    this.input.keyboard?.on('keydown-ESC', this.close, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private drawControlsColumn(
    items: ControlEntry[],
    x: number,
    startY: number,
    colW: number,
    rowH: number,
    depth: number,
  ): void {
    const g = this.add.graphics().setDepth(depth);

    items.forEach((entry, idx) => {
      const rowY = startY + idx * rowH;
      const isLast = idx === items.length - 1;

      // Row background panel
      drawPixelPanel(g, x, rowY, colW, rowH - 2, entry.color ?? PALETTE.cyanAccent);

      // Number badge (left strip)
      g.fillStyle(entry.color ?? PALETTE.cyanAccent, 0.15);
      g.fillRect(x + 4, rowY + 4, 18, rowH - 10);
      g.fillStyle(entry.color ?? PALETTE.cyanAccent, 0.6);
      g.fillRect(x + 22, rowY + 4, 1, rowH - 10);

      // Number text
      this.add
        .bitmapText(x + 5, rowY + 5, PIXEL_FONT_KEY, entry.num)
        .setTint(entry.color ?? PALETTE.cyanAccent)
        .setScale(1)
        .setDepth(depth + 1);

      // Action label
      this.add
        .bitmapText(x + 26, rowY + 4, PIXEL_FONT_KEY, entry.action)
        .setTint(PALETTE.white)
        .setScale(1)
        .setDepth(depth + 1);

      // Description
      this.add
        .bitmapText(x + 26, rowY + 15, PIXEL_FONT_KEY, entry.desc.toUpperCase())
        .setTint(0x8fa6d6)
        .setAlpha(0.85)
        .setScale(1)
        .setDepth(depth + 1);

      // Key badges (right side)
      const kg = this.add.graphics().setDepth(depth + 1);
      let bx = x + colW - 6;
      for (let k = entry.keys.length - 1; k >= 0; k--) {
        const key = entry.keys[k];
        const kw = key.wide ? 32 : 14;
        const kh = 11;
        bx -= kw + 3;
        const ky = rowY + Math.floor((rowH - 2 - kh) / 2);
        drawKeyBadge(kg, bx, ky, kw, kh);
        this.add
          .bitmapText(bx + kw / 2, ky + 2, PIXEL_FONT_KEY, key.label)
          .setOrigin(0.5, 0)
          .setTint(PALETTE.white)
          .setScale(1)
          .setDepth(depth + 2);
      }

      // Row separator (but not under the last row)
      if (!isLast) {
        g.fillStyle(entry.color ?? PALETTE.cyanAccent, 0.2);
        g.fillRect(x + 4, rowY + rowH - 2, colW - 8, 1);
      }
    });
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop();
    // If the caller was itself paused (e.g. Settings launched this), resume it.
    // Otherwise just stop — MenuScene, PauseScene etc. are still running underneath.
    const caller = this.scene.get(this.returnTo);
    if (caller?.scene.isPaused()) {
      this.scene.resume(this.returnTo);
    }
  }
}
