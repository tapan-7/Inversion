import type Phaser from 'phaser';
import { GAME_EVENT } from '../constants';
import type { Dimension } from '../world/dimensionMath';
import { audio } from './AudioEngine';
import { settings } from './Settings';

/**
 * Connects gameplay events to sound, and unlocks audio on the first gesture.
 * Call once at start up.
 */
export function bindAudio(game: Phaser.Game): void {
  const apply = () => audio.applySettings(settings.data.volume, settings.data.muted);
  apply();
  settings.onChange(apply);

  const events = game.events;
  events.on(GAME_EVENT.DimensionSwitched, (dimension: Dimension) => {
    audio.setDimension(dimension);
    audio.sfx(dimension === 'awakening' ? 'toAwakening' : 'toForgotten');
  });
  events.on(GAME_EVENT.DimensionBlocked, () => audio.sfx('blocked'));
  events.on(GAME_EVENT.PlayerJumped, () => audio.sfx('jump'));
  events.on(GAME_EVENT.FragmentCollected, () => audio.sfx('fragment'));
  events.on(GAME_EVENT.CheckpointLit, () => audio.sfx('checkpoint'));
  events.on(GAME_EVENT.PortalUnlocked, () => audio.sfx('portal'));
  events.on(GAME_EVENT.LevelCompleted, () => audio.sfx('complete'));

  // Browsers need a gesture before audio can start. Keep trying until it is running,
  // because a modifier key alone does not count as a gesture.
  const gestures = ['pointerdown', 'keydown', 'touchend'] as const;
  const unlock = () => {
    audio.unlock();
    if (!audio.ready) return;
    for (const type of gestures) window.removeEventListener(type, unlock, true);
  };
  for (const type of gestures) window.addEventListener(type, unlock, true);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.suspend();
    else audio.resume();
  });
}
