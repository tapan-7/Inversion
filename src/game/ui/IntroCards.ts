import Phaser from 'phaser';
import { DEPTH } from '../constants';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';

/** How long the whole panel stays before it fades out. */
const SLIDE_IN_MS = 420;
const HOLD_MS = 5000;
const FADE_OUT_MS = 600;

export interface IntroLine {
  text: string;
}

/** Total time the panel is visible, so other things (tips) can wait. */
export function introDuration(_count: number): number {
  return SLIDE_IN_MS + HOLD_MS + FADE_OUT_MS;
}

// ─── pixel-art helpers ───────────────────────────────────────────────────────

/** Draws the outer panel: deep-navy fill + stepped cyan border. */
function drawPanel(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  // Fill
  g.fillStyle(PALETTE.deepNavy, 0.93);
  g.fillRect(4, 0, w - 8, h);
  g.fillRect(2, 2, w - 4, h - 4);
  g.fillRect(0, 4, w, h - 8);

  // Cyan border
  g.fillStyle(PALETTE.cyanAccent, 1);
  g.fillRect(4, 0, w - 8, 2);          // top
  g.fillRect(4, h - 2, w - 8, 2);     // bottom
  g.fillRect(0, 4, 2, h - 8);          // left
  g.fillRect(w - 2, 4, 2, h - 8);     // right
  // stepped corners
  for (const [cx, cy] of [[2, 2], [w - 4, 2], [2, h - 4], [w - 4, h - 4]] as const)
    g.fillRect(cx, cy, 2, 2);

  // Inner top-highlight and bottom-shadow
  g.fillStyle(PALETTE.white, 0.1);
  g.fillRect(6, 2, w - 12, 1);
  g.fillStyle(PALETTE.stoneShadow, 0.6);
  g.fillRect(6, h - 3, w - 12, 1);

  // Accent pixels (magenta corner dots, like the existing card style)
  g.fillStyle(PALETTE.magenta, 1);
  g.fillRect(6, -2, 2, 2);
  g.fillRect(w - 8, h, 2, 2);
}

/** Draws the per-row row separator line across the panel. */
function drawSeparator(g: Phaser.GameObjects.Graphics, w: number, y: number): void {
  g.fillStyle(PALETTE.cyanAccent, 0.3);
  g.fillRect(8, y, w - 16, 1);
}

/** Draws a pixelated badge that looks like a key. */
function drawKeyBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(PALETTE.stoneMid, 1);
  g.fillRect(x + 2, y, w - 4, h);
  g.fillRect(x, y + 2, w, h - 4);
  g.fillStyle(PALETTE.cyanAccent, 1);
  g.fillRect(x + 2, y, w - 4, 1);
  g.fillRect(x + 2, y + h - 1, w - 4, 1);
  g.fillRect(x, y + 2, 1, h - 4);
  g.fillRect(x + w - 1, y + 2, 1, h - 4);
  g.fillStyle(PALETTE.white, 0.12);
  g.fillRect(x + 3, y + 1, w - 6, 1);
}

/** Draws the small number badge (01, 02 …) on the left of a row. */
function drawNumberBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(PALETTE.cyanAccent, 0.18);
  g.fillRect(x, y, w, h);
  g.fillStyle(PALETTE.cyanAccent, 0.7);
  g.fillRect(x + w - 1, y, 1, h);
}

// ─── row data ────────────────────────────────────────────────────────────────

interface RowDef {
  num: string;
  label: string;
  desc: string;
  keys: string[];
}

/** Maps intro text → structured row. Falls back to a generic numbered row. */
function introToRows(lines: IntroLine[]): RowDef[] {
  // Heuristic mapping: check if the text matches known instruction patterns
  return lines.map((line, i) => {
    const t = line.text.toUpperCase();

    if (t.includes('MOVE') || t.includes('ARROW') || t.includes('A D') || t.includes('W OR')) {
      return {
        num: String(i + 1).padStart(2, '0'),
        label: 'MOVE',
        desc: 'Navigate the world',
        keys: t.includes('ARROW') || t.includes('BUTTON') ? ['↑', '←↓→'] : ['W', 'A S D'],
      };
    }
    if (t.includes('SWITCH') || t.includes('SPACE') || t.includes('WORLD')) {
      return {
        num: String(i + 1).padStart(2, '0'),
        label: 'INVERT',
        desc: 'Switch between worlds',
        keys: t.includes('BUTTON') ? ['⇄'] : ['SPACE'],
      };
    }
    if (t.includes('ECHO') || t.includes('COLLECT') || t.includes('FRAGMENT')) {
      return {
        num: String(i + 1).padStart(2, '0'),
        label: 'COLLECT',
        desc: 'Gather echo fragments',
        keys: [],
      };
    }
    // Generic fallback
    return {
      num: String(i + 1).padStart(2, '0'),
      label: `STEP ${i + 1}`,
      desc: line.text,
      keys: [],
    };
  });
}

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Shows a "HOW TO PLAY" panel pinned to the LEFT side of the screen.
 * All instruction rows appear together, then the panel fades after HOLD_MS.
 */
