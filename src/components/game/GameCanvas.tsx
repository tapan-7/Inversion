'use client';

import { useEffect, useRef, type ReactElement } from 'react';

export function GameCanvas(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;
    let cleanupAudio: (() => void) | undefined;
    let cleanupScaling: (() => void) | undefined;
    let cleanupBridge: (() => void) | undefined;

    if (gameRef.current || initializingRef.current) return;
    initializingRef.current = true;

    async function initPhaser() {
      try {
        const [
          PhaserModule,
          { createGameConfig },
          { bindAudio },
          { installResponsiveScaling },
          { bindGameEventEmitter },
          audioModule,
        ] = await Promise.all([
          import('phaser'),
          import('../../game/config/game.config'),
          import('../../game/systems/AudioDirector'),
          import('../../game/systems/responsive'),
          import('../../game/events/GameEventEmitter'),
          import('../../game/systems/AudioEngine'),
        ]);

        if (isCancelled || !containerRef.current) return;

        const Phaser = PhaserModule.default ?? PhaserModule;
        const config = createGameConfig(containerRef.current);
        const game = new Phaser.Game(config);
        gameRef.current = game;

        cleanupScaling = installResponsiveScaling(game);
        cleanupAudio = bindAudio(game);
        cleanupBridge = bindGameEventEmitter(game);

        if (typeof window !== 'undefined' && (process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('debug'))) {
          (window as unknown as { __game: unknown }).__game = game;
          (window as unknown as { __audio: unknown }).__audio = audioModule.audio;
        }
      } catch (err) {
        console.error('Failed to initialize Phaser game:', err);
      } finally {
        initializingRef.current = false;
      }
    }

    initPhaser();

    return () => {
      isCancelled = true;
      initializingRef.current = false;

      cleanupBridge?.();
      cleanupAudio?.();
      cleanupScaling?.();

      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch (e) {
          console.warn('Error destroying Phaser instance:', e);
        }
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      id="game"
      ref={containerRef}
      className="fixed inset-0 h-screen h-[100dvh] flex items-center justify-center overflow-hidden bg-[#101a32] touch-none select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    />
  );
}
