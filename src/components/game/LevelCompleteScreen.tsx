'use client';

import type { ReactElement } from 'react';
import { useGameContext } from '../../providers/GameProvider';
import { GameState } from '../../game/enums/game-state.enum';
import { formatTime } from '../../lib/utils';

export interface LevelCompleteScreenProps {
  onNextChapter?: () => void;
  onMenu?: () => void;
}

export function LevelCompleteScreen({ onNextChapter, onMenu }: LevelCompleteScreenProps): ReactElement | null {
  const { gameState, lastCompletion, setGameState } = useGameContext();

  if (gameState !== GameState.LEVEL_COMPLETE || !lastCompletion) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-deep-navy/85 backdrop-blur-xs p-4 select-none font-mono animate-fade-in">
      <div className="w-full max-w-[320px] bg-deep-navy border-2 border-cyan-accent rounded p-6 flex flex-col items-center gap-4 shadow-2xl">
        <div className="text-xl font-bold tracking-widest text-cyan-accent text-center">
          CHAPTER COMPLETE
        </div>
        <div className="text-sm text-white/90 text-center -mt-2">
          {lastCompletion.title}
        </div>

        {/* Stats */}
        <div className="w-full bg-card-navy border border-cyan-accent/40 rounded p-3 text-xs flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-text-muted">TIME:</span>
            <span className="text-white font-bold">{formatTime(lastCompletion.timeMs)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">BEST TIME:</span>
            <span className="text-gold font-bold">{formatTime(lastCompletion.bestTimeMs)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">ECHOES:</span>
            <span className="text-cyan-accent font-bold">
              {lastCompletion.found} / {lastCompletion.total}
            </span>
          </div>
          {lastCompletion.isNewBest && (
            <div className="text-center text-[11px] text-gold font-bold pt-1">
              NEW RECORD!
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2">
          {lastCompletion.next && (
            <button
              type="button"
              onClick={onNextChapter}
              className="w-full py-2 bg-stone-dark hover:bg-stone-mid border border-cyan-accent text-white text-sm tracking-wider rounded transition-colors"
            >
              NEXT CHAPTER
            </button>
          )}
          <button
            type="button"
            onClick={onMenu ?? (() => setGameState(GameState.MENU))}
            className="w-full py-2 bg-stone-shadow hover:bg-stone-dark border border-cyan-accent/40 hover:border-cyan-accent text-text-muted hover:text-white text-sm tracking-wider rounded transition-colors"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
