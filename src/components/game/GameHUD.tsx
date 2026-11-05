'use client';

import type { ReactElement } from 'react';
import { useGameContext } from '../../providers/GameProvider';
import { GameState } from '../../game/enums/game-state.enum';

export function GameHUD(): ReactElement | null {
  const {
    gameState,
    dimension,
    fragments,
    lives,
    maxLives,
    chapterTitle,
    activeTip,
    isMuted,
    toggleMute,
    togglePause,
  } = useGameContext();

  if (gameState !== GameState.PLAYING && gameState !== GameState.PAUSED) {
    return null;
  }

  const isForgotten = dimension === 'forgotten';
  const dimColor = isForgotten ? 'text-cyan-accent' : 'text-energy-glow';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 select-none">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="text-[12px] font-mono tracking-wider text-energy-glow drop-shadow">
            {chapterTitle}
          </div>
          <div className={`text-[12px] font-mono uppercase font-bold tracking-widest ${dimColor}`}>
            {dimension.toUpperCase()}
          </div>
          {fragments.total > 0 && (
            <div className="text-[11px] font-mono tracking-wider text-gold">
              ECHOES {fragments.found}/{fragments.total}
            </div>
          )}
          {/* Lives indicator */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-mono tracking-wider text-text-muted">LIVES</span>
            <div className="flex items-center gap-1 text-xs">
              {Array.from({ length: maxLives }).map((_, i) => (
                <span
                  key={i}
                  className={`transition-all duration-300 ${
                    i < lives
                      ? 'text-danger scale-110 drop-shadow-[0_0_4px_rgba(255,43,61,0.6)]'
                      : 'text-stone-dark opacity-35 scale-90'
                  }`}
                >
                  {i < lives ? '♥' : '♡'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="px-2.5 py-1 text-[11px] font-mono bg-stone-shadow/80 text-text-muted hover:text-white border border-cyan-accent/40 hover:border-cyan-accent rounded transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? 'MUTED' : 'SOUND'}
          </button>
          <button
            type="button"
            onClick={togglePause}
            className="px-2.5 py-1 text-[11px] font-mono bg-stone-shadow/80 text-text-muted hover:text-white border border-cyan-accent/40 hover:border-cyan-accent rounded transition-colors"
            title="Pause Game"
          >
            PAUSE
          </button>
        </div>
      </div>

      {/* Active tutorial tip banner */}
      {activeTip && (
        <div className="mx-auto mb-6 px-4 py-1.5 bg-deep-navy/90 border border-cyan-accent text-white font-mono text-[11px] tracking-wide rounded shadow-lg animate-fade-in">
          {activeTip.text}
        </div>
      )}
    </div>
  );
}
