import React, { useState, useEffect } from 'react';
import { 
  X, 
  Volume2, 
  Mic, 
  MicOff, 
  Sparkles, 
  GraduationCap, 
  Award,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TranslationItem } from '../types';
import { ttsService } from '../services/tts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ShadowingModalProps {
  isOpen: boolean;
  item: TranslationItem | null;
  onClose: () => void;
}

export const ShadowingModal: React.FC<ShadowingModalProps> = ({
  isOpen,
  item,
  onClose,
}) => {
  const [recordedSpokenText, setRecordedSpokenText] = useState('');
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1.0);

  const {
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'en-US',
    onFinalTranscript: (text) => {
      setRecordedSpokenText(text);
      if (item?.translatedText) {
        const score = calculateSimilarity(item.translatedText, text);
        setSimilarityScore(score);
        if (score >= 80) {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
      }
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setRecordedSpokenText('');
      setSimilarityScore(null);
      stopListening();
    }
  }, [isOpen, stopListening]);

  if (!isOpen || !item) return null;

  const handlePlayTTS = (playSpeed = speed) => {
    setSpeed(playSpeed);
    ttsService.speak(item.translatedText, {
      lang: 'en-US',
      rate: playSpeed,
    });
  };

  const calculateSimilarity = (target: string, spoken: string): number => {
    const cleanT = target.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/);
    const cleanS = spoken.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/);

    if (cleanT.length === 0 || cleanS.length === 0) return 0;

    let matchCount = 0;
    cleanT.forEach(word => {
      if (cleanS.includes(word)) matchCount++;
    });

    const ratio = matchCount / Math.max(cleanT.length, cleanS.length);
    return Math.min(100, Math.round(ratio * 100));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              원어민 억양 섀도잉 (Shadowing) 연습
            </h2>
            <p className="text-xs text-slate-400">원어민 발음을 듣고 따라 말하며 유창성과 억양을 훈련하세요.</p>
          </div>
        </div>

        {/* Target Sentence Card */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-800/40 p-5 mb-5 shadow-inner">
          <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 목표 문장 (Target English)
          </div>
          <div className="text-white text-xl sm:text-2xl font-bold leading-relaxed tracking-tight mb-3">
            {item.translatedText}
          </div>
          <div className="text-slate-400 text-xs sm:text-sm font-medium">
            원문 뜻: {item.sourceText}
          </div>

          {/* Speed TTS Controls */}
          <div className="mt-4 pt-3 border-t border-indigo-900/60 flex items-center justify-between">
            <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" /> 원어민 듣기:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePlayTTS(0.75)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  speed === 0.75 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                0.75x (슬로우)
              </button>
              <button
                onClick={() => handlePlayTTS(1.0)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  speed === 1.0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                1.0x (기본)
              </button>
              <button
                onClick={() => handlePlayTTS(1.25)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  speed === 1.25 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                1.25x (빠르게)
              </button>
            </div>
          </div>
        </div>

        {/* User Recording Area */}
        <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 mb-5 text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            나의 발음 녹음 & 일치도 분석
          </div>

          <div className="min-h-[50px] flex items-center justify-center mb-4">
            {recordedSpokenText ? (
              <span className="text-slate-200 text-base font-semibold italic">
                &ldquo;{recordedSpokenText}&rdquo;
              </span>
            ) : (
              <span className="text-slate-600 text-sm">
                {isListening ? '듣고 있는 중입니다... 문장을 따라 말씀하세요.' : '아래 버튼을 누르고 따라 말해보세요.'}
              </span>
            )}
          </div>

          {/* Record Button */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/30'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>녹음 완료하기</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>따라 말하기 시작 (마이크)</span>
                </>
              )}
            </button>
          </div>

          {/* Similarity Score */}
          {similarityScore !== null && (
            <div className="mt-5 p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className={`w-5 h-5 ${similarityScore >= 80 ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-300">발음 일치율:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-extrabold font-mono ${
                  similarityScore >= 80 ? 'text-emerald-400' : similarityScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {similarityScore}%
                </span>
                <span className="text-xs text-slate-400">
                  {similarityScore >= 80 ? '🎉 훌륭해요! 원어민 수준입니다.' : '💪 조금 더 억양을 살려보세요!'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Learning Hint */}
        {item.learningDetails?.shadowingTip && (
          <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-pink-400 shrink-0" />
            <span><strong>발음 팁:</strong> {item.learningDetails.shadowingTip}</span>
          </div>
        )}

      </div>
    </div>
  );
};
