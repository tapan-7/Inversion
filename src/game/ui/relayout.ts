import Phaser from 'phaser';

/**
 * Overlay scenes lay themselves out once, from the screen width. When the window
 * changes shape they start over so everything lands in the right place. A scene
 * that was paused at the time catches up when it resumes.
 */
export function restartOnResize(scene: Phaser.Scene): void {
  const width = scene.scale.width;
  const check = () => {
    if (scene.scale.width !== width && scene.sys.isActive()) {
      scene.scene.restart(scene.sys.settings.data);
    }
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, check);
  scene.events.on(Phaser.Scenes.Events.RESUME, check);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, check);
    scene.events.off(Phaser.Scenes.Events.RESUME, check);
  });
}
