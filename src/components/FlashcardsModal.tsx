import React, { useState } from 'react';
import { 
  X, 
  BookMarked, 
  Volume2, 
  Trash2, 
  Check, 
  GraduationCap, 
  Download, 
  Search 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ttsService } from '../services/tts';

export interface SavedFlashcard {
  id: string;
  word: string;
  meaning: string;
  ipa?: string;
  pos?: string;
  exampleSentence?: string;
  savedAt: number;
  reviewedCount?: number;
}

interface FlashcardsModalProps {
  isOpen: boolean;
  cards: SavedFlashcard[];
  onClose: () => void;
  onDeleteCard: (id: string) => void;
  onClearAll: () => void;
}

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  cards,
  onClose,
  onDeleteCard,
  onClearAll,
}) => {
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredCards = cards.filter(c => 
    c.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.meaning.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSpeak = (text: string) => {
    ttsService.speak(text, { lang: 'en-US', rate: 0.9 });
  };

  const handleNextQuizCard = (known: boolean) => {
    if (known && currentIndex === cards.length - 1) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsQuizMode(false);
      setCurrentIndex(0);
    }
  };

  const handleExportCSV = () => {
    if (cards.length === 0) return;
    const header = 'Word,Meaning,IPA,Part of Speech,Example,Saved Date\n';
    const rows = cards.map(c => 
      `"${c.word}","${c.meaning}","${c.ipa || ''}","${c.pos || ''}","${(c.exampleSentence || '').replace(/"/g, '""')}","${new Date(c.savedAt).toLocaleDateString()}"`
    ).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PolyVoice_Vocabulary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const currentQuizCard = cards[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-200">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                나의 영어 학습 단어장 ({cards.length}개)
              </h2>
              <p className="text-xs text-gray-500">실시간 통번역 중 저장한 핵심 어휘와 표현을 복습하세요.</p>
            </div>
          </div>

          {cards.length > 0 && (
            <div className="flex items-center gap-2 mr-10">
              <button
                onClick={() => { setIsQuizMode(!isQuizMode); setIsFlipped(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isQuizMode ? 'bg-pink-600 text-white' : 'bg-gray-100 text-pink-600 hover:bg-gray-200'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>{isQuizMode ? '단어 목록 보기' : '플래시카드 퀴즈'}</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs transition"
                title="CSV 단어장 다운로드"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        {cards.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <BookMarked className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">저장된 단어가 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">번역 결과 하단의 핵심 어휘 칩이나 북마크 아이콘을 클릭하여 단어장에 추가해 보세요.</p>
          </div>
        ) : isQuizMode && currentQuizCard ? (
          /* Interactive Quiz Card Mode */
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="text-xs font-semibold text-gray-500 mb-3">
              카드 {currentIndex + 1} / {cards.length}
            </div>

            {/* Flip Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full max-w-md h-64 rounded-3xl bg-gradient-to-br from-indigo-50/90 to-purple-50 border-2 border-indigo-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              {!isFlipped ? (
                <>
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-2">
                    단어 / 표현 (클릭하여 뜻 확인)
                  </span>
                  <h3 className="text-3xl font-extrabold text-gray-900 mb-2">{currentQuizCard.word}</h3>
                  {currentQuizCard.ipa && <p className="text-xs font-mono text-gray-500 mb-4">{currentQuizCard.ipa}</p>}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSpeak(currentQuizCard.word); }}
                    className="p-2 rounded-full bg-indigo-100 hover:bg-indigo-600 text-indigo-600 hover:text-white transition"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold text-pink-600 uppercase tracking-widest mb-2">
                    한국어 뜻 & 예문
                  </span>
                  <h3 className="text-2xl font-bold text-emerald-700 mb-3">{currentQuizCard.meaning}</h3>
                  {currentQuizCard.exampleSentence && (
                    <p className="text-xs text-gray-700 italic px-4 bg-white/80 py-2 rounded-xl border border-gray-200">
                      &ldquo;{currentQuizCard.exampleSentence}&rdquo;
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Answer Buttons */}
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => handleNextQuizCard(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
              >
                다시 보기
              </button>
              <button
                onClick={() => handleNextQuizCard(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30"
              >
                <Check className="w-4 h-4" />
                <span>알고 있어요!</span>
              </button>
            </div>
          </div>
        ) : (
          /* List Mode */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="단어 또는 뜻 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition group"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleSpeak(card.word)}
                      className="p-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 border border-gray-200 transition shrink-0 mt-0.5"
                      title="발음 듣기"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900">{card.word}</span>
                        {card.pos && <span className="text-[10px] text-gray-400 font-mono">[{card.pos}]</span>}
                        {card.ipa && <span className="text-[11px] text-gray-500 font-mono">{card.ipa}</span>}
                      </div>
                      <div className="text-xs text-emerald-700 font-medium mt-0.5">{card.meaning}</div>
                      {card.exampleSentence && (
                        <div className="text-[11px] text-gray-500 italic mt-1 line-clamp-1">
                          예문: {card.exampleSentence}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteCard(card.id)}
                    className="p-2 rounded-xl hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition"
                    title="단어 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>총 {filteredCards.length}개 단어</span>
              <button
                onClick={onClearAll}
                className="text-rose-600/80 hover:text-rose-600 transition"
              >
                단어장 전체 비우기
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
