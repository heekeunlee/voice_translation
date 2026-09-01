import React, { useState } from 'react';
import { 
  Volume2, 
  Copy, 
  Check, 
  BookMarked, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  GraduationCap, 
  Sparkles, 
  Layers, 
  Clock, 
  BookOpen 
} from 'lucide-react';
import type { KeyVocabulary, TranslationItem } from '../types';
import { TRANSLATION_MODES } from '../constants';
import { ttsService } from '../services/tts';

interface LiveTimelineProps {
  items: TranslationItem[];
  onBookmarkItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onOpenShadowing: (item: TranslationItem) => void;
  onSaveVocabulary: (vocab: KeyVocabulary, contextSentence: string) => void;
}

export const LiveTimeline: React.FC<LiveTimelineProps> = ({
  items,
  onBookmarkItem,
  onDeleteItem,
  onClearAll,
  onOpenShadowing,
  onSaveVocabulary,
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, rate = 1.0) => {
    ttsService.speak(text, { rate });
  };

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 text-gray-500 shadow-sm">
          <Layers className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">아직 번역 기록이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">상단 마이크 버튼을 눌러 음성 번역을 시작하거나 샘플 발화를 클릭해 보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600" />
            실시간 번역 & 학습 히스토리 ({items.length}개)
          </h3>
        </div>

        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-rose-600 transition flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-gray-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>전체 기록 삭제</span>
        </button>
      </div>

      {/* Item List */}
      <div className="space-y-3.5">
        {items.map((item) => {
          const modeConfig = TRANSLATION_MODES.find(m => m.id === item.mode) || TRANSLATION_MODES[0];
          const isExpanded = expandedIds[item.id] ?? (item.mode === 'tutor' || !!item.learningDetails);

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 hover:border-gray-300 transition-all duration-200 shadow-sm group"
            >
              {/* Top Row: Mode & Controls */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${modeConfig.badgeColor}`}>
                    <span>{modeConfig.icon}</span>
                    <span>{modeConfig.name}</span>
                  </span>

                  <span className="text-[11px] text-gray-400 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>

                  {item.latencyMs && (
                    <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {item.latencyMs}ms
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Copy */}
                  <button
                    onClick={() => handleCopy(item.id, item.translatedText)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                    title="번역 복사"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Bookmark */}
                  <button
                    onClick={() => onBookmarkItem(item.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-pink-600 transition"
                    title="단어장에 북마크"
                  >
                    <BookMarked className={`w-3.5 h-3.5 ${item.isBookmarked ? 'text-pink-600 fill-pink-600' : ''}`} />
                  </button>

                  {/* Shadowing Practice */}
                  <button
                    onClick={() => onOpenShadowing(item)}
                    className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-400 hover:text-pink-600 transition"
                    title="섀도잉 연습"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Spoken Text (Source) */}
              <div className="text-gray-600 text-sm font-medium mb-2 pl-3 border-l-2 border-gray-300">
                <span>{item.sourceText}</span>
              </div>

              {/* Translated Text (Target) */}
              <div className="text-gray-900 text-base sm:text-lg font-bold leading-snug tracking-tight pl-3 border-l-2 border-indigo-500 mb-3 flex items-start justify-between gap-4">
                <span>{item.translatedText}</span>
                
                {/* TTS Speed buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleSpeak(item.translatedText, 1.0)}
                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition border border-indigo-200"
                    title="원어민 발음 듣기 (1.0x)"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  </button>
                  <button
                    onClick={() => handleSpeak(item.translatedText, 0.75)}
                    className="px-1.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-mono transition"
                    title="0.75x 천천히"
                  >
                    0.75x
                  </button>
                </div>
              </div>

              {/* Learning Breakdown Toggle */}
              {item.learningDetails && (
                <div className="mt-3 pt-2.5 border-t border-gray-100">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>영어 학습 튜터 분석 & 핵심 어휘</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Expanded Learning Box */}
                  {isExpanded && (
                    <div className="mt-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                      
                      {/* Key Vocabulary chips */}
                      {item.learningDetails.keyVocabulary && item.learningDetails.keyVocabulary.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-gray-600 uppercase mb-1.5 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-pink-600" />
                            핵심 어휘 / 숙어 (클릭하여 단어장에 추가):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.learningDetails.keyVocabulary.map((v, idx) => (
                              <button
                                key={idx}
                                onClick={() => onSaveVocabulary(v, item.translatedText)}
                                className="group/chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-pink-50 border border-gray-200 hover:border-pink-300 text-xs text-gray-700 hover:text-pink-700 transition shadow-xs"
                                title="단어장에 저장하기"
                              >
                                <span className="font-bold text-indigo-600 group-hover/chip:text-pink-600">{v.word}</span>
                                <span className="text-[11px] text-gray-600">{v.meaning}</span>
                                {v.ipa && <span className="text-[10px] text-gray-400 font-mono">{v.ipa}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Natural Alternative */}
                      {item.learningDetails.naturalAlternative && (
                        <div className="text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-gray-200">
                          <span className="font-bold text-emerald-700">💡 원어민 추천 대체 표현: </span>
                          <span className="text-gray-800">{item.learningDetails.naturalAlternative}</span>
                        </div>
                      )}

                      {/* Grammar & Shadowing Tips */}
                      {item.learningDetails.grammarTip && (
                        <div className="text-xs text-gray-600">
                          <span className="font-bold text-indigo-600">📌 문법/뉘앙스 팁: </span>
                          <span>{item.learningDetails.grammarTip}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
