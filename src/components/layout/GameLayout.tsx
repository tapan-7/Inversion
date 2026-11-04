'use client';

import type { ReactNode, ReactElement } from 'react';

export function GameLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <main className="relative w-screen h-screen h-[100dvh] overflow-hidden bg-[#101a32] text-white">
      {children}
    </main>
  );
}
