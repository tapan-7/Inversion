import type Phaser from 'phaser';
import type { GameEventPayloads } from '../types/event.types';
import { GameEvent } from '../enums/game-event.enum';

type EventKey = keyof GameEventPayloads | GameEvent | string;
type EventCallback<T = unknown> = (payload: T) => void;

class GameEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<K extends keyof GameEventPayloads>(
    event: K,
    callback: (payload: GameEventPayloads[K]) => void,
  ): () => void;
  on(event: string, callback: EventCallback): () => void;
  on(event: EventKey, callback: EventCallback): () => void {
    const key = String(event);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => this.off(key, callback);
  }

  once<K extends keyof GameEventPayloads>(
    event: K,
    callback: (payload: GameEventPayloads[K]) => void,
  ): void;
  once(event: string, callback: EventCallback): void;
  once(event: EventKey, callback: EventCallback): void {
    const key = String(event);
    const wrapper: EventCallback = (payload) => {
      this.off(key, wrapper);
      callback(payload);
    };
    this.on(key, wrapper);
  }

  off<K extends keyof GameEventPayloads>(
    event: K,
    callback: (payload: GameEventPayloads[K]) => void,
  ): void;
  off(event: string, callback: EventCallback): void;
  off(event: EventKey, callback: EventCallback): void {
    const key = String(event);
    this.listeners.get(key)?.delete(callback);
    if (this.listeners.get(key)?.size === 0) {
      this.listeners.delete(key);
    }
  }

  emit<K extends keyof GameEventPayloads>(
    event: K,
    ...args: GameEventPayloads[K] extends void ? [] : [GameEventPayloads[K]]
  ): void;
  emit(event: string, payload?: unknown): void;
  emit(event: EventKey, payload?: unknown): void {
    const key = String(event);
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in event listener for ${key}:`, err);
        }
      });
    }
  }

  removeAllListeners(event?: EventKey): void {
    if (event) {
      this.listeners.delete(String(event));
    } else {
      this.listeners.clear();
    }
  }
}

export const gameEvents = new GameEventEmitter();

/**
 * Bi-directional bridge between Phaser.Game events and the typed GameEventEmitter.
 */
export function bindGameEventEmitter(game: Phaser.Game): () => void {
  const forwardedEvents: (keyof GameEventPayloads)[] = [
    'game:ready',
    'game:started',
    'game:paused',
    'game:resumed',
    'level:completed',
    'game:over',
    'lives:changed',
    'dimension:switched',
    'dimension:blocked',
    'player:died',
    'player:jumped',
    'level:fragment-collected',
    'level:checkpoint-lit',
    'level:portal-unlocked',
    'ui:request-pause',
    'ui:request-restart',
    'ui:request-menu',
    'tip:show',
    'tip:hide',
    'level:sequence-step',
    'level:sequence-wrong',
    'level:gate-opened',
    'level:collapse-started',
    'level:collapse-step',
  ];

  // Phaser -> React
  const phaserListeners = forwardedEvents.map((evt) => {
    const handler = (payload: unknown) => {
      gameEvents.emit(evt, payload as never);
    };
    game.events.on(evt, handler);
    return () => game.events.off(evt, handler);
  });

  // React -> Phaser (commands like pause request)
  const unsubs = [
    gameEvents.on(GameEvent.REQUEST_PAUSE, () => {
      game.events.emit(GameEvent.REQUEST_PAUSE);
    }),
    gameEvents.on(GameEvent.REQUEST_RESTART, (payload) => {
      game.events.emit(GameEvent.REQUEST_RESTART, payload);
    }),
    gameEvents.on(GameEvent.REQUEST_MENU, () => {
      game.events.emit(GameEvent.REQUEST_MENU);
    }),
  ];

  return () => {
    phaserListeners.forEach((u) => u());
    unsubs.forEach((u) => u());
  };
}

export { GameEventEmitter };
