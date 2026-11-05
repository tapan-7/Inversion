'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { GameState } from '../game/enums/game-state.enum';
import { Dimension } from '../game/enums/dimension.enum';
import { GameEvent } from '../game/enums/game-event.enum';
import { gameEvents } from '../game/events/GameEventEmitter';
import { settings } from '../game/systems/Settings';
import { audio } from '../game/systems/AudioEngine';
import { progress } from '../game/systems/ProgressManager';
import { DEFAULT_LIVES, MAX_LIVES } from '../game/constants';
import type { LevelCompletedPayload, TipPayload } from '../game/types/event.types';

export interface GameContextValue {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  dimension: Dimension | 'forgotten' | 'awakening';
  fragments: { found: number; total: number };
  lives: number;
  maxLives: number;
  chapterTitle: string;
  levelId: string;
  isPaused: boolean;
  activeTip: TipPayload | null;
  volume: number;
  isMuted: boolean;
  lastCompletion: LevelCompletedPayload | null;
  // Controls
  togglePause: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  goToMenu: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [dimension, setDimension] = useState<Dimension | 'forgotten' | 'awakening'>('forgotten');
  const [fragments, setFragments] = useState<{ found: number; total: number }>({ found: 0, total: 0 });
  const [lives, setLives] = useState<number>(DEFAULT_LIVES);
  const [chapterTitle] = useState('THE FORGOTTEN GATE');
  const [levelId] = useState('chapter1');
  const [isPaused, setIsPaused] = useState(false);
  const [activeTip, setActiveTip] = useState<TipPayload | null>(null);
  const [volume, setVolumeState] = useState(settings.data.volume);
  const [isMuted, setIsMuted] = useState(settings.data.muted);
  const [lastCompletion, setLastCompletion] = useState<LevelCompletedPayload | null>(null);

  useEffect(() => {
    // Listen to settings changes
    const unsubSettings = settings.onChange((data) => {
      setVolumeState(data.volume);
      setIsMuted(data.muted);
    });

    // Listen to game events
    const unsubReady = gameEvents.on(GameEvent.GAME_READY, () => {
      setGameState(GameState.MENU);
    });

    const unsubStart = gameEvents.on(GameEvent.GAME_STARTED, () => {
      setGameState(GameState.PLAYING);
      setIsPaused(false);
    });

    const unsubPaused = gameEvents.on(GameEvent.GAME_PAUSED, () => {
      setIsPaused(true);
      setGameState(GameState.PAUSED);
    });

    const unsubResumed = gameEvents.on(GameEvent.GAME_RESUMED, () => {
      setIsPaused(false);
      setGameState(GameState.PLAYING);
    });

    const unsubDim = gameEvents.on(GameEvent.DIMENSION_CHANGED, (dim) => {
      setDimension(dim);
    });

    const unsubLives = gameEvents.on(GameEvent.LIVES_CHANGED, ({ lives: nextLives }) => {
      setLives(nextLives);
    });

    const unsubGameOver = gameEvents.on(GameEvent.GAME_OVER, () => {
      setGameState(GameState.GAME_OVER);
    });

    const unsubComplete = gameEvents.on(GameEvent.LEVEL_COMPLETED, (payload) => {
      setLastCompletion(payload);
      setGameState(GameState.LEVEL_COMPLETE);
    });

    const unsubTipShow = gameEvents.on(GameEvent.TIP_SHOW, (tip) => {
      setActiveTip(tip);
    });

    const unsubTipHide = gameEvents.on(GameEvent.TIP_HIDE, () => {
      setActiveTip(null);
    });

    const unsubFrag = gameEvents.on(GameEvent.FRAGMENT_COLLECTED, () => {
      setFragments((prev) => ({ ...prev, found: prev.found + 1 }));
    });

    return () => {
      unsubSettings();
      unsubReady();
      unsubStart();
      unsubPaused();
      unsubResumed();
      unsubDim();
      unsubLives();
      unsubGameOver();
      unsubComplete();
      unsubTipShow();
      unsubTipHide();
      unsubFrag();
    };
  }, []);

  const togglePause = useCallback(() => {
    gameEvents.emit(GameEvent.REQUEST_PAUSE);
  }, []);

  const resumeGame = useCallback(() => {
    gameEvents.emit(GameEvent.GAME_RESUMED);
    setIsPaused(false);
    setGameState(GameState.PLAYING);
  }, []);

  const restartGame = useCallback(() => {
    setIsPaused(false);
    setGameState(GameState.PLAYING);
    setLives(DEFAULT_LIVES);
    progress.startRun('chapter1');
    gameEvents.emit(GameEvent.REQUEST_RESTART, { chapter: 'chapter1' });
  }, []);

  const goToMenu = useCallback(() => {
    setIsPaused(false);
    setGameState(GameState.MENU);
    gameEvents.emit(GameEvent.REQUEST_MENU);
  }, []);

  const setVolume = useCallback((v: number) => {
    settings.update({ volume: v });
    audio.applySettings(v, isMuted);
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    settings.update({ muted: nextMuted });
    audio.applySettings(volume, nextMuted);
  }, [isMuted, volume]);

  const value: GameContextValue = {
    gameState,
    setGameState,
    dimension,
    fragments,
    lives,
    maxLives: MAX_LIVES,
    chapterTitle,
    levelId,
    isPaused,
    activeTip,
    volume,
    isMuted,
    lastCompletion,
    togglePause,
    setVolume,
    toggleMute,
    resumeGame,
    restartGame,
    goToMenu,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return ctx;
}
