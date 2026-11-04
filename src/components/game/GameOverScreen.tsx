'use client';

import type { ReactElement } from 'react';
import { useGameContext } from '../../providers/GameProvider';
import { GameState } from '../../game/enums/game-state.enum';

export function GameOverScreen(): ReactElement | null {
  const { gameState, restartGame, setGameState } = useGameContext();

  if (gameState !== GameState.GAME_OVER) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-deep-navy/85 backdrop-blur-xs p-4 select-none font-mono">
      <div className="w-full max-w-[280px] bg-deep-navy border-2 border-danger rounded p-6 flex flex-col items-center gap-4 shadow-2xl">
        <div className="text-xl font-bold tracking-widest text-danger text-center">
          DEFEATED
        </div>

        <div className="w-full flex flex-col gap-2.5">
          <button
            type="button"
            onClick={restartGame}
            className="w-full py-2 bg-stone-dark hover:bg-stone-mid border border-cyan-accent text-white text-sm tracking-wider rounded transition-colors"
          >
            RESPAWN
          </button>
          <button
            type="button"
            onClick={() => setGameState(GameState.MENU)}
            className="w-full py-2 bg-stone-shadow hover:bg-stone-dark border border-cyan-accent/40 hover:border-cyan-accent text-text-muted hover:text-white text-sm tracking-wider rounded transition-colors"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
