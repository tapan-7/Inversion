import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { installResponsiveScaling } from './game/systems/responsive';

const game = new Phaser.Game(gameConfig);
installResponsiveScaling(game);

// Handy for debugging and automated tests.
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
