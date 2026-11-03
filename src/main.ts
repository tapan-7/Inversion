import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { audio } from './game/systems/AudioEngine';
import { bindAudio } from './game/systems/AudioDirector';
import { installResponsiveScaling } from './game/systems/responsive';

const game = new Phaser.Game(gameConfig);
installResponsiveScaling(game);
bindAudio(game);

// Handy for debugging and automated tests.
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
  (window as unknown as { __audio: typeof audio }).__audio = audio;
}
