import Phaser from 'phaser';
import { computeZoom } from './scale';

function viewportSize(): { width: number; height: number } {
  const vv = window.visualViewport;
  return {
    width: Math.floor(vv?.width ?? window.innerWidth),
    height: Math.floor(vv?.height ?? window.innerHeight),
  };
}

function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Keeps the canvas zoomed to fit the viewport, and shows a "rotate your device"
 * overlay (pausing the loop) when a touch device is held in portrait.
 */
export function installResponsiveScaling(game: Phaser.Game): void {
  const overlay = document.getElementById('rotate');
  let sleeping = false;

  const apply = () => {
    const { width, height } = viewportSize();
    game.scale.setZoom(computeZoom(width, height));

    const portraitTouch = isTouchDevice() && height > width;
    overlay?.classList.toggle('visible', portraitTouch);

    if (!game.isBooted) return;
    if (portraitTouch && !sleeping && game.loop.running) {
      sleeping = true;
      game.loop.sleep();
    } else if (!portraitTouch && sleeping) {
      sleeping = false;
      game.loop.wake();
    }
  };

  // The loop starts right after READY, so re-apply on the next tick to sleep it if needed.
  game.events.once(Phaser.Core.Events.READY, () => window.setTimeout(apply, 0));
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => window.setTimeout(apply, 120));
  window.visualViewport?.addEventListener('resize', apply);
  apply();
}
