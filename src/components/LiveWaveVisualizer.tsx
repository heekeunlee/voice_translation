import React from 'react';

interface LiveWaveVisualizerProps {
  isListening: boolean;
  audioLevel: number; // 0 ~ 100
  audioFrequencies: number[]; // array of 24 numbers (0~100)
}

export const LiveWaveVisualizer: React.FC<LiveWaveVisualizerProps> = ({
  isListening,
  audioLevel,
  audioFrequencies,
}) => {
  return (
    <div className="flex items-center gap-1 h-8 px-3 py-1 bg-slate-900/80 rounded-full border border-slate-800">
      {audioFrequencies.slice(0, 16).map((freq, idx) => {
        // Height calculation with minimum baseline when listening
        const heightPercent = isListening 
          ? Math.max(15, Math.min(100, (freq * 0.8) + (audioLevel * 0.4)))
          : 15;
          
        return (
          <div
            key={idx}
            className={`w-1 rounded-full transition-all duration-75 ${
              isListening
                ? 'bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-400 shadow-sm shadow-indigo-500/50'
                : 'bg-slate-700'
            }`}
            style={{
              height: `${heightPercent}%`,
              opacity: isListening ? 0.7 + (freq / 300) : 0.3,
            }}
          />
        );
      })}
    </div>
  );
};
