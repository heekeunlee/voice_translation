import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  Zap, 
  Check, 
  Copy, 
  Maximize2, 
  Minimize2, 
  BookMarked,
  GraduationCap,
  Flame
} from 'lucide-react';
import { LiveWaveVisualizer } from './LiveWaveVisualizer';
import type { TranslationItem, TranslationMode } from '../types';
import { TRANSLATION_MODES } from '../constants';
import { ttsService } from '../services/tts';

interface LivePresenterProps {
  isListening: boolean;
  onToggleListening: () => void;
  audioLevel: number;
  audioFrequencies: number[];
  currentInterimSource: string;
  currentStreamingTranslation: string;
  isTranslating: boolean;
  latestItem: TranslationItem | null;
  currentMode: TranslationMode;
  onTestSample: (sampleText: string) => void;
  onBookmarkItem: (id: string) => void;
  onOpenShadowing: (item: TranslationItem) => void;
}

export const LivePresenter: React.FC<LivePresenterProps> = ({
  isListening,
  onToggleListening,
  audioLevel,
  audioFrequencies,
  currentInterimSource,
  currentStreamingTranslation,
  isTranslating,
  latestItem,
  currentMode,
  onTestSample,
  onBookmarkItem,
  onOpenShadowing,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const activeModeConfig = TRANSLATION_MODES.find(m => m.id === currentMode) || TRANSLATION_MODES[0];
  const displaySource = currentInterimSource || latestItem?.sourceText || '';
  const displayTranslation = currentStreamingTranslation || latestItem?.translatedText || '';

  const handleCopy = () => {
    if (!displayTranslation) return;
    navigator.clipboard.writeText(displayTranslation);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSpeak = (speed = 1.0) => {
    if (!displayTranslation) return;
    ttsService.speak(displayTranslation, { rate: speed });
  };

  const samplePhrases = [
    { label: '일상 회화', text: '음... 오늘 날씨 진짜 좋다. 우리 이따가 커피 한잔 하러 갈래?' },
    { label: '비즈니스 미팅', text: '그... 다음 분기 신제품 출시 일정에 대해 간단히 논의하고 싶습니다.' },
    { label: '학술/논문', text: '본 연구에서는 딥러닝 기반의 음성인식 모델이 다국어 번역 정확도에 미치는 영향을 분석하였다.' },
    { label: '뉴스 보도', text: '기상청은 오늘 밤부터 전국에 강한 비바람이 몰아칠 것으로 예보했습니다.' },
    { label: '문학 구절', text: '새벽 안개 너머로 피어오르는 햇살이 고요한 숲속을 은은하게 비추었다.' }
  ];

  return (
    <div className={`w-full transition-all duration-300 ${
      isFullScreen 
        ? 'fixed inset-0 z-50 bg-white p-6 md:p-12 flex flex-col justify-between overflow-y-auto'
        : 'max-w-5xl mx-auto px-4 py-4'
    }`}>
      <div className="relative rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-lg overflow-hidden">
        
        {/* Glow background accent */}
        <div className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-all duration-500 ${
          isListening ? 'bg-indigo-200/60' : 'bg-purple-100/40'
        }`} />
        
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${activeModeConfig.badgeColor}`}>
              <span>{activeModeConfig.icon}</span>
              <span>{activeModeConfig.name} 실시간 모드</span>
            </span>

            {latestItem?.latencyMs && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] font-mono font-medium">
                <Zap className="w-3 h-3" />
                <span>{latestItem.latencyMs}ms</span>
              </span>
            )}

            {isTranslating && (
              <span className="inline-flex items-center gap-1.5 text-xs text-indigo-500 font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                실시간 번역 스트리밍 중...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <LiveWaveVisualizer isListening={isListening} audioLevel={audioLevel} audioFrequencies={audioFrequencies} />
            <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition border border-gray-200" title={isFullScreen ? '전체화면 종료' : '컨퍼런스 대화면 모드'}>
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dual Screen Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          
          {/* Left: Original Speech (STT) */}
          <div className="flex flex-col justify-between rounded-2xl bg-gray-50 border border-gray-200 p-5 min-h-[190px]">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  원문 음성 인식 (STT)
                </span>
                {latestItem?.cleanedSourceText && latestItem.cleanedSourceText !== latestItem.sourceText && (
                  <span className="text-[10px] text-amber-600 font-medium px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                    ✨ 군더더기 말버릇 정제됨
                  </span>
                )}
              </div>

              <div className="text-gray-800 text-lg sm:text-xl font-medium leading-relaxed break-words min-h-[60px]">
                {displaySource ? (
                  <span>
                    {displaySource}
                    {currentInterimSource && <span className="inline-block w-2 h-5 ml-1 bg-indigo-500 rounded-sm cursor-blink align-middle" />}
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal italic text-sm">
                    {isListening ? '마이크에 대고 자유롭게 말씀해 보세요...' : '아래 마이크 버튼을 눌러 실시간 음성 번역을 시작하세요.'}
                  </span>
                )}
              </div>
            </div>

            {!isListening && !displaySource && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-[11px] text-gray-400 font-medium mb-1.5 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" /> 빠른 테스트 샘플 발화:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {samplePhrases.map((s, idx) => (
                    <button key={idx} onClick={() => onTestSample(s.text)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 border border-gray-200 transition">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Real-time Translated Subtitle */}
          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50/30 to-white border border-indigo-200 p-5 min-h-[190px] relative overflow-hidden shadow-inner">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  실시간 번역 자막 (타이핑 스트리밍)
                </span>
                {displayTranslation && (
                  <div className="flex items-center gap-1">
                    <button onClick={handleCopy} className="p-1 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 transition" title="번역 복사">
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {latestItem && (
                      <button onClick={() => onBookmarkItem(latestItem.id)} className="p-1 rounded-lg hover:bg-white text-gray-400 hover:text-pink-500 transition" title="학습 단어장에 저장">
                        <BookMarked className={`w-3.5 h-3.5 ${latestItem.isBookmarked ? 'text-pink-500 fill-pink-500' : ''}`} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-gray-900 text-xl sm:text-2xl font-bold leading-relaxed tracking-tight break-words min-h-[60px]">
                {displayTranslation ? (
                  <span>
                    {displayTranslation}
                    {isTranslating && <span className="inline-block w-2.5 h-6 ml-1.5 bg-pink-500 rounded-sm cursor-blink align-middle shadow-lg shadow-pink-500/30" />}
                  </span>
                ) : (
                  <span className="text-gray-300 font-normal italic text-sm">
                    말씀하시면 AI가 초고속으로 번역하여 여기에 실시간 타이핑됩니다.
                  </span>
                )}
              </div>
            </div>

            {displayTranslation && (
              <div className="mt-4 pt-3 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-indigo-500 font-medium">원어민 발음:</span>
                  <button onClick={() => handleSpeak(1.0)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold transition">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> <span>1.0x</span>
                  </button>
                  <button onClick={() => handleSpeak(0.75)} className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition" title="천천히 듣기">0.75x</button>
                  <button onClick={() => handleSpeak(1.25)} className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition" title="빠르게 듣기">1.25x</button>
                </div>
                {latestItem && (
                  <button onClick={() => onOpenShadowing(latestItem)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 text-xs font-bold transition shadow-sm">
                    <GraduationCap className="w-3.5 h-3.5 text-pink-500" /> <span>섀도잉 말하기 연습</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Central Mic Button */}
        <div className="mt-6 flex flex-col items-center justify-center relative z-10">
          <div className="relative">
            {isListening && (
              <>
                <div className="absolute -inset-4 rounded-full bg-indigo-300/40 animate-ping" />
                <div className="absolute -inset-2 rounded-full bg-pink-200/40 animate-pulse" />
              </>
            )}
            <button
              onClick={onToggleListening}
              className={`relative z-10 flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-base sm:text-lg transition-all duration-300 shadow-xl ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 via-pink-600 to-rose-600 text-white shadow-rose-500/40 hover:scale-105 ring-4 ring-rose-200'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-indigo-500/30 hover:scale-105 hover:shadow-indigo-500/50'
              }`}
            >
              {isListening ? (<><MicOff className="w-6 h-6 animate-pulse" /><span>실시간 번역 중단하기</span></>) : (<><Mic className="w-6 h-6" /><span>실시간 음성 번역 시작</span></>)}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400 font-medium">
            {isListening ? '말씀하시면 실시간으로 정제되어 초고속 타이핑 번역됩니다.' : '마이크 버튼을 클릭하고 한국어 또는 영어로 말해보세요.'}
          </p>
        </div>
      </div>
    </div>
  );
};
