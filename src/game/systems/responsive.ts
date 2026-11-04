import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';
import { computeLayout } from './scale';

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
export function installResponsiveScaling(game: Phaser.Game): () => void {
  const overlay = document.getElementById('rotate');
  let sleeping = false;

  const apply = () => {
    if (!game || !game.scale) return;
    const { width, height } = viewportSize();
    const layout = computeLayout(width, height);
    // The height is fixed and the width follows the window, so no bars appear at the sides.
    if (game.scale.gameSize.width !== layout.width) game.scale.resize(layout.width, GAME_HEIGHT);
    game.scale.setZoom(layout.zoom);

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

  const onOrientation = () => window.setTimeout(apply, 120);

  // The loop starts right after READY, so re-apply on the next tick to sleep it if needed.
  game.events.once(Phaser.Core.Events.READY, () => window.setTimeout(apply, 0));
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', onOrientation);
  window.visualViewport?.addEventListener('resize', apply);
  apply();

  return () => {
    window.removeEventListener('resize', apply);
    window.removeEventListener('orientationchange', onOrientation);
    window.visualViewport?.removeEventListener('resize', apply);
  };
}
