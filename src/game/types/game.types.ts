import type { GameState } from '../enums/game-state.enum';
import type { Dimension } from '../enums/dimension.enum';

export interface GameSettingsData {
  volume: number;
  muted: boolean;
  lowEffects: boolean;
  touchControls: 'auto' | 'on' | 'off';
  seenTips: string[];
}

export interface GameContextState {
  gameState: GameState;
  dimension: Dimension | 'forgotten' | 'awakening';
  levelId: string;
  chapterTitle: string;
  fragments: { found: number; total: number };
  isPaused: boolean;
  isMuted: boolean;
  volume: number;
  activeTip: { id: string; text: string } | null;
  orientationLandscape: boolean;
}

