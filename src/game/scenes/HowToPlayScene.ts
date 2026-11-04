import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, SCENE } from '../constants';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';
import { restartOnResize } from '../ui/relayout';

export interface HowToPlaySceneData {
  returnTo: string;
}

// ─── pixel helpers ────────────────────────────────────────────────────────────

function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number, border: number,
): void {
  g.fillStyle(PALETTE.deepNavy, 0.97);
  g.fillRect(x + 3, y, w - 6, h);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  g.fillRect(x, y + 3, w, h - 6);

  g.fillStyle(border, 1);
  g.fillRect(x + 3, y, w - 6, 1);           // top
  g.fillRect(x + 3, y + h - 1, w - 6, 1);   // bottom
  g.fillRect(x, y + 3, 1, h - 6);            // left
  g.fillRect(x + w - 1, y + 3, 1, h - 6);   // right
  // stepped corners
  g.fillRect(x + 1, y + 1, 2, 1); g.fillRect(x + 1, y + 1, 1, 2);
  g.fillRect(x + w - 3, y + 1, 2, 1); g.fillRect(x + w - 2, y + 1, 1, 2);
  g.fillRect(x + 1, y + h - 2, 2, 1); g.fillRect(x + 1, y + h - 3, 1, 2);
  g.fillRect(x + w - 3, y + h - 2, 2, 1); g.fillRect(x + w - 2, y + h - 3, 1, 2);

  // inner top sheen
  g.fillStyle(PALETTE.white, 0.07);
  g.fillRect(x + 4, y + 1, w - 8, 1);
}

function drawKey(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
): void {
  // body
  g.fillStyle(PALETTE.stoneDark, 1);
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  // border
  g.fillStyle(PALETTE.cyanAccent, 0.8);
  g.fillRect(x + 1, y, w - 2, 1);
  g.fillRect(x + 1, y + h - 1, w - 2, 1);
  g.fillRect(x, y + 1, 1, h - 2);
  g.fillRect(x + w - 1, y + 1, 1, h - 2);
  // top sheen
  g.fillStyle(PALETTE.white, 0.22);
  g.fillRect(x + 2, y + 1, w - 4, 1);
  // bottom shadow
  g.fillStyle(0x000000, 0.4);
  g.fillRect(x + 2, y + h - 2, w - 4, 1);
}

// ─── content ──────────────────────────────────────────────────────────────────

interface ControlEntry {
  num: string;
  action: string;
  desc: string;
  keys: { label: string; pw: number }[];
  color: number;
}

const CONTROLS: ControlEntry[] = [
  { num: '01', action: 'MOVE',           desc: 'Walk left / right',      keys: [{ label: 'A', pw: 11 }, { label: 'D', pw: 11 }],                       color: PALETTE.cyanAccent    },
  { num: '02', action: 'MOVE (ARROWS)',  desc: 'Arrow left / right',     keys: [{ label: 'L', pw: 11 }, { label: 'R', pw: 11 }],                       color: PALETTE.cyanAccent    },
  { num: '03', action: 'JUMP',           desc: 'Short tap = small hop',  keys: [{ label: 'W', pw: 11 }, { label: 'Z', pw: 11 }],                       color: PALETTE.energyGlow    },
  { num: '04', action: 'HIGH JUMP',      desc: 'Hold jump key longer',   keys: [{ label: 'W', pw: 11 }],                                               color: PALETTE.energyGlow    },
  { num: '05', action: 'SWITCH WORLD',   desc: 'Flip between worlds',    keys: [{ label: 'SPC', pw: 23 }],                                             color: PALETTE.magenta       },
  { num: '06', action: 'AIR SWITCH',     desc: 'Switch while jumping',   keys: [{ label: 'SPC', pw: 23 }],                                             color: PALETTE.magenta       },
  { num: '07', action: 'PAUSE',          desc: 'Open pause menu',        keys: [{ label: 'ESC', pw: 23 }, { label: 'P', pw: 11 }],                    color: PALETTE.stoneHighlight },
  { num: '08', action: 'RESTART',        desc: 'Restart level',          keys: [{ label: 'R', pw: 11 }],                                               color: PALETTE.stoneHighlight },
];

