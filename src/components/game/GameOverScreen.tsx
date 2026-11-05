'use client';

import type { ReactElement } from 'react';
import { useGameContext } from '../../providers/GameProvider';
import { GameState } from '../../game/enums/game-state.enum';

export function GameOverScreen(): ReactElement | null {
  const { gameState, restartGame, goToMenu } = useGameContext();

  if (gameState !== GameState.GAME_OVER) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-deep-navy/85 backdrop-blur-xs p-4 select-none font-mono">
      <div className="w-full max-w-[320px] bg-deep-navy border-2 border-danger rounded p-6 flex flex-col items-center gap-4 shadow-2xl">
        <div className="text-xl font-bold tracking-widest text-danger text-center">
          OUT OF LIVES
        </div>
        <div className="text-xs text-text-muted text-center tracking-wide leading-relaxed">
          Your journey in both dimensions has collapsed. Unlocked chapters remain preserved.
        </div>

        <div className="w-full flex flex-col gap-2.5 mt-2">
          <button
            type="button"
            onClick={restartGame}
            className="w-full py-2.5 bg-stone-dark hover:bg-stone-mid border border-cyan-accent text-white text-xs tracking-wider font-bold rounded transition-colors"
          >
            RESTART FROM CHAPTER 1
          </button>
          <button
            type="button"
            onClick={goToMenu}
            className="w-full py-2 bg-stone-shadow hover:bg-stone-dark border border-cyan-accent/40 hover:border-cyan-accent text-text-muted hover:text-white text-xs tracking-wider rounded transition-colors"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
