'use client';

import type { ReactElement } from 'react';

export interface InstructionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstructionPanel({ isOpen, onClose }: InstructionPanelProps): ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#101a32]/85 backdrop-blur-xs p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-[480px] bg-[#101a32] border-2 border-[#4fe3e8] rounded p-4 font-mono shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#4fe3e8]/30 pb-2 mb-3">
          <div className="text-base tracking-widest font-bold text-white">
            HOW TO <span className="text-[#4fe3e8]">PLAY</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#8fa6d6] hover:text-white px-2 py-0.5 border border-[#8fa6d6]/40 hover:border-white rounded transition-colors"
          >
            [X] ESC
          </button>
        </div>

        {/* 2x2 Control Cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Card 01 */}
          <div className="bg-[#131f38] border border-[#4fe3e8] rounded p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#4fe3e8] font-bold">01</span>
              <span className="px-1.5 py-0.5 bg-[#16233f] border border-[#4fe3e8] text-[#4fe3e8] rounded text-[10px]">
                A / D
              </span>
            </div>
            <div className="text-white text-xs font-bold">MOVE</div>
            <div className="text-[#7a98c8] text-[10px]">Walk left / right (or Arrows)</div>
          </div>

          {/* Card 02 */}
          <div className="bg-[#131f38] border border-[#4fe3e8] rounded p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#4fe3e8] font-bold">02</span>
              <span className="px-1.5 py-0.5 bg-[#16233f] border border-[#4fe3e8] text-[#4fe3e8] rounded text-[10px]">
                W / Z
              </span>
            </div>
            <div className="text-white text-xs font-bold">JUMP</div>
            <div className="text-[#7a98c8] text-[10px]">Tap for hop - Hold high jump</div>
          </div>

          {/* Card 03 */}
          <div className="bg-[#131f38] border border-[#c27aff] rounded p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#c27aff] font-bold">03</span>
              <span className="px-1.5 py-0.5 bg-[#16233f] border border-[#c27aff] text-[#c27aff] rounded text-[10px]">
                SPACE
              </span>
            </div>
            <div className="text-white text-xs font-bold">INVERT</div>
            <div className="text-[#9d84c4] text-[10px]">Switch between worlds</div>
          </div>

          {/* Card 04 */}
          <div className="bg-[#131f38] border border-[#c27aff] rounded p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#c27aff] font-bold">04</span>
              <span className="px-1.5 py-0.5 bg-[#16233f] border border-[#c27aff] text-[#c27aff] rounded text-[10px]">
                SPACE
              </span>
            </div>
            <div className="text-white text-xs font-bold">AIR FLIP</div>
            <div className="text-[#9d84c4] text-[10px]">Switch mid-air to cross gaps</div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-[#131f38] border border-[#c27aff] rounded p-2.5 mb-3 text-[10px] text-[#9dbbd8] space-y-1">
          <div className="text-[#c27aff] font-bold tracking-wider mb-1">TIPS</div>
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
            className="px-4 py-1 text-xs tracking-wider bg-[#1d2e50] hover:bg-[#263c61] text-white border border-[#4fe3e8] rounded transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
