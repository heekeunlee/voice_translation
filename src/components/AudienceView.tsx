import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe2, Radio, WifiOff, Type } from 'lucide-react';
import { RoomChannel, isBroadcastSupported } from '../services/broadcast';
import type { BroadcastMessage, SubtitlePayload } from '../services/broadcast';
import { isAbortError, translationService } from '../services/translator';
import { SUPPORTED_LANGUAGES, DEFAULT_SETTINGS } from '../constants';
import type { AppSettings } from '../types';

interface AudienceViewProps {
  roomId: string;
  /** Language requested by the share link; the viewer can change it. */
  initialLang: string | null;
}

const FONT_STEPS = [
  { label: 'A', className: 'text-3xl sm:text-4xl' },
  { label: 'A', className: 'text-4xl sm:text-6xl' },
  { label: 'A', className: 'text-5xl sm:text-7xl' },
];

/** Presenter idle for longer than this and we stop claiming the feed is live. */
const STALE_AFTER_MS = 20_000;

export function AudienceView({ roomId, initialLang }: AudienceViewProps) {
  const [lang, setLang] = useState(initialLang || 'en-US');
  const [subtitle, setSubtitle] = useState<SubtitlePayload | null>(null);
  // Tagged with the language it was produced in, so a stale translation is
  // simply not rendered after a language switch — no clearing state required.
  const [localTranslation, setLocalTranslation] = useState<{ lang: string; text: string }>({
    lang: '',
    text: '',
  });
  const [isLive, setIsLive] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
  const [fontStep, setFontStep] = useState(1);

  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  /** `${lang}::${sourceText}` of the last locally translated line. */
  const lastTranslatedKeyRef = useRef('');
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  // The audience tab shares localStorage with the presenter tab (same origin),
  // so it picks up the same engine + API key without any extra setup.
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fluentlive_settings');
      if (saved) {
        settingsRef.current = { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<AppSettings>) };
      }
    } catch {
      settingsRef.current = DEFAULT_SETTINGS;
    }
  }, []);

  /**
   * The presenter broadcasts its own target language. When the viewer asked for
   * a different one, translate the ORIGINAL speech here instead of translating
   * a translation, which would compound errors.
   */
  const translateLocally = useCallback(async (payload: SubtitlePayload) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;
    const requestedLang = langRef.current;
    const isCurrent = () => seq === seqRef.current && !controller.signal.aborted;

    try {
      const result = await translationService.translate({
        text: payload.sourceText,
        sourceLang: payload.sourceLang,
        targetLang: requestedLang,
        mode: payload.mode === 'tutor' ? 'daily' : payload.mode,
        glossary: [],
        settings: settingsRef.current,
        signal: controller.signal,
        onChunk: (_chunk, accumulated) => {
          if (isCurrent()) setLocalTranslation({ lang: requestedLang, text: accumulated });
        },
      });
      if (isCurrent() && result.translatedText) {
        setLocalTranslation({ lang: requestedLang, text: result.translatedText });
      }
    } catch (err) {
      if (!isAbortError(err)) console.warn('Audience translation failed:', err);
    }
  }, []);

  const handleMessage = useCallback((message: BroadcastMessage) => {
    if (message.kind === 'presence') {
      setIsLive(message.state === 'live');
      setLastSeenAt(message.sentAt);
      return;
    }

    setSubtitle(message);
    setIsLive(true);
    setLastSeenAt(message.sentAt);

    if (message.targetLang === langRef.current) {
      // Presenter already produced exactly what this viewer asked for.
      abortRef.current?.abort();
      seqRef.current++;
    }
    // Local translation is triggered by the effect below, which is the single
    // place that decides it — doing it here as well fired one call per streamed
    // chunk (13 calls for one sentence).
  }, []);

  useEffect(() => {
    const channel = new RoomChannel(roomId, handleMessage);
    return () => channel.close();
  }, [roomId, handleMessage]);

  /**
   * Translate locally when — and only when — the viewer wants a language the
   * presenter is not producing. Provisional lines are skipped because they are
   * about to be revised, and identical (language, sentence) pairs are skipped
   * because the presenter re-broadcasts the same line as it streams.
   */
  useEffect(() => {
    if (!subtitle || subtitle.isProvisional) return;
    if (subtitle.targetLang === lang) return;

    const key = `${lang}::${subtitle.sourceText}`;
    if (lastTranslatedKeyRef.current === key) return;
    lastTranslatedKeyRef.current = key;

    void translateLocally(subtitle);
  }, [lang, subtitle, translateLocally]);

  // Drop the "live" badge if the presenter goes quiet.
  useEffect(() => {
    if (!lastSeenAt) return;
    const timer = setInterval(() => {
      if (Date.now() - lastSeenAt > STALE_AFTER_MS) setIsLive(false);
    }, 5000);
    return () => clearInterval(timer);
  }, [lastSeenAt]);

  const usingPresenterTranslation = subtitle?.targetLang === lang;
  const displayText = usingPresenterTranslation
    ? subtitle?.translatedText ?? ''
    : localTranslation.lang === lang
      ? localTranslation.text
      : '';
  const isProvisional = usingPresenterTranslation && Boolean(subtitle?.isProvisional);
  const fontClass = FONT_STEPS[fontStep].className;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Status bar */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30 shrink-0">
            <Globe2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">청중 자막 화면</p>
            <p className="text-[11px] text-white/40 font-mono truncate">Room {roomId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isLive
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30'
                : 'bg-white/5 text-white/40 border-white/10'
            }`}
          >
            {isLive ? <Radio className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? '수신 중' : '대기 중'}
          </span>

          <button
            onClick={() => setFontStep((fontStep + 1) % FONT_STEPS.length)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold transition"
            title="자막 크기 변경"
          >
            <Type className="w-3 h-3" />
            {fontStep + 1}
          </button>
        </div>
      </header>

      {/* Subtitle stage */}
      <main className="flex-1 flex flex-col justify-center px-5 sm:px-12 py-10">
        {displayText ? (
          <>
            <p
              className={`${fontClass} font-bold leading-tight tracking-tight break-words transition-colors ${
                isProvisional ? 'text-white/45' : 'text-white'
              }`}
            >
              {displayText}
            </p>
            {isProvisional && (
              <p className="mt-4 text-[11px] font-semibold text-amber-300/80">
                ● 잠정 번역 — 발화가 끝나면 확정됩니다
              </p>
            )}
            {subtitle?.sourceText && (
              <p className="mt-6 text-sm sm:text-base text-white/35 break-words border-t border-white/10 pt-4">
                {subtitle.sourceText}
              </p>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="text-white/50 text-lg font-medium">
              {isLive ? '발표자의 다음 발화를 기다리는 중입니다…' : '발표자가 음성 번역을 시작하면 자막이 표시됩니다.'}
            </p>
            {!isBroadcastSupported() && (
              <p className="mt-3 text-xs text-amber-300/70">
                이 브라우저는 BroadcastChannel을 지원하지 않아 호환 모드로 수신합니다.
              </p>
            )}
          </div>
        )}
      </main>

      {/* Language picker */}
      <footer className="px-4 sm:px-8 py-4 border-t border-white/10">
        <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">수신 언어</p>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.map(option => (
            <button
              key={option.code}
              onClick={() => setLang(option.speechCode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                lang === option.speechCode
                  ? 'bg-indigo-500 text-white border-indigo-400'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
              }`}
            >
              <span>{option.flag}</span>
              <span>{option.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
