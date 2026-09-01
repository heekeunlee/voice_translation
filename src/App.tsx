import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { LivePresenter } from './components/LivePresenter';
import { LiveTimeline } from './components/LiveTimeline';
import { GlossaryModal } from './components/GlossaryModal';
import { FlashcardsModal } from './components/FlashcardsModal';
import type { SavedFlashcard } from './components/FlashcardsModal';
import { ShadowingModal } from './components/ShadowingModal';
import { AudienceRoomModal } from './components/AudienceRoomModal';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';

import type { 
  AppSettings, 
  GlossaryItem, 
  KeyVocabulary, 
  TranslationItem, 
  TranslationMode 
} from './types';
import { 
  DEFAULT_GLOSSARY_ITEMS, 
  DEFAULT_SETTINGS 
} from './constants';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { translationService } from './services/translator';
import { ttsService } from './services/tts';

export function App() {
  // 1. Settings & Persistence State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('polyvoice_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [glossary, setGlossary] = useState<GlossaryItem[]>(() => {
    const saved = localStorage.getItem('polyvoice_glossary');
    return saved ? JSON.parse(saved) : DEFAULT_GLOSSARY_ITEMS;
  });

  const [savedCards, setSavedCards] = useState<SavedFlashcard[]>(() => {
    const saved = localStorage.getItem('polyvoice_flashcards');
    return saved ? JSON.parse(saved) : [];
  });

  const [items, setItems] = useState<TranslationItem[]>(() => {
    const saved = localStorage.getItem('polyvoice_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Languages & Translation Mode
  const [sourceLang, setSourceLang] = useState('ko-KR');
  const [targetLang, setTargetLang] = useState('en-US');
  const [currentMode, setCurrentMode] = useState<TranslationMode>('daily');

  // Real-time Streaming State
  const [currentInterimSource, setCurrentInterimSource] = useState('');
  const [currentStreamingTranslation, setCurrentStreamingTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);
  const [isAudienceRoomOpen, setIsAudienceRoomOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeShadowingItem, setActiveShadowingItem] = useState<TranslationItem | null>(null);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('polyvoice_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('polyvoice_glossary', JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    localStorage.setItem('polyvoice_flashcards', JSON.stringify(savedCards));
  }, [savedCards]);

  useEffect(() => {
    localStorage.setItem('polyvoice_history', JSON.stringify(items));
  }, [items]);

  // Execute Translation Pipeline
  const handleTranslateText = useCallback(async (text: string) => {
    if (!text || text.trim() === '') return;

    setIsTranslating(true);
    setCurrentStreamingTranslation('');

    try {
      const result = await translationService.translate({
        text,
        sourceLang,
        targetLang,
        mode: currentMode,
        glossary,
        settings,
        onChunk: (_chunk, accumulated) => {
          setCurrentStreamingTranslation(accumulated);
        },
      });

      const newItem: TranslationItem = {
        id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        sourceText: text,
        cleanedSourceText: result.cleanedSourceText,
        translatedText: result.translatedText,
        mode: currentMode,
        sourceLang,
        targetLang,
        learningDetails: result.learningDetails,
        latencyMs: result.latencyMs,
        isBookmarked: false,
      };

      setItems(prev => [newItem, ...prev]);
      setCurrentInterimSource('');
      setCurrentStreamingTranslation(result.translatedText);

      // Auto-TTS if enabled
      if (settings.autoTts && result.translatedText) {
        ttsService.speak(result.translatedText, {
          lang: targetLang,
          rate: settings.ttsSpeed || 1.0,
        });
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceLang, targetLang, currentMode, glossary, settings]);

  // Web Speech STT Hook
  const {
    isListening,
    audioLevel,
    audioFrequencies,
    toggleListening,
  } = useSpeechRecognition({
    lang: sourceLang,
    onInterimTranscript: (interim) => {
      setCurrentInterimSource(interim);
    },
    onFinalTranscript: (finalText) => {
      handleTranslateText(finalText);
    },
  });

  // Language Swap
  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  // Sample testing
  const handleTestSample = (sampleText: string) => {
    setCurrentInterimSource(sampleText);
    handleTranslateText(sampleText);
  };

  // Bookmark / Flashcard Handlers
  const handleBookmarkItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.isBookmarked;
        if (nextState) {
          // Add to flashcards
          const newCard: SavedFlashcard = {
            id: `card_${Date.now()}`,
            word: item.translatedText,
            meaning: item.sourceText,
            savedAt: Date.now(),
            exampleSentence: item.translatedText,
          };
          setSavedCards(c => [newCard, ...c]);
        }
        return { ...item, isBookmarked: nextState };
      }
      return item;
    }));
  };

  const handleSaveVocabulary = (vocab: KeyVocabulary, contextSentence: string) => {
    const exists = savedCards.some(c => c.word.toLowerCase() === vocab.word.toLowerCase());
    if (exists) return;

    const newCard: SavedFlashcard = {
      id: `card_${Date.now()}`,
      word: vocab.word,
      meaning: vocab.meaning,
      ipa: vocab.ipa,
      pos: vocab.pos,
      exampleSentence: contextSentence,
      savedAt: Date.now(),
    };
    setSavedCards(prev => [newCard, ...prev]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAllItems = () => {
    if (window.confirm('모든 번역 기록을 삭제하시겠습니까?')) {
      setItems([]);
      setCurrentInterimSource('');
      setCurrentStreamingTranslation('');
    }
  };

  // Glossary Handlers
  const handleAddGlossary = (item: Omit<GlossaryItem, 'id'>) => {
    const newItem: GlossaryItem = {
      id: `gloss_${Date.now()}`,
      ...item,
    };
    setGlossary(prev => [newItem, ...prev]);
  };

  const handleDeleteGlossary = (id: string) => {
    setGlossary(prev => prev.filter(g => g.id !== id));
  };

  const handleResetDefaultGlossary = () => {
    setGlossary(DEFAULT_GLOSSARY_ITEMS);
  };

  // Flashcards Handlers
  const handleDeleteCard = (id: string) => {
    setSavedCards(prev => prev.filter(c => c.id !== id));
  };

  const handleClearAllCards = () => {
    if (window.confirm('단어장의 모든 단어를 비우시겠습니까?')) {
      setSavedCards([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        sourceLang={sourceLang}
        targetLang={targetLang}
        onSourceLangChange={setSourceLang}
        onTargetLangChange={setTargetLang}
        onSwapLanguages={handleSwapLanguages}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onOpenFlashcards={() => setIsFlashcardsOpen(true)}
        onOpenAudienceRoom={() => setIsAudienceRoomOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        savedCardsCount={savedCards.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col">
        {/* Mode Selector */}
        <ModeSelector
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
        />

        {/* Live Subtitle Presenter Screen */}
        <LivePresenter
          isListening={isListening}
          onToggleListening={toggleListening}
          audioLevel={audioLevel}
          audioFrequencies={audioFrequencies}
          currentInterimSource={currentInterimSource}
          currentStreamingTranslation={currentStreamingTranslation}
          isTranslating={isTranslating}
          latestItem={items[0] || null}
          currentMode={currentMode}
          onTestSample={handleTestSample}
          onBookmarkItem={handleBookmarkItem}
          onOpenShadowing={(item) => setActiveShadowingItem(item)}
        />

        {/* History Timeline with English Learning Drawers */}
        <LiveTimeline
          items={items}
          onBookmarkItem={handleBookmarkItem}
          onDeleteItem={handleDeleteItem}
          onClearAll={handleClearAllItems}
          onOpenShadowing={(item) => setActiveShadowingItem(item)}
          onSaveVocabulary={handleSaveVocabulary}
        />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 bg-white/80 py-6 text-center text-xs text-gray-500">
        <p className="flex items-center justify-center gap-2">
          <span className="font-semibold text-gray-700">PolyVoice Live AI</span>
          <span>•</span>
          <span>AI Real-Time Voice Translation & English Learning</span>
          <span>•</span>
          <span>Powered by Gemini 2.0 Flash</span>
        </p>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={setSettings}
      />

      <GlossaryModal
        isOpen={isGlossaryOpen}
        glossary={glossary}
        onClose={() => setIsGlossaryOpen(false)}
        onAddGlossary={handleAddGlossary}
        onDeleteGlossary={handleDeleteGlossary}
        onResetDefault={handleResetDefaultGlossary}
      />

      <FlashcardsModal
        isOpen={isFlashcardsOpen}
        cards={savedCards}
        onClose={() => setIsFlashcardsOpen(false)}
        onDeleteCard={handleDeleteCard}
        onClearAll={handleClearAllCards}
      />

      <ShadowingModal
        isOpen={!!activeShadowingItem}
        item={activeShadowingItem}
        onClose={() => setActiveShadowingItem(null)}
      />

      <AudienceRoomModal
        isOpen={isAudienceRoomOpen}
        onClose={() => setIsAudienceRoomOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        items={items}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}

export default App;
