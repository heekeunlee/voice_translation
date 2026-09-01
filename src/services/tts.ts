/**
 * Web Speech Synthesis TTS Service with English learning & shadowing controls
 */

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.isInitialized = true;
  }

  public getAvailableVoices(langCode?: string): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (!this.isInitialized) this.loadVoices();
    if (!langCode) return this.voices;
    return this.voices.filter(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
  }

  public speak(
    text: string,
    options: {
      lang?: string;
      rate?: number;
      pitch?: number;
      onEnd?: () => void;
      onError?: (err: unknown) => void;
    } = {}
  ): void {
    if (!this.synth) return;

    this.stop(); // Stop any ongoing speech

    const cleanText = text.trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    const targetLang = options.lang || (this.isKorean(cleanText) ? 'ko-KR' : 'en-US');
    utterance.lang = targetLang;

    // Pick best natural voice if available
    const matchedVoices = this.getAvailableVoices(targetLang.split('-')[0]);
    const preferredVoice = matchedVoices.find(
      v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Yuna')
    ) || matchedVoices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (options.onEnd) {
      utterance.onend = options.onEnd;
    }
    if (options.onError) {
      utterance.onerror = options.onError;
    }

    this.synth.speak(utterance);
  }

  public stop(): void {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  public isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }

  private isKorean(text: string): boolean {
    return /[\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/.test(text);
  }
}

export const ttsService = new TTSService();
