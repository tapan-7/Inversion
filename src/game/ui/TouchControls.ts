import Phaser from 'phaser';
import { DEPTH, GAME_EVENT, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { touchState } from '../systems/InputController';
import { TEXTURE } from '../world/PixelArt';
import { PALETTE } from '../world/Palette';

interface TouchButton {
  rect: Phaser.Geom.Rectangle;
  image: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Image;
  active: boolean;
}

const IDLE_ALPHA = 0.42;
const ACTIVE_ALPHA = 0.85;
const MARGIN = 8;

/**
 * On-screen controls. Pointers are polled every frame, so sliding a finger
 * between buttons and holding several buttons at once both work.
 */
export class TouchControls {
  private readonly left: TouchButton;
  private readonly right: TouchButton;
  private readonly jump: TouchButton;
  private readonly menu: Phaser.GameObjects.Zone;
  private readonly menuIcon: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene) {
    scene.input.addPointer(3);

    const size = 48;
    const y = GAME_HEIGHT - MARGIN - size;
    this.left = this.makeButton(MARGIN, y, size, TEXTURE.iconLeft);
    this.right = this.makeButton(MARGIN + size + 6, y, size, TEXTURE.iconRight);
    this.jump = this.makeButton(GAME_WIDTH - MARGIN - 56, GAME_HEIGHT - MARGIN - 56, 56, TEXTURE.iconJump);

    const menuSize = 24;
    this.menuIcon = scene.add
      .image(GAME_WIDTH - MARGIN - menuSize / 2, MARGIN + menuSize / 2, TEXTURE.iconMenu)
      .setTint(PALETTE.energyGlow)
      .setAlpha(0.7)
      .setDepth(DEPTH.ui);
    this.menu = scene.add
      .zone(GAME_WIDTH - MARGIN - menuSize, MARGIN, menuSize, menuSize)
      .setOrigin(0, 0)
      .setInteractive();
    this.menu.on('pointerdown', () => scene.game.events.emit(GAME_EVENT.RequestMenu));
  }

  private makeButton(x: number, y: number, size: number, iconKey: string): TouchButton {
    const image = this.scene.add
      .image(x, y, TEXTURE.btn)
      .setOrigin(0, 0)
      .setDisplaySize(size, size)
      .setTint(PALETTE.energyGlow)
      .setAlpha(IDLE_ALPHA)
      .setDepth(DEPTH.ui);
    const icon = this.scene.add
      .image(x + size / 2, y + size / 2, iconKey)
      .setTint(PALETTE.energyGlow)
      .setAlpha(0.9)
      .setDepth(DEPTH.ui + 1);
    return { rect: new Phaser.Geom.Rectangle(x, y, size, size), image, icon, active: false };
  }

  update(): void {
    const down = this.scene.input.manager.pointers.filter((pointer) => pointer.isDown);
    const hit = (button: TouchButton) => down.some((p) => button.rect.contains(p.x, p.y));

    this.apply(this.left, hit(this.left));
    this.apply(this.right, hit(this.right));
    this.apply(this.jump, hit(this.jump));

    touchState.left = this.left.active;
    touchState.right = this.right.active;
    touchState.jump = this.jump.active;
  }

  private apply(button: TouchButton, active: boolean): void {
    if (button.active === active) return;
    button.active = active;
    button.image.setAlpha(active ? ACTIVE_ALPHA : IDLE_ALPHA);
  }

  destroy(): void {
    touchState.left = false;
    touchState.right = false;
    touchState.jump = false;
    for (const b of [this.left, this.right, this.jump]) {
      b.image.destroy();
      b.icon.destroy();
    }
    this.menu.destroy();
    this.menuIcon.destroy();
  }
}

export function shouldShowTouchControls(game: Phaser.Game): boolean {
  if (new URLSearchParams(window.location.search).get('touch') === '1') return true;
  return game.device.input.touch || window.matchMedia('(pointer: coarse)').matches;
}
