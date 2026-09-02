import React from 'react';

interface LiveWaveVisualizerProps {
  isListening: boolean;
  audioLevel: number;
  audioFrequencies: number[];
  /** Match the surrounding stage so the bars stay legible on either ground. */
  dark?: boolean;
}

/**
 * Mic input spectrum, drawn as a symmetric bar strip beside the record button.
 *
 * It renders only while listening: an idle row of flat bars reads as broken
 * rather than calm, and the conversation view is deliberately quiet at rest.
 */
export const LiveWaveVisualizer: React.FC<LiveWaveVisualizerProps> = ({
  isListening,
  audioLevel,
  audioFrequencies,
  dark = false,
}) => {
  if (!isListening) return null;

  const bars = audioFrequencies.slice(0, 18);

  return (
    <div
      className="flex items-center justify-center gap-[3px] h-8"
      aria-hidden="true"
    >
      {bars.map((freq, idx) => {
        // Taper the ends so the strip reads as a shape rather than a bar chart.
        const distanceFromCentre = Math.abs(idx - (bars.length - 1) / 2);
        const taper = 1 - (distanceFromCentre / bars.length) * 0.85;
        const height = Math.max(8, Math.min(100, (freq * 0.75 + audioLevel * 0.45) * taper));

        return (
          <div
            key={idx}
            className={`w-[3px] rounded-full transition-[height] duration-75 ${
              dark
                ? 'bg-gradient-to-t from-indigo-400 to-pink-300'
                : 'bg-gradient-to-t from-indigo-500 to-pink-400'
            }`}
            style={{
              height: `${height}%`,
              opacity: 0.45 + Math.min(freq, 100) / 180,
            }}
          />
        );
      })}
    </div>
  );
};
