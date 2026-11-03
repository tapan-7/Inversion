import Phaser from 'phaser';
import { DEPTH, TILE_SIZE } from '../constants';
import { PALETTE, SEQUENCE_COLORS } from '../world/Palette';
import { TEXTURE } from '../world/PixelArt';

const SLOT = 16;

/** A plaque that shows the crystal colours in the order they must be touched. */
export class Shrine {
  constructor(scene: Phaser.Scene, col: number, row: number, colors: readonly number[]) {
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    const width = colors.length * SLOT + 8;
    const height = 26;

    const plate = scene.add.graphics().setDepth(DEPTH.objects);
    plate.fillStyle(PALETTE.deepNavy, 0.9);
    plate.fillRect(x, y, width, height);
    plate.lineStyle(1, PALETTE.cyanAccent, 0.9);
    plate.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    plate.fillStyle(PALETTE.stoneMid, 1);
    plate.fillRect(x + width / 2 - 3, y + height, 6, 6);

    colors.forEach((color, i) => {
      const cx = x + 4 + SLOT / 2 + i * SLOT;
      scene.add
        .image(cx, y + height / 2, TEXTURE.seqCrystal)
        .setTint(color)
        .setScale(0.8)
        .setDepth(DEPTH.objects + 0.1);
      if (i < colors.length - 1) {
        scene.add
          .rectangle(cx + SLOT / 2, y + height / 2, 2, 2, PALETTE.cyanAccent, 0.8)
          .setDepth(DEPTH.objects + 0.1);
      }
    });
    scene.add
      .image(x + width / 2, y - 4, TEXTURE.halo)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PALETTE.cyanAccent)
      .setScale(1.8)
      .setAlpha(0.35)
      .setDepth(DEPTH.objects - 0.1);
  }

  /** Colours in puzzle order, from crystal indices. */
  static colorsFor(order: readonly number[], crystalColors: readonly number[]): number[] {
    return order.map((i) => SEQUENCE_COLORS[crystalColors[i] as 0 | 1 | 2 | 3]);
  }
}
