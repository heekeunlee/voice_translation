import React, { useState, useEffect, useRef } from 'react';
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
import { scoreShadowing } from '../utils/shadowingScore';
import type { ShadowingResult } from '../utils/shadowingScore';
import { SUPPORTED_LANGUAGES } from '../constants';

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
  // One attempt object tagged with the sentence it belongs to, so opening a
  // different sentence simply stops matching instead of needing a reset effect.
  const [attempt, setAttempt] = useState<
    { itemId: string; spoken: string; result: ShadowingResult } | null
  >(null);
  const [speed, setSpeed] = useState(1.0);

  // Practise in the language the sentence is actually written in. Hardcoding
  // en-US meant shadowing a Japanese or Chinese translation listened in English
  // and always scored zero.
  const practiceLang = item?.targetLang || 'en-US';
  const activeItemRef = useRef(item);
  useEffect(() => {
    activeItemRef.current = item;
  }, [item]);

  const {
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: practiceLang,
    onFinalTranscript: (text) => {
      const active = activeItemRef.current;
      if (!active?.translatedText) return;

      const scored = scoreShadowing(active.translatedText, text);
      setAttempt({ itemId: active.id, spoken: text, result: scored });
      if (scored.score >= 80) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
    },
  });

  useEffect(() => {
    if (isOpen) return;
    stopListening();
  }, [isOpen, stopListening]);

  if (!isOpen || !item) return null;

  // An attempt from a previously opened sentence is simply not shown.
  const currentAttempt = attempt?.itemId === item.id ? attempt : null;
  const recordedSpokenText = currentAttempt?.spoken ?? '';
  const result = currentAttempt?.result ?? null;

  const langLabel =
    SUPPORTED_LANGUAGES.find(l => l.speechCode === practiceLang)?.name.split(' ')[0]
    ?? practiceLang;

  const handlePlayTTS = (playSpeed = speed) => {
    setSpeed(playSpeed);
    ttsService.speak(item.translatedText, {
      lang: practiceLang,
      rate: playSpeed,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-200">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              원어민 억양 섀도잉 (Shadowing) 연습
            </h2>
            <p className="text-xs text-gray-500">원어민 발음을 듣고 따라 말하며 유창성과 억양을 훈련하세요.</p>
          </div>
        </div>

        {/* Target Sentence Card */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50 border border-indigo-200 p-5 mb-5 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> 목표 문장 ({langLabel})
          </div>
          <div className="text-gray-900 text-xl sm:text-2xl font-bold leading-relaxed tracking-tight mb-3">
            {item.translatedText}
          </div>
          <div className="text-gray-600 text-xs sm:text-sm font-medium">
            원문 뜻: {item.sourceText}
          </div>

          {/* Speed TTS Controls */}
          <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between">
            <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" /> 원어민 듣기:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePlayTTS(0.75)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  speed === 0.75 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                0.75x (슬로우)
              </button>
              <button
                onClick={() => handlePlayTTS(1.0)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  speed === 1.0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                1.0x (기본)
              </button>
              <button
                onClick={() => handlePlayTTS(1.25)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  speed === 1.25 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                1.25x (빠르게)
              </button>
            </div>
          </div>
        </div>

        {/* User Recording Area */}
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 mb-5 text-center">
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
            따라 말하기 &amp; 단어 대조
          </div>

          <div className="min-h-[50px] flex items-center justify-center mb-4">
            {recordedSpokenText ? (
              <span className="text-gray-800 text-base font-semibold italic">
                &ldquo;{recordedSpokenText}&rdquo;
              </span>
            ) : (
              <span className="text-gray-400 text-sm">
                {isListening
                  ? `듣고 있습니다… ${langLabel}(으)로 문장을 따라 말씀하세요.`
                  : '아래 버튼을 누르고 따라 말해보세요.'}
              </span>
            )}
          </div>

          {/* Record Button */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-200 animate-pulse'
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

          {/* Recognition match — deliberately NOT called a pronunciation score. */}
          {result && (
            <div className="mt-5 p-4 rounded-xl bg-white border border-gray-200 shadow-xs text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className={`w-5 h-5 ${result.score >= 80 ? 'text-amber-500' : 'text-gray-400'}`} />
                  <span
                    className="text-xs font-bold text-gray-700 border-b border-dotted border-gray-400 cursor-help"
                    title="음성 인식이 목표 문장과 같은 단어를 같은 순서로 알아들었는지를 나타냅니다. 억양·강세 같은 발음의 질을 평가하는 점수가 아닙니다."
                  >
                    인식 일치율
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-extrabold font-mono ${
                    result.score >= 80 ? 'text-emerald-600' : result.score >= 50 ? 'text-amber-500' : 'text-rose-600'
                  }`}>
                    {result.score}%
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {result.matched}/{result.targetCount} 단어 일치
                  </span>
                </div>
              </div>

              {/* Word-level comparison: what actually differed. */}
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">목표 문장</p>
                  <p className="text-sm leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
                    {result.target.map((tok, idx) => (
                      <span
                        key={`t-${idx}`}
                        className={tok.status === 'match'
                          ? 'text-gray-800'
                          : 'text-rose-600 font-semibold underline decoration-rose-300 decoration-2 underline-offset-2'}
                        title={tok.status === 'match' ? undefined : '이 단어가 인식되지 않았습니다'}
                      >
                        {tok.text}
                      </span>
                    ))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">인식된 발화</p>
                  <p className="text-sm leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
                    {result.spoken.map((tok, idx) => (
                      <span
                        key={`s-${idx}`}
                        className={tok.status === 'match'
                          ? 'text-gray-800'
                          : 'text-amber-600 font-semibold'}
                        title={tok.status === 'match' ? undefined : '목표 문장에 없는 단어입니다'}
                      >
                        {tok.text}
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-gray-500">
                {result.score >= 80
                  ? '🎉 목표 문장대로 또렷하게 전달됐습니다.'
                  : '💪 빨간 단어를 또박또박 살려서 다시 말해 보세요.'}
              </p>
            </div>
          )}
        </div>

        {/* Learning Hint */}
        {item.learningDetails?.shadowingTip && (
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-pink-600 shrink-0" />
            <span><strong>발음 팁:</strong> {item.learningDetails.shadowingTip}</span>
          </div>
        )}

      </div>
    </div>
  );
};