export function showIntroCards(scene: Phaser.Scene, lines: IntroLine[], startDelayMs = 0): void {
  if (lines.length === 0) return;

  const rows = introToRows(lines);

  // ── Layout constants ──────────────────────────────────────────────────────
  const MARGIN_LEFT = 10;      // gap from left edge of screen
  const MARGIN_TOP  = 40;      // gap from top of screen (below HUD)
  const PANEL_W     = 170;     // panel width in px
  const ROW_H       = 34;      // height of each instruction row
  const HEADER_H    = 20;      // "HOW TO PLAY" header
  const FOOTER_H    = 14;      // bottom tagline
  const PANEL_H     = HEADER_H + rows.length * ROW_H + 4 + FOOTER_H;

  const depth = DEPTH.titleCard - 1;
  const container = scene.add
    .container(MARGIN_LEFT - PANEL_W - 4, MARGIN_TOP) // start off-screen to the left
    .setScrollFactor(0)
    .setDepth(depth)
    .setAlpha(0);

  // ── Panel background ──────────────────────────────────────────────────────
  const bg = scene.add.graphics();
  drawPanel(bg, PANEL_W, PANEL_H);
  container.add(bg);

  // ── Header: "HOW TO PLAY" ─────────────────────────────────────────────────
  // Cyan title left-aligned
  const title = scene.add
    .bitmapText(8, 4, PIXEL_FONT_KEY, 'HOW TO PLAY')
    .setTint(PALETTE.white)
    .setScale(1);
  container.add(title);

  // "PLAY" word highlight
  const titleCyan = scene.add
    .bitmapText(8 + 44, 4, PIXEL_FONT_KEY, 'PLAY')
    .setTint(PALETTE.cyanAccent)
    .setScale(1);
  container.add(titleCyan);

  // Header separator
  const hdrSep = scene.add.graphics();
  hdrSep.fillStyle(PALETTE.cyanAccent, 0.5);
  hdrSep.fillRect(8, HEADER_H - 2, PANEL_W - 16, 1);
  container.add(hdrSep);

  // ── Instruction rows ──────────────────────────────────────────────────────
  rows.forEach((row, idx) => {
    const rowY = HEADER_H + idx * ROW_H + 2;

    // Row separator (except first)
    if (idx > 0) {
      const sep = scene.add.graphics();
      drawSeparator(sep, PANEL_W, rowY);
      container.add(sep);
    }

    // Number badge area (left strip)
    const numBg = scene.add.graphics();
    drawNumberBadge(numBg, 4, rowY + 4, 20, ROW_H - 8);
    container.add(numBg);

    // Number text "01"
    const numLabel = scene.add
      .bitmapText(5, rowY + 6, PIXEL_FONT_KEY, row.num)
      .setTint(PALETTE.cyanAccent)
      .setScale(1);
    container.add(numLabel);

    // Action label (bold white)
    const actionLabel = scene.add
      .bitmapText(30, rowY + 5, PIXEL_FONT_KEY, row.label)
      .setTint(PALETTE.white)
      .setScale(1);
    container.add(actionLabel);

    // Description (dim, smaller)
    const descLabel = scene.add
      .bitmapText(30, rowY + 16, PIXEL_FONT_KEY, row.desc.toUpperCase())
      .setTint(PALETTE.energyGlow)
      .setAlpha(0.75)
      .setScale(1);
    container.add(descLabel);

    // Key badges (right side)
    if (row.keys.length > 0) {
      let bx = PANEL_W - 8;
      for (let k = row.keys.length - 1; k >= 0; k--) {
        const keyText = row.keys[k];
        const isWide  = keyText.length > 1 && !['↑', '←↓→', '⇄'].includes(keyText);
        const kw      = isWide ? 32 : 14;
        const kh      = 12;
        bx -= kw + 2;
        const ky = rowY + (ROW_H - kh) / 2;

        const kg = scene.add.graphics();
        drawKeyBadge(kg, bx, ky, kw, kh);
        container.add(kg);

        const kt = scene.add
          .bitmapText(bx + kw / 2, ky + 2, PIXEL_FONT_KEY, keyText)
          .setOrigin(0.5, 0)
          .setTint(PALETTE.white)
          .setScale(1);
        container.add(kt);
      }
    }
  });

  // ── Footer tagline ────────────────────────────────────────────────────────
  const footerY = HEADER_H + rows.length * ROW_H + 4;
  const footerSep = scene.add.graphics();
  footerSep.fillStyle(PALETTE.cyanAccent, 0.4);
  footerSep.fillRect(8, footerY, PANEL_W - 16, 1);
  container.add(footerSep);

  const footer = scene.add
    .bitmapText(8, footerY + 3, PIXEL_FONT_KEY, 'MASTER THE ECHO')
    .setTint(PALETTE.magenta)
    .setAlpha(0.8)
    .setScale(1);
  container.add(footer);

  // ── Tweens ────────────────────────────────────────────────────────────────
  const targetX = MARGIN_LEFT;

  // Slide in from the left and fade in
  scene.tweens.add({
    targets: container,
    x: targetX,
    alpha: 1,
    delay: startDelayMs,
    duration: SLIDE_IN_MS,
    ease: 'Cubic.Out',
  });

  // Fade out after hold, sliding back left
  scene.tweens.add({
    targets: container,
    x: MARGIN_LEFT - PANEL_W - 4,
    alpha: 0,
    delay: startDelayMs + SLIDE_IN_MS + HOLD_MS,
    duration: FADE_OUT_MS,
    ease: 'Sine.In',
    onComplete: () => container.destroy(),
  });
}
