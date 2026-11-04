import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, SCENE } from '../constants';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import { restartOnResize } from '../ui/relayout';

export interface HowToPlaySceneData {
  returnTo: string;
}

// ─── pixel-art panel helpers ──────────────────────────────────────────────────

function drawCard(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: number,
): void {
  // Deep navy fill
  g.fillStyle(PALETTE.deepNavy, 0.96);
  g.fillRect(x + 3, y, w - 6, h);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  g.fillRect(x, y + 3, w, h - 6);

  // Stepped pixel border
  g.fillStyle(borderColor, 0.9);
  g.fillRect(x + 3, y, w - 6, 1);           // top
  g.fillRect(x + 3, y + h - 1, w - 6, 1);   // bottom
  g.fillRect(x, y + 3, 1, h - 6);            // left
  g.fillRect(x + w - 1, y + 3, 1, h - 6);   // right

  // Stepped corners
  g.fillRect(x + 1, y + 1, 2, 1);
  g.fillRect(x + 1, y + 1, 1, 2);
  g.fillRect(x + w - 3, y + 1, 2, 1);
  g.fillRect(x + w - 2, y + 1, 1, 2);
  g.fillRect(x + 1, y + h - 2, 2, 1);
  g.fillRect(x + 1, y + h - 3, 1, 2);
  g.fillRect(x + w - 3, y + h - 2, 2, 1);
  g.fillRect(x + w - 2, y + h - 3, 1, 2);

  // Inner top highlight sheen
  g.fillStyle(PALETTE.white, 0.08);
  g.fillRect(x + 4, y + 1, w - 8, 1);
}

function drawKeyPill(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  accentColor: number,
): void {
  // Pill background
  g.fillStyle(PALETTE.cardNavy, 0.95);
  g.fillRect(x + 2, y, w - 4, h);
  g.fillRect(x, y + 2, w, h - 4);

  // Pill border
  g.fillStyle(accentColor, 0.85);
  g.fillRect(x + 2, y, w - 4, 1);
  g.fillRect(x + 2, y + h - 1, w - 4, 1);
  g.fillRect(x, y + 2, 1, h - 4);
  g.fillRect(x + w - 1, y + 2, 1, h - 4);

  // Corner pixels
  g.fillRect(x + 1, y + 1, 1, 1);
  g.fillRect(x + w - 2, y + 1, 1, 1);
  g.fillRect(x + 1, y + h - 2, 1, 1);
  g.fillRect(x + w - 2, y + h - 2, 1, 1);

  // Subtle top sheen
  g.fillStyle(PALETTE.white, 0.15);
  g.fillRect(x + 3, y + 1, w - 6, 1);
}

// ─── data structures ──────────────────────────────────────────────────────────

interface ControlCardData {
  num: string;
  pill: string;
  pillWidth: number;
  title: string;
  desc: string;
  accent: number;
}

const ESSENTIAL_CONTROLS: ControlCardData[] = [
  {
    num: '01',
    pill: 'A / D',
    pillWidth: 38,
    title: 'MOVE',
    desc: 'Walk left / right (or Arrow keys)',
    accent: PALETTE.cyanAccent,
  },
  {
    num: '02',
    pill: 'W / Z',
    pillWidth: 38,
    title: 'JUMP',
    desc: 'Tap for hop - Hold for high jump',
    accent: PALETTE.cyanAccent,
  },
];

const WORLD_MECHANICS: ControlCardData[] = [
  {
    num: '03',
    pill: 'SPACE',
    pillWidth: 44,
    title: 'INVERT',
    desc: 'Switch between worlds',
    accent: PALETTE.energyGlow,
  },
  {
    num: '04',
    pill: 'SPACE',
    pillWidth: 44,
    title: 'AIR FLIP',
    desc: 'Switch mid-air to cross gaps',
    accent: PALETTE.energyGlow,
  },
];

const TIPS = [
  'Watch both worlds: solid walls block your switch.',
  'Tap Jump for a short hop, hold Jump for maximum height.',
  'Switch in mid-air to cross wide gaps and energy bridges.',
  'Collect all Echo Fragments to awaken the exit portal.',
];

