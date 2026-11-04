import type Phaser from 'phaser';
import { GAME_EVENT } from '../constants';
import type { Dimension } from '../world/dimensionMath';
import { audio } from './AudioEngine';
import { settings } from './Settings';

/**
 * Connects gameplay events to sound, and unlocks audio on the first gesture.
 * Call once at start up.
 */
export function bindAudio(game: Phaser.Game): () => void {
  const apply = () => audio.applySettings(settings.data.volume, settings.data.muted);
  apply();
  const stopSettings = settings.onChange(apply);

  const events = game.events;
  const onDim = (dimension: Dimension) => {
    audio.setDimension(dimension);
    audio.sfx(dimension === 'awakening' ? 'toAwakening' : 'toForgotten');
  };
  const onBlocked = () => audio.sfx('blocked');
  const onJump = () => audio.sfx('jump');
  const onFrag = () => audio.sfx('fragment');
  const onCheck = () => audio.sfx('checkpoint');
  const onPortal = () => audio.sfx('portal');
  const onComplete = () => audio.sfx('complete');
  const onDeath = (reason: string) => {
    if (reason === 'watcher') audio.sfx('death');
  };
  const onSeq = (step: number) => audio.sfx('sequence', step);
  const onSeqWrong = () => audio.sfx('sequenceWrong');
  const onGate = () => audio.sfx('gate');
  const onRumble = () => audio.sfx('rumble');
  const onCrumble = (col: number) => {
    if (col % 3 === 0) audio.sfx('crumble');
  };

  events.on(GAME_EVENT.DimensionSwitched, onDim);
  events.on(GAME_EVENT.DimensionBlocked, onBlocked);
  events.on(GAME_EVENT.PlayerJumped, onJump);
  events.on(GAME_EVENT.FragmentCollected, onFrag);
  events.on(GAME_EVENT.CheckpointLit, onCheck);
  events.on(GAME_EVENT.PortalUnlocked, onPortal);
  events.on(GAME_EVENT.LevelCompleted, onComplete);
  events.on(GAME_EVENT.PlayerDied, onDeath);
  events.on(GAME_EVENT.SequenceStep, onSeq);
  events.on(GAME_EVENT.SequenceWrong, onSeqWrong);
  events.on(GAME_EVENT.GateOpened, onGate);
  events.on(GAME_EVENT.CollapseStarted, onRumble);
  events.on(GAME_EVENT.CollapseStep, onCrumble);

  // Browsers need a gesture before audio can start. Keep trying until it is running,
  // because a modifier key alone does not count as a gesture.
  const gestures = ['pointerdown', 'keydown', 'touchend'] as const;
  const unlock = () => {
    audio.unlock();
    if (!audio.ready) return;
    for (const type of gestures) window.removeEventListener(type, unlock, true);
  };
  for (const type of gestures) window.addEventListener(type, unlock, true);

  const onVisibility = () => {
    if (document.hidden) audio.suspend();
    else audio.resume();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stopSettings();
    events.off(GAME_EVENT.DimensionSwitched, onDim);
    events.off(GAME_EVENT.DimensionBlocked, onBlocked);
    events.off(GAME_EVENT.PlayerJumped, onJump);
    events.off(GAME_EVENT.FragmentCollected, onFrag);
    events.off(GAME_EVENT.CheckpointLit, onCheck);
    events.off(GAME_EVENT.PortalUnlocked, onPortal);
    events.off(GAME_EVENT.LevelCompleted, onComplete);
    events.off(GAME_EVENT.PlayerDied, onDeath);
    events.off(GAME_EVENT.SequenceStep, onSeq);
    events.off(GAME_EVENT.SequenceWrong, onSeqWrong);
    events.off(GAME_EVENT.GateOpened, onGate);
    events.off(GAME_EVENT.CollapseStarted, onRumble);
    events.off(GAME_EVENT.CollapseStep, onCrumble);
    for (const type of gestures) window.removeEventListener(type, unlock, true);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
