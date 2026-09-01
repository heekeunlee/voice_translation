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
  const [audioLevel, setAudioLevel] = useState(0); // 0 ~ 100
  const [audioFrequencies, setAudioFrequencies] = useState<number[]>(new Array(24).fill(0));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const langRef = useRef(lang);
  langRef.current = lang;

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setErrorMessage('현재 브라우저가 Web Speech API를 지원하지 않습니다. Chrome 또는 Edge 브라우저를 권장합니다.');
      return;
    }

    try {
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
          if (onInterimTranscript) onInterimTranscript(currentInterim);
        }

        if (currentFinal) {
          setInterimTranscript('');
          if (onFinalTranscript) onFinalTranscript(currentFinal.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.');
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        // Auto restart if intended to keep listening
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started or restarting
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to init speech recognition:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onFinalTranscript, onInterimTranscript]);

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

        // Calculate average volume
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
      // Already running or permission prompt
    }
  }, [startAudioVisualizer]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
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
