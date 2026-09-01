import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API interface definitions
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }
}

interface UseSpeechRecognitionProps {
  lang: string;
  onFinalTranscript?: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
}

export function useSpeechRecognition({
  lang,
  onFinalTranscript,
  onInterimTranscript,
}: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioFrequencies, setAudioFrequencies] = useState<number[]>(new Array(24).fill(0));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ★ FIX: Use refs for callbacks to avoid stale closures
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;
  onInterimTranscriptRef.current = onInterimTranscript;

  const langRef = useRef(lang);
  langRef.current = lang;

  // Initialize Web Speech API (runs once)
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setErrorMessage('현재 브라우저가 Web Speech API를 지원하지 않습니다. Chrome 또는 Edge 브라우저를 권장합니다.');
      return;
    }

    const createRecognition = () => {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langRef.current;

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setErrorMessage(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            currentFinal += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
          // ★ FIX: Use ref to always call latest callback
          onInterimTranscriptRef.current?.(currentInterim);
        }

        if (currentFinal) {
          setInterimTranscript('');
          // ★ FIX: Use ref to always call latest callback
          onFinalTranscriptRef.current?.(currentFinal.trim());
        }
      };

      recognition.onerror = (event) => {
        const errorType = event.error;
        console.warn('Speech recognition error:', errorType);

        // ★ FIX: Auto-restart on recoverable errors instead of stopping
        if (errorType === 'no-speech' || errorType === 'audio-capture' || errorType === 'network') {
          // These are recoverable — just let onend handle restart
          return;
        }

        if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
          setErrorMessage('마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.');
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // ★ FIX: Robust auto-restart with delay to prevent rapid fire
        if (isListeningRef.current) {
          // Clear any existing restart timeout
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            if (!isListeningRef.current) return;
            
            try {
              // Create a fresh recognition instance to avoid state issues
              const freshRecognition = createRecognition();
              freshRecognition.lang = langRef.current;
              recognitionRef.current = freshRecognition;
              freshRecognition.start();
            } catch (err) {
              console.warn('Recognition restart failed, retrying in 500ms:', err);
              // Retry once more after a longer delay
              restartTimeoutRef.current = setTimeout(() => {
                if (!isListeningRef.current) return;
                try {
                  const retryRecognition = createRecognition();
                  retryRecognition.lang = langRef.current;
                  recognitionRef.current = retryRecognition;
                  retryRecognition.start();
                } catch (retryErr) {
                  console.error('Recognition restart failed permanently:', retryErr);
                  isListeningRef.current = false;
                  setIsListening(false);
                  setErrorMessage('음성 인식이 중단되었습니다. 다시 시작해 주세요.');
                }
              }, 500);
            }
          }, 150); // 150ms delay prevents rapid restart loops
        } else {
          setIsListening(false);
        }
      };

      return recognition;
    };

    recognitionRef.current = createRecognition();

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // prevent restart on cleanup
        recognitionRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ★ FIX: Empty deps — callbacks are accessed via refs

  // Handle dynamic language change while listening
  useEffect(() => {
    langRef.current = lang;
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop(); // onend will auto-restart with the updated langRef.current!
      } catch {
        // Safe catch
      }
    }
  }, [lang]);

  // Audio Context Visualizer
  const startAudioVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const bins: number[] = [];
        const binCount = 24;
        const step = Math.floor(dataArray.length / binCount) || 1;

        for (let i = 0; i < binCount; i++) {
          const val = dataArray[i * step] || 0;
          bins.push(Math.round((val / 255) * 100));
          sum += val;
        }

        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        setAudioFrequencies(bins);

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn('Microphone visualizer init warning:', err);
    }
  }, []);

  const stopAudioVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
    setAudioFrequencies(new Array(24).fill(0));
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.lang = langRef.current;
      isListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      await startAudioVisualizer();
    } catch (err) {
      console.warn('Recognition start caught:', err);
    }
  }, [startAudioVisualizer]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      try {
        recognitionRef.current.stop();
      } catch {
        // Safe catch
      }
    }
    setIsListening(false);
    stopAudioVisualizer();
  }, [stopAudioVisualizer]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    interimTranscript,
    isSupported,
    audioLevel,
    audioFrequencies,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
  };
}
