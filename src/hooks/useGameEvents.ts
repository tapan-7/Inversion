'use client';

import { useEffect, useRef } from 'react';
import { gameEvents } from '../game/events/GameEventEmitter';
import type { GameEventPayloads } from '../game/types/event.types';

export function useGameEvents<K extends keyof GameEventPayloads>(
  event: K,
  handler: (payload: GameEventPayloads[K]) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = gameEvents.on(event, (payload) => {
      handlerRef.current(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [event]);
}