// Two short columns of tips (left / right)
const TIPS_LEFT  = ['Walls exist in one or both worlds', 'Energy bridges: Awakening only', 'Cannot switch inside a solid'];
const TIPS_RIGHT = ['Switch mid-air to cross gaps', 'Collect all echoes → unlock portal'];

// ─── scene ────────────────────────────────────────────────────────────────────

export class HowToPlayScene extends Phaser.Scene {
  private returnTo: string = SCENE.Menu;
  private closing = false;

  constructor() { super(SCENE.HowToPlay); }

  init(data: HowToPlaySceneData): void {
    this.returnTo = data.returnTo;
    this.closing  = false;
  }

  create(): void {
    restartOnResize(this);

    const D  = DEPTH.ui + 30;   // base depth
    const SW = this.scale.width; // logical game width (480)
    const SH = GAME_HEIGHT;      // 270
    const CX = SW / 2;

    // ── background ────────────────────────────────────────────────────────────
    this.add.rectangle(0, 0, SW, SH, PALETTE.deepNavy, 1).setOrigin(0, 0).setDepth(D);

    // ── header ────────────────────────────────────────────────────────────────
    // Measure both parts then place them so the whole title is centred.
    const HSCALE = 2;
    const howTo  = this.add.bitmapText(0, -100, PIXEL_FONT_KEY, 'HOW TO ').setScale(HSCALE);
    const play   = this.add.bitmapText(0, -100, PIXEL_FONT_KEY, 'PLAY').setScale(HSCALE);
    const totalW = howTo.width + play.width;
    const startX = CX - totalW / 2;

    howTo.setPosition(startX, 7).setTint(PALETTE.white).setDepth(D + 2);
    play.setPosition(startX + howTo.width, 7).setTint(PALETTE.cyanAccent).setDepth(D + 2);

    this.add
      .bitmapText(CX, 26, PIXEL_FONT_KEY, '- LEARN THE CONTROLS -')
      .setOrigin(0.5, 0).setScale(1).setTint(0x6a86b8).setDepth(D + 2);

    // Header divider
    const hDiv = this.add.graphics().setDepth(D + 2);
    hDiv.fillStyle(PALETTE.cyanAccent, 0.3);
    hDiv.fillRect(12, 36, SW - 24, 1);

    // ── control grid  2 col × 4 rows ─────────────────────────────────────────
    const M    = 8;              // outer margin
    const GAP  = 6;              // gap between columns
    const COLW = Math.floor((SW - M * 2 - GAP) / 2);
    const LX   = M;
    const RX   = M + COLW + GAP;
    const GY   = 40;             // grid top y
    const RH   = 24;             // row height — compact but fits 2 lines

    this.renderColumn(CONTROLS.slice(0, 4), LX, GY, COLW, RH, D + 2);
    this.renderColumn(CONTROLS.slice(4),    RX, GY, COLW, RH, D + 2);

    // ── tips — two narrow columns ─────────────────────────────────────────────
    const GRID_H = 4 * RH;
    const TY     = GY + GRID_H + 5;
    const TIP_H  = 9;
    const leftTH  = TIPS_LEFT.length  * TIP_H + 12;
    const rightTH = TIPS_RIGHT.length * TIP_H + 12;
    const tipsH   = Math.max(leftTH, rightTH);

    const tg = this.add.graphics().setDepth(D + 2);
    drawPanel(tg, M, TY, SW - M * 2, tipsH, PALETTE.energyGlow);

    // "TIPS" label
    this.add
      .bitmapText(M + 6, TY + 3, PIXEL_FONT_KEY, 'TIPS')
      .setTint(PALETTE.energyGlow).setScale(1).setDepth(D + 3);

    // vertical divider between tip columns
    tg.fillStyle(PALETTE.energyGlow, 0.2);
    tg.fillRect(M + COLW + 3, TY + 3, 1, tipsH - 6);

    const TL = M + 6;
    const TR = M + COLW + 10;

    TIPS_LEFT.forEach((t, i) =>
      this.add.bitmapText(TL, TY + 12 + i * TIP_H, PIXEL_FONT_KEY, `* ${t.toUpperCase()}`)
        .setTint(0xaac8ff).setAlpha(0.75).setScale(1).setDepth(D + 3),
    );
    TIPS_RIGHT.forEach((t, i) =>
      this.add.bitmapText(TR, TY + 12 + i * TIP_H, PIXEL_FONT_KEY, `* ${t.toUpperCase()}`)
        .setTint(0xaac8ff).setAlpha(0.75).setScale(1).setDepth(D + 3),
    );

    // ── BACK (top-left) ───────────────────────────────────────────────────────
    const backLbl = this.add
      .bitmapText(8, 6, PIXEL_FONT_KEY, '< BACK')
      .setTint(0x6a86b8).setScale(1).setDepth(D + 3);
    const backZone = this.add
      .zone(4, 2, backLbl.width + 14, 16)
      .setOrigin(0, 0).setInteractive({ useHandCursor: true });
    backZone.on('pointerover', () => backLbl.setTint(PALETTE.white));
    backZone.on('pointerout',  () => backLbl.setTint(0x6a86b8));
    backZone.on('pointerdown', () => this.close());

    // ── footer hint ───────────────────────────────────────────────────────────
    this.add
      .bitmapText(CX, SH - 5, PIXEL_FONT_KEY, 'ESC  TO CLOSE')
      .setOrigin(0.5, 1).setTint(0x3d5580).setScale(1).setDepth(D + 3);

    this.input.keyboard?.on('keydown-ESC', this.close, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.input.keyboard?.off('keydown-ESC', this.close, this),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  private renderColumn(
    items: ControlEntry[],
    x: number, startY: number, colW: number, rowH: number, depth: number,
  ): void {
    const bg = this.add.graphics().setDepth(depth);
    const kg = this.add.graphics().setDepth(depth + 1);

    // All panels first (avoid border overdraw)
    items.forEach((entry, i) => drawPanel(bg, x, startY + i * rowH, colW, rowH - 1, entry.color));

    items.forEach((entry, i) => {
      const ry = startY + i * rowH;

      // ── number strip ───────────────────────────────────────────────────────
      const NW = 16;
      bg.fillStyle(entry.color, 0.12);
      bg.fillRect(x + 2, ry + 2, NW, rowH - 5);
      bg.fillStyle(entry.color, 0.4);
      bg.fillRect(x + NW + 2, ry + 2, 1, rowH - 5);

      this.add
        .bitmapText(x + 3, ry + 4, PIXEL_FONT_KEY, entry.num)
        .setTint(entry.color).setScale(1).setDepth(depth + 2);

      // ── action name + description ───────────────────────────────────────────
      const TX = x + NW + 6;
      this.add
        .bitmapText(TX, ry + 3, PIXEL_FONT_KEY, entry.action.toUpperCase())
        .setTint(PALETTE.white).setScale(1).setDepth(depth + 2);
      this.add
        .bitmapText(TX, ry + 13, PIXEL_FONT_KEY, entry.desc.toUpperCase())
        .setTint(0x7a98c8).setAlpha(0.85).setScale(1).setDepth(depth + 2);

      // ── key badges right-aligned ────────────────────────────────────────────
      const KH     = 11;
      const KY     = ry + Math.floor((rowH - 1 - KH) / 2);
      const KGAP   = 2;
      let   bx     = x + colW - 4;

      for (let k = entry.keys.length - 1; k >= 0; k--) {
        const { label, pw } = entry.keys[k];
        bx -= pw + KGAP;
        drawKey(kg, bx, KY, pw, KH);
        this.add
          .bitmapText(bx + pw / 2, KY + 2, PIXEL_FONT_KEY, label)
          .setOrigin(0.5, 0).setTint(PALETTE.white).setScale(1).setDepth(depth + 2);
      }
    });
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop();
    const caller = this.scene.get(this.returnTo);
    if (caller?.scene.isPaused()) this.scene.resume(this.returnTo);
  }
}
