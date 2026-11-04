'use client';

import { useState, type ReactElement } from 'react';
import dynamic from 'next/dynamic';
import { GameHUD } from './GameHUD';
import { PauseScreen } from './PauseScreen';
import { LevelCompleteScreen } from './LevelCompleteScreen';
import { GameOverScreen } from './GameOverScreen';
import { InstructionPanel } from './InstructionPanel';
import { OrientationWarning } from './OrientationWarning';
import { GameLayout } from '../layout/GameLayout';

const GameCanvas = dynamic(
  () => import('./GameCanvas').then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-deep-navy text-cyan-accent font-mono text-sm tracking-widest select-none">
        LOADING INVERSION...
      </div>
    ),
  },
);

export function GameContainer(): ReactElement {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <GameLayout>
      {/* Background Phaser Engine Canvas (SSR-disabled) */}
      <GameCanvas />

      {/* Reactive Game HUD */}
      <GameHUD />

      {/* Overlays and Modals */}
      <PauseScreen onOpenHowToPlay={() => setShowInstructions(true)} />
      <LevelCompleteScreen />
      <GameOverScreen />
      <InstructionPanel
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />

      {/* Mobile Orientation Alert */}
      <OrientationWarning />
    </GameLayout>
  );
}
