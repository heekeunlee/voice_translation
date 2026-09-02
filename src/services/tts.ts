/**
 * Web Speech Synthesis TTS Service with English learning & shadowing controls
 */

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private activeSettle: (() => void) | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * ★ P0-4 barge-in gate. The app registers a mic suspend/resume pair once, and
   * EVERY playback path (auto-TTS, the 0.75x/1.25x buttons, shadowing) then mutes
   * the mic for its duration — otherwise the recogniser transcribes our own
   * synthesised speech and the app translates itself in a loop.
   */
  private gate: { onStart: () => void; onEnd: () => void } | null = null;
  private gateDepth = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public setPlaybackGate(gate: { onStart: () => void; onEnd: () => void } | null) {
    this.gate = gate;
  }

  private openGate() {
    this.gateDepth++;
    if (this.gateDepth === 1) this.gate?.onStart();
  }

  private closeGate() {
    if (this.gateDepth === 0) return;
    this.gateDepth = 0;
    this.gate?.onEnd();
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

    // Guarantee exactly one settle callback: `onEnd` must fire on error and on
    // cancel too, otherwise a caller that paused the mic for playback (barge-in
    // protection) would never resume it.
    let settled = false;
    const settle = (err?: unknown) => {
      if (settled) return;
      settled = true;
      this.closeGate();
      if (err !== undefined) options.onError?.(err);
      options.onEnd?.();
    };

    utterance.onend = () => settle();
    utterance.onerror = (event) => settle(event);

    // Ordering matters: `this.stop()` above already settled (and un-gated) any
    // previous utterance, so we open the gate only now, for this one.
    this.openGate();
    this.activeSettle = settle;
    this.synth.speak(utterance);

    // Chrome occasionally drops `onend` for long utterances; a watchdog based on
    // a rough speaking-rate estimate keeps the mic from staying muted forever.
    const estimatedMs = (cleanText.length / 12) * 1000 / (utterance.rate || 1) + 3000;
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => {
      if (this.synth && !this.synth.speaking) settle();
    }, estimatedMs);
  }

  public stop(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.synth && (this.synth.speaking || this.synth.pending)) {
      this.synth.cancel();
    }
    // `cancel()` does not reliably fire `onend` — settle manually.
    const settle = this.activeSettle;
    this.activeSettle = null;
    settle?.();
  }

  public isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }

  private isKorean(text: string): boolean {
    return /[\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/.test(text);
  }
}

export const ttsService = new TTSService();
