import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { PALETTE } from '../world/Palette';
import { PIXEL_FONT_KEY } from '../world/PixelFont';

const FADE_IN_MS = 450;
const HOLD_MS = 1500;
const FADE_OUT_MS = 650;

/** Total time the card is on screen. */
export const TITLE_CARD_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS;

/** Chapter title card that fades in over the level, then clears itself. */
export function showTitleCard(scene: Phaser.Scene, chapter: number, name: string): void {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT * 0.36;
  const depth = DEPTH.titleCard;

  const band = scene.add
    .rectangle(0, cy - 38, GAME_WIDTH, 76, PALETTE.deepNavy, 0.78)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(depth);
  const label = scene.add
    .bitmapText(cx, cy - 18, PIXEL_FONT_KEY, `CHAPTER ${String(chapter).padStart(2, '0')}`)
    .setOrigin(0.5)
    .setScale(1)
    .setTint(PALETTE.cyanAccent)
    .setScrollFactor(0)
    .setDepth(depth + 1);
  const title = scene.add
    .bitmapText(cx, cy + 6, PIXEL_FONT_KEY, name.toUpperCase())
    .setOrigin(0.5)
    .setScale(3)
    .setTint(PALETTE.energyGlow)
    .setScrollFactor(0)
    .setDepth(depth + 1);
  const ruleWidth = Math.min(title.width * 3, GAME_WIDTH - 40);
  const rule = scene.add
    .rectangle(cx, cy + 28, ruleWidth, 2, PALETTE.energyGlow, 0.9)
    .setScrollFactor(0)
    .setDepth(depth + 1)
    .setScale(0, 1);

  const parts = [band, label, title, rule];
  for (const part of parts) part.setAlpha(0);

  scene.tweens.add({ targets: parts, alpha: 1, duration: FADE_IN_MS, ease: 'Sine.Out' });
  scene.tweens.add({ targets: rule, scaleX: 1, duration: FADE_IN_MS + 300, ease: 'Cubic.Out' });
  scene.tweens.add({
    targets: parts,
    alpha: 0,
    delay: FADE_IN_MS + HOLD_MS,
    duration: FADE_OUT_MS,
    ease: 'Sine.In',
    onComplete: () => parts.forEach((p) => p.destroy()),
  });
}
