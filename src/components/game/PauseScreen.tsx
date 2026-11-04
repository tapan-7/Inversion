'use client';

import type { ReactElement } from 'react';
import { useGameContext } from '../../providers/GameProvider';
import { GameState } from '../../game/enums/game-state.enum';

export interface PauseScreenProps {
  onOpenSettings?: () => void;
  onOpenHowToPlay?: () => void;
}

export function PauseScreen({ onOpenSettings, onOpenHowToPlay }: PauseScreenProps): ReactElement | null {
  const { gameState, resumeGame, restartGame, setGameState } = useGameContext();

  if (gameState !== GameState.PAUSED) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#101a32]/80 backdrop-blur-xs p-4 select-none font-mono">
      <div className="w-full max-w-[280px] bg-[#101a32] border-2 border-[#c27aff] rounded p-6 flex flex-col items-center gap-4 shadow-2xl">
        <div className="text-2xl font-bold tracking-widest text-[#c27aff]">PAUSED</div>

        <div className="w-full flex flex-col gap-2.5">
          <button
            type="button"
            onClick={resumeGame}
            className="w-full py-2 bg-[#1d2e50] hover:bg-[#263c61] border border-[#4fe3e8] text-white text-sm tracking-wider rounded transition-colors"
          >
            RESUME
          </button>
          <button
            type="button"
            onClick={restartGame}
            className="w-full py-2 bg-[#16233f] hover:bg-[#1d2e50] border border-[#4fe3e8]/40 hover:border-[#4fe3e8] text-white text-sm tracking-wider rounded transition-colors"
          >
            RESTART
          </button>
          {onOpenHowToPlay && (
            <button
              type="button"
              onClick={onOpenHowToPlay}
              className="w-full py-2 bg-[#16233f] hover:bg-[#1d2e50] border border-[#4fe3e8]/40 hover:border-[#4fe3e8] text-white text-sm tracking-wider rounded transition-colors"
            >
              HOW TO PLAY
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full py-2 bg-[#16233f] hover:bg-[#1d2e50] border border-[#4fe3e8]/40 hover:border-[#4fe3e8] text-white text-sm tracking-wider rounded transition-colors"
            >
              SETTINGS
            </button>
          )}
          <button
            type="button"
            onClick={() => setGameState(GameState.MENU)}
            className="w-full py-2 bg-[#16233f] hover:bg-[#1d2e50] border border-[#4fe3e8]/40 hover:border-[#4fe3e8] text-[#8fa6d6] hover:text-white text-sm tracking-wider rounded transition-colors"
          >
            MAIN MENU
          </button>
        </div>

        <div className="text-[11px] text-[#5878ab] text-center mt-2">
          ESC RESUME
        </div>
      </div>
    </div>
  );
}
