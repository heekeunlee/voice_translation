import React from 'react';
import { 
  Globe2, 
  Settings, 
  BookOpen, 
  BookMarked, 
  QrCode, 
  ArrowRightLeft,
  Download
} from 'lucide-react';
import type { LanguageOption } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

interface HeaderProps {
  sourceLang: string;
  targetLang: string;
  onSourceLangChange: (code: string) => void;
  onTargetLangChange: (code: string) => void;
  onSwapLanguages: () => void;
  onOpenSettings: () => void;
  onOpenGlossary: () => void;
  onOpenFlashcards: () => void;
  onOpenAudienceRoom: () => void;
  onOpenExport: () => void;
  savedCardsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  sourceLang,
  targetLang,
  onSourceLangChange,
  onTargetLangChange,
  onSwapLanguages,
  onOpenSettings,
  onOpenGlossary,
  onOpenFlashcards,
  onOpenAudienceRoom,
  onOpenExport,
  savedCardsCount,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-gray-900 flex items-center gap-1.5">
                FluentLive <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-semibold border border-indigo-200">AI</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">실시간 AI 통번역 & 영어 학습</p>
          </div>
        </div>

        {/* Center: Language Switcher */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
          <select
            value={sourceLang}
            onChange={(e) => onSourceLangChange(e.target.value)}
            className="bg-white text-gray-700 text-xs sm:text-sm font-medium rounded-xl px-3 py-1.5 outline-none border border-gray-200 hover:border-gray-300 transition cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((l: LanguageOption) => (
              <option key={l.code} value={l.speechCode}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>

          <button
            onClick={onSwapLanguages}
            title="언어 전환"
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-indigo-500 transition"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <select
            value={targetLang}
            onChange={(e) => onTargetLangChange(e.target.value)}
            className="bg-white text-gray-700 text-xs sm:text-sm font-medium rounded-xl px-3 py-1.5 outline-none border border-gray-200 hover:border-gray-300 transition cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((l: LanguageOption) => (
              <option key={l.code} value={l.speechCode}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={onOpenAudienceRoom} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium transition" title="청중 실시간 자막 화면 (QR 공유)">
            <QrCode className="w-4 h-4 text-emerald-500" />
            <span>청중 공유</span>
          </button>
          <button onClick={onOpenGlossary} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium transition" title="전문 용어집 및 번역 메모리(TM)">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="hidden sm:inline">용어집</span>
          </button>
          <button onClick={onOpenFlashcards} className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium transition" title="영어 단어장 & 섀도잉 학습">
            <BookMarked className="w-4 h-4 text-pink-500" />
            <span className="hidden sm:inline">학습 단어장</span>
            {savedCardsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-pink-500 text-[10px] text-white font-bold animate-pulse">
                {savedCardsCount}
              </span>
            )}
          </button>
          <button onClick={onOpenExport} className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600 border border-gray-200 transition" title="대화 및 번역본 내보내기">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onOpenSettings} className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-400 hover:text-indigo-500 border border-gray-200 transition" title="엔진 및 API 설정">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
