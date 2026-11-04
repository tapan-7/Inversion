'use client';

import type { ReactElement } from 'react';
import { useGameContext } from '../../providers/GameProvider';
import { GameState } from '../../game/enums/game-state.enum';

export interface GameMenuProps {
  onStartGame?: (resume: boolean) => void;
  onOpenHowToPlay?: () => void;
  onOpenSettings?: () => void;
}

export function GameMenu({
  onStartGame,
  onOpenHowToPlay,
  onOpenSettings,
}: GameMenuProps): ReactElement | null {
  const { gameState } = useGameContext();

  // If already playing or paused, menu is hidden
  if (gameState !== GameState.MENU) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-between p-6 select-none font-mono">
      {/* Top row with quick navigation */}
      <div className="w-full flex justify-between items-center">
        <button
          type="button"
          onClick={onOpenHowToPlay}
          className="pointer-events-auto text-xs text-text-muted hover:text-cyan-accent border border-text-muted/30 hover:border-cyan-accent px-3 py-1 rounded transition-colors"
        >
          HOW TO PLAY
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="pointer-events-auto text-xs text-text-muted hover:text-white border border-text-muted/30 hover:border-white px-3 py-1 rounded transition-colors"
        >
          SETTINGS
        </button>
      </div>

      {/* Center Title & Play Button */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-widest text-energy-glow drop-shadow-[0_4px_12px_rgba(194,122,255,0.4)]">
            INVERSION
          </h1>
          <p className="text-xs md:text-sm tracking-[0.25em] text-text-muted mt-1">
            ECHOES OF TWO WORLDS
          </p>
        </div>

        {onStartGame && (
          <button
            type="button"
            onClick={() => onStartGame(true)}
            className="pointer-events-auto px-8 py-2.5 bg-stone-dark hover:bg-stone-mid border-2 border-cyan-accent text-white text-base font-bold tracking-widest rounded shadow-lg transition-transform hover:scale-105"
          >
            START GAME
          </button>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="text-[11px] text-text-dim text-center tracking-wider">
        PRESS ENTER OR CLICK TO START
      </div>
    </div>
  );
}
