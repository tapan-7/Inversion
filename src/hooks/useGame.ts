'use client';

import { useGameContext } from '../providers/GameProvider';

export function useGame() {
  return useGameContext();
}