// ─── scene ────────────────────────────────────────────────────────────────────

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

    const D  = DEPTH.ui + 30;
    const SW = this.scale.width;
    const SH = GAME_HEIGHT;
    const CX = SW / 2;

    // Background overlay
    this.add.rectangle(0, 0, SW, SH, PALETTE.deepNavy, 1).setOrigin(0, 0).setDepth(D);

    // ── Header ────────────────────────────────────────────────────────────────
    const HSCALE = 2;
    const howToText = this.add.bitmapText(0, -100, PIXEL_FONT_KEY, 'HOW TO ').setScale(HSCALE);
    const playText  = this.add.bitmapText(0, -100, PIXEL_FONT_KEY, 'PLAY').setScale(HSCALE);
    const totalW    = howToText.width + playText.width;
    const headerX   = CX - totalW / 2;

    howToText.setPosition(headerX, 9).setTint(PALETTE.white).setDepth(D + 2);
    playText.setPosition(headerX + howToText.width, 9).setTint(PALETTE.cyanAccent).setDepth(D + 2);

    this.add
      .bitmapText(CX, 27, PIXEL_FONT_KEY, '- LEARN THE CONTROLS -')
      .setOrigin(0.5, 0)
      .setScale(1)
      .setTint(PALETTE.textCaption)
      .setDepth(D + 2);

    // ── 2x2 Cards Grid ────────────────────────────────────────────────────────
    const CARD_W = 214;
    const CARD_H = 46;
    const GAP_X  = 12;
    const TOTAL_GRID_W = CARD_W * 2 + GAP_X;
    const GRID_X = Math.floor((SW - TOTAL_GRID_W) / 2);

    const ROW1_Y = 44;
    const ROW2_Y = ROW1_Y + CARD_H + 6;

    // Row 1: Essential Controls (Cyan)
    this.renderCard(ESSENTIAL_CONTROLS[0], GRID_X, ROW1_Y, CARD_W, CARD_H, D + 2);
    this.renderCard(ESSENTIAL_CONTROLS[1], GRID_X + CARD_W + GAP_X, ROW1_Y, CARD_W, CARD_H, D + 2);

    // Row 2: World Mechanics (Energy Glow)
    this.renderCard(WORLD_MECHANICS[0], GRID_X, ROW2_Y, CARD_W, CARD_H, D + 2);
    this.renderCard(WORLD_MECHANICS[1], GRID_X + CARD_W + GAP_X, ROW2_Y, CARD_W, CARD_H, D + 2);

    // ── Tips Panel ────────────────────────────────────────────────────────────
    const TIPS_Y = ROW2_Y + CARD_H + 8;
    const TIPS_W = TOTAL_GRID_W;
    const TIPS_H = 74;

    const tipsGraphics = this.add.graphics().setDepth(D + 2);
    drawCard(tipsGraphics, GRID_X, TIPS_Y, TIPS_W, TIPS_H, PALETTE.energyGlow);

    // Tips header
    this.add
      .bitmapText(GRID_X + 12, TIPS_Y + 7, PIXEL_FONT_KEY, 'TIPS')
      .setTint(PALETTE.energyGlow)
      .setScale(1)
      .setDepth(D + 3);

    // Subtle header line
    tipsGraphics.fillStyle(PALETTE.energyGlow, 0.25);
    tipsGraphics.fillRect(GRID_X + 12, TIPS_Y + 18, TIPS_W - 24, 1);

    // Tips bullets
    TIPS.forEach((tip, idx) => {
      const lineY = TIPS_Y + 23 + idx * 11;
      this.add
        .bitmapText(GRID_X + 12, lineY, PIXEL_FONT_KEY, `* ${tip.toUpperCase()}`)
        .setTint(PALETTE.textLight)
        .setAlpha(0.9)
        .setScale(1)
        .setDepth(D + 3);
    });

    // ── Interactive Top-Left BACK Button ──────────────────────────────────────
    const backLabel = this.add
      .bitmapText(16, 11, PIXEL_FONT_KEY, '< BACK')
      .setTint(PALETTE.textSubtle)
      .setScale(1)
      .setDepth(D + 3);

    const backHit = this.add
      .zone(12, 8, backLabel.width + 16, 18)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    backHit.on('pointerover', () => backLabel.setTint(PALETTE.white));
    backHit.on('pointerout',  () => backLabel.setTint(PALETTE.textSubtle));
    backHit.on('pointerdown', () => this.close());

    // ── Footer Hint ───────────────────────────────────────────────────────────
    this.add
      .bitmapText(CX, SH - 8, PIXEL_FONT_KEY, 'ESC TO CLOSE')
      .setOrigin(0.5, 1)
      .setTint(PALETTE.textMuted)
      .setScale(1)
      .setDepth(D + 3);

    // Keyboard and background click listeners
    this.input.keyboard?.on('keydown-ESC', this.close, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
    });
  }

  private renderCard(
    data: ControlCardData,
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
  ): void {
    const g = this.add.graphics().setDepth(depth);
    drawCard(g, x, y, w, h, data.accent);

    // Top-left: Number indicator (01, 02, etc.)
    this.add
      .bitmapText(x + 10, y + 7, PIXEL_FONT_KEY, data.num)
      .setTint(data.accent)
      .setScale(1)
      .setDepth(depth + 1);

    // Top-right: Key pill badge
    const pillX = x + w - 10 - data.pillWidth;
    const pillY = y + 5;
    const pillH = 13;
    drawKeyPill(g, pillX, pillY, data.pillWidth, pillH, data.accent);

    this.add
      .bitmapText(pillX + data.pillWidth / 2, pillY + 2, PIXEL_FONT_KEY, data.pill)
      .setOrigin(0.5, 0)
      .setTint(data.accent)
      .setScale(1)
      .setDepth(depth + 1);

    // Middle: Action Title (Bold White)
    this.add
      .bitmapText(x + 10, y + 19, PIXEL_FONT_KEY, data.title)
      .setTint(PALETTE.white)
      .setScale(1)
      .setDepth(depth + 1);

    // Bottom: Description (Muted Slate / Indigo)
    this.add
      .bitmapText(x + 10, y + 32, PIXEL_FONT_KEY, data.desc.toUpperCase())
      .setTint(PALETTE.textSubtle)
      .setAlpha(0.85)
      .setScale(1)
      .setDepth(depth + 1);
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop();
    const caller = this.scene.get(this.returnTo);
    if (caller?.scene.isPaused()) {
      this.scene.resume(this.returnTo);
    }
  }
}
