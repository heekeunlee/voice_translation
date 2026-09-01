import React from 'react';
import type { TranslationMode } from '../types';
import { TRANSLATION_MODES } from '../constants';
import { Sparkles, Info } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: TranslationMode;
  onSelectMode: (mode: TranslationMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const activeModeConfig = TRANSLATION_MODES.find(m => m.id === currentMode) || TRANSLATION_MODES[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-6 pb-2">
      {/* Mode Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>번역 모드:</span>
        </div>

        {TRANSLATION_MODES.map((mode) => {
          const isActive = mode.id === currentMode;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 border ${
                isActive
                  ? `${mode.badgeColor} border-current shadow-lg scale-[1.02]`
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800/80'
              }`}
            >
              <span className="text-base">{mode.icon}</span>
              <span>{mode.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Mode Guide Banner */}
      <div className="mt-2 px-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            <strong className="text-slate-200 font-semibold">{activeModeConfig.name} 특징: </strong>
            {activeModeConfig.description}
          </span>
        </div>
        <div className="hidden md:block text-[11px] text-slate-500 font-mono italic shrink-0">
          예시: {activeModeConfig.exampleSentence}
        </div>
      </div>
    </div>
  );
};
