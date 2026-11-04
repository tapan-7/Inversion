'use client';

import type { ReactElement } from 'react';
import { useOrientation } from '../../hooks/useOrientation';

export function OrientationWarning(): ReactElement | null {
  const { isPortrait, isTouch } = useOrientation();

  if (!isTouch || !isPortrait) return null;

  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-deep-navy text-energy-glow font-mono text-lg tracking-widest text-center uppercase select-none"
    >
      <div className="w-7 h-12 border-[3px] border-energy-glow rounded animate-[turn_1.8s_ease-in-out_infinite]" />
      <div>Rotate your device</div>
    </div>
  );
}
