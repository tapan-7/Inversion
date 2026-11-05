import type { Dimension } from '../enums/dimension.enum';

export interface LevelCompletedPayload {
  levelId: string;
  levelKey?: string;
  title: string;
  timeMs: number;
  bestTimeMs: number;
  isNewBest: boolean;
  found: number;
  total: number;
  next?: string;
}

export interface FragmentPayload {
  found: number;
  total: number;
}

export interface TipPayload {
  id: string;
  text: string;
}

export interface PlayerDiedPayload {
  reason: 'fall' | 'watcher' | 'spike';
}

export interface GameStartedPayload {
  levelId?: string;
  resume?: boolean;
}

export interface GameEventPayloads {
  'game:ready': void;
  'game:started': GameStartedPayload;
  'game:paused': void;
  'game:resumed': void;
  'level:completed': LevelCompletedPayload;
  'game:over': { reason?: string };
  'lives:changed': { lives: number; max: number };
  'dimension:switched': Dimension | 'forgotten' | 'awakening';
  'dimension:blocked': void;
  'player:died': 'fall' | 'watcher' | 'spike' | PlayerDiedPayload;
  'player:jumped': void;
  'level:fragment-collected': void;
  'level:checkpoint-lit': void;
  'level:portal-unlocked': void;
  'ui:request-pause': void;
  'ui:request-restart': { chapter?: string } | void;
  'ui:request-menu': void;
  'tip:show': TipPayload;
  'tip:hide': void;
  'level:sequence-step': number;
  'level:sequence-wrong': void;
  'level:gate-opened': void;
  'level:collapse-started': void;
  'level:collapse-step': number;
}

