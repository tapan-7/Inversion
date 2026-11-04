'use client';

import type { ReactElement } from 'react';

export interface InstructionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstructionPanel({ isOpen, onClose }: InstructionPanelProps): ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-deep-navy/85 backdrop-blur-xs p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-[480px] bg-deep-navy border-2 border-cyan-accent rounded p-4 font-mono shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-accent/30 pb-2 mb-3">
          <div className="text-base tracking-widest font-bold text-white">
            HOW TO <span className="text-cyan-accent">PLAY</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-text-muted hover:text-white px-2 py-0.5 border border-text-muted/40 hover:border-white rounded transition-colors"
          >
            [X] ESC
          </button>
        </div>

        {/* 2x2 Control Cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Card 01 */}
          <div className="bg-card-navy border border-cyan-accent rounded p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-cyan-accent font-bold">01</span>
              <span className="px-1.5 py-0.5 bg-stone-shadow border border-cyan-accent text-cyan-accent rounded text-[10px]">
                A / D
              </span>
            </div>
            <div className="text-white text-xs font-bold">MOVE</div>
            <div className="text-text-subtle text-[10px]">Walk left / right (or Arrows)</div>
          </div>

          {/* Card 02 */}
          <div className="bg-card-navy border border-cyan-accent rounded p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-cyan-accent font-bold">02</span>
              <span className="px-1.5 py-0.5 bg-stone-shadow border border-cyan-accent text-cyan-accent rounded text-[10px]">
                W / Z
              </span>
            </div>
            <div className="text-white text-xs font-bold">JUMP</div>
            <div className="text-text-subtle text-[10px]">Tap for hop - Hold high jump</div>
          </div>

          {/* Card 03 */}
          <div className="bg-card-navy border border-energy-glow rounded p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-energy-glow font-bold">03</span>
              <span className="px-1.5 py-0.5 bg-stone-shadow border border-energy-glow text-energy-glow rounded text-[10px]">
                SPACE
              </span>
            </div>
            <div className="text-white text-xs font-bold">INVERT</div>
            <div className="text-text-purple text-[10px]">Switch between worlds</div>
          </div>

          {/* Card 04 */}
          <div className="bg-card-navy border border-energy-glow rounded p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-energy-glow font-bold">04</span>
              <span className="px-1.5 py-0.5 bg-stone-shadow border border-energy-glow text-energy-glow rounded text-[10px]">
                SPACE
              </span>
            </div>
            <div className="text-white text-xs font-bold">AIR FLIP</div>
            <div className="text-text-purple text-[10px]">Switch mid-air to cross gaps</div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-card-navy border border-energy-glow rounded p-2.5 mb-3 text-[10px] text-text-light space-y-1">
          <div className="text-energy-glow font-bold tracking-wider mb-1">TIPS</div>
          <div>* Watch both worlds: solid walls block your switch.</div>
          <div>* Tap Jump for short hops, hold Jump for maximum height.</div>
          <div>* Switch in mid-air to cross wide gaps and energy bridges.</div>
          <div>* Collect all Echo Fragments to awaken the exit portal.</div>
        </div>

        {/* Footer */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 text-xs tracking-wider bg-stone-dark hover:bg-stone-mid text-white border border-cyan-accent rounded transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
