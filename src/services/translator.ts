import type { AppSettings, GlossaryItem, LearningDetail, TranslationMode } from '../types';
import { TRANSLATION_MODES } from '../constants';
import { formatGlossaryForPrompt, removeDisfluencies, KOREAN_IDIOM_MAP } from '../utils/textCleaner';

export interface ConversationContext {
  sourceText: string;
  translatedText: string;
}

export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  mode: TranslationMode;
  glossary: GlossaryItem[];
  settings: AppSettings;
  history?: ConversationContext[];
  onChunk?: (chunk: string, fullTranslatedText: string) => void;
}

export interface TranslateResult {
  translatedText: string;
  cleanedSourceText: string;
  learningDetails?: LearningDetail;
  latencyMs: number;
}

/**
 * Advanced Translation Service supporting Gemini Flash, OpenAI, and Smart Local Fallback
 * Features Rolling Context Buffer, Deep Pragmatics & Nuance Engine, Subject Restoration, and Idiomatic Localization
 */
export class TranslationService {
  /**
   * Translate with streaming support & contextual history
   */
  public async translate(req: TranslateRequest): Promise<TranslateResult> {
    const startTime = performance.now();
    
    // 1. Disfluency & Stutter Cleaning
    const { cleanedText } = req.settings.disfluencyFilter 
      ? removeDisfluencies(req.text)
      : { cleanedText: req.text };

    if (!cleanedText.trim()) {
      return {
        translatedText: '',
        cleanedSourceText: '',
        latencyMs: 0,
      };
    }

    const modeConfig = TRANSLATION_MODES.find(m => m.id === req.mode) || TRANSLATION_MODES[0];
    const glossaryPrompt = formatGlossaryForPrompt(req.glossary);
    const historyPrompt = this.formatHistoryPrompt(req.history);

    let result: TranslateResult;

    // Route by engine
    if (req.settings.engine.startsWith('gemini') && req.settings.geminiApiKey) {
      result = await this.translateWithGemini(cleanedText, req, modeConfig.promptGuidance, glossaryPrompt, historyPrompt, startTime);
    } else if (req.settings.engine === 'gpt-4o-mini' && req.settings.openaiApiKey) {
      result = await this.translateWithOpenAI(cleanedText, req, modeConfig.promptGuidance, glossaryPrompt, historyPrompt, startTime);
    } else {
      // Smart Fallback (Enhanced Google Translate + Local Pragmatics & Heuristics)
      result = await this.translateWithSmartFallback(cleanedText, req, startTime);
    }

    return result;
  }

  /**
   * Format recent 2-3 conversation turns for context injection
   */
  private formatHistoryPrompt(history?: ConversationContext[]): string {
    if (!history || history.length === 0) return '';
    const recent = history.slice(0, 3).reverse();
    const lines = recent.map((h, i) => `대화 ${i + 1}) 원문: "${h.sourceText}" ➔ 번역: "${h.translatedText}"`).join('\n');
    return `\n[직전 대화 맥락 (이전 턴 히스토리)]:\n${lines}\n※ 위 직전 대화 맥락을 바탕으로, 현재 문장에서 생략된 주어(I, You, We, It 등)와 시제, 대화 상대와의 관계를 정확히 추론하여 자연스럽게 번역에 반영하세요.\n`;
  }

  /**
   * Comprehensive Korean-English Pragmatics, Honorifics & Nuance Engine Guidelines
   */
  private getPragmaticsGuidance(sourceLang: string, _targetLang: string): string {
    const isKoreanSource = sourceLang.toLowerCase().startsWith('ko');
    
    if (isKoreanSource) {
      return `
[한국어 ➔ 영어 화용론(Pragmatics) 및 뉘앙스 정밀 복원 지침]:
1. [생략된 주어/목적어 적극 복원]:
   - 한국어는 주어와 목적어가 자주 생략됩니다. 문맥상 화자(I), 청자(You), 우리(We), 상황(It/There) 중 가장 자연스러운 주어를 반드시 채워 넣어 온전한 영어 문장으로 완성하세요.
   - 예: "밥 먹었어?" ➔ "Have you eaten yet?" (Not "Did I eat?")
   - 예: "도착했어" ➔ "I've arrived." / "I'm here."

2. [한국어 종결 어미 및 감정 뉘앙스 매핑]:
   - "~잖아(요)": 상대방도 이미 아는 사실 상기 ➔ "You know (that)...", "As you know...", "Remember..."
   - "~더라고(요) / ~던데요": 직접 경험하거나 관찰한 사실 전달 ➔ "I noticed that...", "It turned out that...", "I found that..."
   - "~거든(요)": 이유 및 배경 설명 ➔ "Because...", "The thing is...", "You see..."
   - "~을/ㄹ 텐데": 걱정, 조심스러운 우려, 추측 ➔ "I'm worried that...", "It should be...", "I wonder if..."
   - "~인 것 같아(요) / ~나 봐(요)": 완곡하고 부드러운 의견 표명 ➔ "I feel like...", "It seems that...", "I guess..."
   - "~해 버렸어 / ~했지 뭐야": 예상치 못한 완료나 가벼운 후회/놀람 ➔ "ended up -ing", "accidentally..."
   - "~지 그래(요) / ~지 그랬어": 부드러운 권유 또는 가벼운 아쉬움 ➔ "Why don't you...", "You should have..."
   - "~을래(요) / ~ㄹ래(요)": 제안이나 가벼운 의사 ➔ "Do you want to...", "How about we...", "I think I'll..."
   - "~을까(요) / ~ㄹ까(요)": 의견 묻기 및 부드러운 의문 ➔ "Shall we...", "What if we...", "Do you think..."
   - "~을게(요) / ~ㄹ게(요)": 다짐 및 능동적 약속 ➔ "I'll make sure to...", "Let me...", "I'll..."
   - "~는 편이야": 습관 및 경향 ➔ "I tend to...", "I usually..."
   - "~는 바람에": 뜻밖의 원인으로 인한 지연/문제 ➔ "Because of...", "held me up", "due to..."

3. [문화적 관용구 현지화]:
   - "수고하셨습니다 / 고생 많으셨어요" ➔ "Great job today!" / "Thank you for your hard work."
   - "눈치 보다" ➔ "walk on eggshells / read the room"
   - "손이 크다" ➔ "generous with portions / generous"
   - "부담 갖지 마세요" ➔ "No pressure at all / Don't feel obligated"
   - "마음이 쓰여요" ➔ "It weighs on my mind / It's on my mind"
   - "어쩔 수 없지" ➔ "It is what it is / There's nothing we can do"
   - "내가 쏠게 / 한턱 낼게" ➔ "It's on me / My treat"
   - "잘 부탁드립니다" ➔ "Looking forward to working with you."

4. [자연스러운 구어체 연어(Collocation)]: 직역을 피하고, 원어민이 실제 해당 상황에서 쓰는 생생하고 세련된 표현을 구사하세요.
`;
    } else {
      return `
[영어 ➔ 한국어 번역 정밀 뉘앙스 지침]:
1. [불필요한 인칭대명사 남발 금지]: 영어의 'he, she, it, they'를 기계적으로 '그, 그녀, 그것'으로 직역하지 말고, 주어를 자연스럽게 생략하거나 문맥에 맞는 호칭으로 처리하세요.
2. [피동문 ➔ 능동문 전환]: 영어의 수동태 표현을 자연스러운 한국어 능동태나 일상 구어체로 다듬으세요.
3. [영어 관용구 및 구동사 자연스러운 번역]:
   - "touch base" ➔ "간단히 상황 공유하다 / 연락하다"
   - "call it a day" ➔ "오늘은 이만 마무리하다"
   - "under the weather" ➔ "몸 컨디션이 안 좋다"
   - "bite the bullet" ➔ "이를 악물고 결단을 내리다"
   - "hit the nail on the head" ➔ "정곡을 찌르다 / 딱 맞추다"
`;
    }
  }

  /**
   * Gemini 2.0 / 1.5 Flash Streaming Translation with Contextual Nuance Engine
   */
  private async translateWithGemini(
    text: string,
    req: TranslateRequest,
    modeGuidance: string,
    glossaryPrompt: string,
    historyPrompt: string,
    startTime: number
  ): Promise<TranslateResult> {
    const modelName = req.settings.engine === 'gemini-1.5-flash' ? 'gemini-1.5-flash' : 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${req.settings.geminiApiKey}`;

    const isTutorMode = req.mode === 'tutor';
    const pragmaticsGuidance = this.getPragmaticsGuidance(req.sourceLang, req.targetLang);

    const systemInstruction = `당신은 세계 최고 수준의 실시간 동시통역 엔진 및 AI 영어 학습 튜터입니다.
출발어: ${req.sourceLang} ➔ 도착어: ${req.targetLang}

${pragmaticsGuidance}

[번역 스타일 지침 - ${req.mode.toUpperCase()} 모드]
${modeGuidance}
${glossaryPrompt}
${historyPrompt}

${isTutorMode ? `
[출력 형식 - JSON]:
반드시 아래 JSON 형식으로만 응답하세요:
{
  "translation": "가장 자연스럽고 세련된 번역 문장",
  "learning": {
    "naturalAlternative": "원어민이 구어체/실제 상황에서 더 자주 쓰는 대체 표현",
    "grammarTip": "해당 문장의 핵심 문법 및 뉘앙스 차이점 설명 (1~2줄)",
    "shadowingTip": "원어민처럼 억양/연음을 살려 말하는 팁",
    "difficultyLevel": "Intermediate",
    "keyVocabulary": [
      { "word": "단어 또는 숙어", "meaning": "한국어 뜻", "ipa": "/발음기호/", "pos": "v./n./adj." }
    ]
  }
}
` : `
[출력 규칙]:
- 어떠한 부연 설명이나 따옴표, 마크다운 없이 오직 [완성된 번역 문장]만 실시간으로 즉시 출력하세요.
- 말버릇이나 비문은 정제하여 유려하게 완성하세요.
`}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: text }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            temperature: req.mode === 'literature' ? 0.65 : 0.2,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullAccumulated = '';
      let translationResult = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.replace('data: ', '').trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;
                const data = JSON.parse(jsonStr);
                const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                fullAccumulated += textChunk;

                if (!isTutorMode) {
                  translationResult = fullAccumulated;
                  if (req.onChunk) {
                    req.onChunk(textChunk, translationResult);
                  }
                }
              } catch {
                // Ignore parse chunk errors
              }
            }
          }
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);

      if (isTutorMode) {
        try {
          const cleanedJson = fullAccumulated.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedJson);
          translationResult = parsed.translation || fullAccumulated;
          if (req.onChunk) req.onChunk(translationResult, translationResult);
          return {
            translatedText: translationResult,
            cleanedSourceText: text,
            learningDetails: parsed.learning,
            latencyMs,
          };
        } catch {
          return {
            translatedText: fullAccumulated,
            cleanedSourceText: text,
            latencyMs,
          };
        }
      }

      return {
        translatedText: translationResult.trim(),
        cleanedSourceText: text,
        latencyMs,
      };
    } catch (err) {
      console.warn('Gemini stream failed, falling back to smart fallback:', err);
      return this.translateWithSmartFallback(text, req, startTime);
    }
  }

  /**
   * OpenAI GPT-4o-mini Streaming Translation with Pragmatics
   */
  private async translateWithOpenAI(
    text: string,
    req: TranslateRequest,
    modeGuidance: string,
    glossaryPrompt: string,
    historyPrompt: string,
    startTime: number
  ): Promise<TranslateResult> {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const isTutorMode = req.mode === 'tutor';
    const pragmaticsGuidance = this.getPragmaticsGuidance(req.sourceLang, req.targetLang);

    const systemPrompt = `You are a world-class simultaneous interpreter and English tutor.
Translate from ${req.sourceLang} to ${req.targetLang}.
${pragmaticsGuidance}
Mode: ${modeGuidance}
${glossaryPrompt}
${historyPrompt}
${isTutorMode ? 'Respond in JSON with translation, learning details (naturalAlternative, grammarTip, shadowingTip, keyVocabulary).' : 'Output ONLY the translation.'}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${req.settings.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          stream: true,
          temperature: 0.25,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI Error: ${response.statusText}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullAccumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.replace('data: ', ''));
                const content = data.choices?.[0]?.delta?.content || '';
                fullAccumulated += content;
                if (!isTutorMode && req.onChunk) {
                  req.onChunk(content, fullAccumulated);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);

      if (isTutorMode) {
        try {
          const parsed = JSON.parse(fullAccumulated.replace(/```json/g, '').replace(/```/g, '').trim());
          if (req.onChunk) req.onChunk(parsed.translation, parsed.translation);
          return {
            translatedText: parsed.translation,
            cleanedSourceText: text,
            learningDetails: parsed.learning,
            latencyMs,
          };
        } catch {
          return { translatedText: fullAccumulated, cleanedSourceText: text, latencyMs };
        }
      }

      return {
        translatedText: fullAccumulated.trim(),
        cleanedSourceText: text,
        latencyMs,
      };
    } catch (err) {
      console.warn('OpenAI stream failed, using smart fallback:', err);
      return this.translateWithSmartFallback(text, req, startTime);
    }
  }

  /**
   * Smart Built-in Fallback with Nuance, Idiom Mapping & Subject Heuristics
   */
  private async translateWithSmartFallback(
    text: string,
    req: TranslateRequest,
    startTime: number
  ): Promise<TranslateResult> {
    const sl = req.sourceLang.split('-')[0] || 'auto';
    const tl = req.targetLang.split('-')[0] || 'en';

    // 1. Check Idiom Map for exact or partial cultural match
    let matchedIdiom = this.findMatchingIdiom(text);
    let rawTranslation = '';

    if (matchedIdiom) {
      rawTranslation = matchedIdiom;
    } else {
      try {
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data[0]) {
            rawTranslation = data[0].map((item: unknown[]) => (Array.isArray(item) ? item[0] : '')).join('');
          }
        }
      } catch (e) {
        console.warn('Translate fetch error:', e);
      }
    }

    if (!rawTranslation) {
      rawTranslation = text;
    }

    // 2. Polish nuance, mode styling, and fix pronouns
    let styledTranslation = this.polishNuanceAndPronouns(rawTranslation, text, req.mode);

    // 3. Apply Custom Glossary
    if (req.glossary.length > 0) {
      for (const item of req.glossary) {
        if (item.sourceTerm && item.targetTerm) {
          const reg = new RegExp(`\\b${item.sourceTerm}\\b`, 'gi');
          styledTranslation = styledTranslation.replace(reg, item.targetTerm);
        }
      }
    }

    // 4. Fast typing simulation
    if (req.onChunk) {
      await this.simulateTypingStream(styledTranslation, req.onChunk);
    }

    const latencyMs = Math.round(performance.now() - startTime);
    const learningDetails = this.generateLearningDetails(styledTranslation, text, req.mode);

    return {
      translatedText: styledTranslation,
      cleanedSourceText: text,
      learningDetails,
      latencyMs,
    };
  }

  /**
   * Check Korean idiom dictionary
   */
  private findMatchingIdiom(koreanText: string): string | null {
    const trimmed = koreanText.trim();
    for (const entry of KOREAN_IDIOM_MAP) {
      if (entry.pattern.test(trimmed)) {
        return entry.replacement.split(' / ')[0];
      }
    }
    return null;
  }

  /**
   * Polish nuance, mode styling, and fix common pronoun mismatches
   */
  private polishNuanceAndPronouns(englishText: string, originalKorean: string, mode: TranslationMode): string {
    let output = englishText.trim();
    if (!output) return output;

    // Korean nuance endings pattern post-processing
    if (/잖아(요)?\b/.test(originalKorean) && !/^(you know|as you know|remember)/i.test(output)) {
      output = output.replace(/^(I |You |We )?/i, 'You know, $&');
    } else if (/(더라고요|더군요|더라고|던데요)\b/.test(originalKorean) && !/^(I found|I noticed|it turned out)/i.test(output)) {
      output = output.replace(/^(I |It )/i, 'I found out that $&');
    } else if (/(거든|거든요)\b/.test(originalKorean) && !/^(Because|You see|The thing is)/i.test(output)) {
      output = 'You see, ' + output.charAt(0).toLowerCase() + output.slice(1);
    } else if (/(텐데|을 텐데|ㄹ 텐데)\b/.test(originalKorean) && !/worried|afraid|supposed|wonder/i.test(output)) {
      output = output.replace(/\.$/, '') + ", though.";
    } else if (/(을래|ㄹ래|을래요|ㄹ래요)\?/.test(originalKorean) && !/^(do you want|how about|would you)/i.test(output)) {
      output = output.replace(/^(Are you going to|Will you)/i, 'Would you like to');
    }

    // Apply Mode Polish
    switch (mode) {
      case 'academic':
        output = output.replace(/\b(get|got)\b/gi, 'obtain')
                       .replace(/\b(good)\b/gi, 'favorable')
                       .replace(/\b(big)\b/gi, 'substantial')
                       .replace(/\b(make sure)\b/gi, 'ensure')
                       .replace(/\b(look at)\b/gi, 'investigate');
        break;
      case 'literature':
        if (!output.endsWith('.') && !output.endsWith('!') && !output.endsWith('?')) output += '.';
        break;
      case 'journalism':
        output = output.replace(/^and\s+/i, '').replace(/^but\s+/i, '');
        break;
      case 'business':
        if (output.toLowerCase().startsWith('please ')) {
          output = 'We would appreciate if you could ' + output.slice(7);
        } else if (output.toLowerCase().startsWith('give me ')) {
          output = 'Could you please provide ' + output.slice(8);
        }
        break;
      case 'daily':
        output = output.replace(/\b(I would like to)\b/gi, "I'd love to")
                       .replace(/\b(Do not)\b/gi, "Don't")
                       .replace(/\b(Cannot)\b/gi, "Can't")
                       .replace(/\b(I am)\b/gi, "I'm");
        break;
      default:
        break;
    }

    return output;
  }

  /**
   * Fast typing stream simulation for smooth visual rendering
   */
  private async simulateTypingStream(
    fullText: string,
    onChunk: (chunk: string, accumulated: string) => void
  ): Promise<void> {
    const words = fullText.split(' ');
    let current = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i === words.length - 1 ? '' : ' ');
      current += word;
      onChunk(word, current);
      await new Promise(r => setTimeout(r, 16)); // ultra snappy 16ms word stream
    }
  }

  /**
   * Generate contextual learning breakdown with accurate nuance advice and cultural notes
   */
  private generateLearningDetails(
    translatedText: string,
    originalText: string,
    mode: TranslationMode
  ): LearningDetail {
    const words = translatedText
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 4);

    const uniqueWords = Array.from(new Set(words)).slice(0, 4);

    const vocabularyList = uniqueWords.map(word => {
      const lower = word.toLowerCase();
      return {
        word: word,
        meaning: this.getWordMeaningHint(lower),
        ipa: `/${lower}/`,
        pos: 'adj./n./v.',
        example: `Native context: "${translatedText}"`,
      };
    });

    let naturalAlt = `Native Spoken: "${translatedText.replace(/\b(I think that)\b/i, 'I feel like').replace(/\b(very)\b/i, 'super')}"`;
    let grammarTip = `[${mode.toUpperCase()} 모드 핵심]: 원어민은 이 문맥에서 간결한 어순과 자연스러운 동사 연어를 선호합니다.`;

    // Rich contextual nuance feedback
    if (/잖아/.test(originalText)) {
      naturalAlt = `Nuance Tip: "You know, ${translatedText.toLowerCase()}" (상대방도 아는 사실 상기)`;
      grammarTip = `'~잖아'의 뉘앙스를 살릴 때 원어민은 문두에 'You know,' 또는 'As you know,'를 자연스럽게 덧붙입니다.`;
    } else if (/더라고/.test(originalText)) {
      naturalAlt = `Nuance Tip: "I noticed that ${translatedText.toLowerCase()}" (직접 경험한 사실 전달)`;
      grammarTip = `'~더라고(요)'는 본인이 직접 겪어 알게 된 사실을 말하므로 'I noticed' 또는 'It turned out'이 가장 어울립니다.`;
    } else if (/거든/.test(originalText)) {
      naturalAlt = `Nuance Tip: "You see, ${translatedText.toLowerCase()}" (배경/이유 설명)`;
      grammarTip = `'~거든(요)'는 상대방이 모르는 배경 이유를 친근하게 설명할 때 쓰며 'You see,' 또는 'The thing is,'로 표현합니다.`;
    } else if (/눈치/.test(originalText)) {
      naturalAlt = `Idiom Tip: "read the room" (분위기를 파악하다) / "walk on eggshells" (눈치를 살피다)`;
      grammarTip = `'눈치'는 영어에 1:1 단어가 없으므로 분위기 파악은 'read the room', 조심스럽게 행동할 때는 'walk on eggshells'를 씁니다.`;
    } else if (/부담/.test(originalText)) {
      naturalAlt = `Collocation: "No pressure at all!" / "Don't feel obligated."`;
      grammarTip = `'부담 갖지 마세요'는 영어권에서 'No pressure at all'이 가장 널리 쓰이는 자연스러운 표현입니다.`;
    } else if (/어쩔 수/.test(originalText)) {
      naturalAlt = `Native Idiom: "It is what it is." (상황을 있는 그대로 수용할 때)`;
      grammarTip = `'어쩔 수 없지'는 체념과 수용의 뉘앙스로 'It is what it is'가 완벽한 대응 표현입니다.`;
    }

    return {
      keyVocabulary: vocabularyList,
      naturalAlternative: naturalAlt,
      grammarTip: grammarTip,
      shadowingTip: '첫 단어의 강세를 살리고 끝 단어를 자연스럽게 하강조로 마무리해 보세요.',
      difficultyLevel: words.length > 8 ? 'Advanced' : 'Intermediate',
    };
  }

  private getWordMeaningHint(word: string): string {
    const dict: Record<string, string> = {
      translation: '번역, 변환',
      simultaneous: '동시의, 일제히 일어나는',
      conference: '컨퍼런스, 학술회의',
      academic: '학술의, 논문 수준의',
      literature: '문학, 서정적 글',
      journalism: '저널리즘, 언론 보도',
      business: '비즈니스, 업무',
      empirical: '실증적인, 경험에 기초한',
      significant: '유의미한, 중대한',
      correlation: '상관관계, 연관성',
      appreciate: '감사하다, 높이 평가하다',
      collaborate: '협력하다, 공동 작업하다',
      perspective: '관점, 시각',
      essential: '필수적인, 극히 중요한',
      noticed: '알아차린, 인지한',
      alternative: '대안, 대체 가능한',
      pressure: '압박, 부담감',
      obligated: '의무가 있는, 부담을 느끼는',
      investigate: '조사하다, 연구하다',
      substantial: '상당한, 실질적인',
      generous: '후한, 손이 큰',
    };
    return dict[word] || '주요 핵심 어휘 및 표현';
  }
}

export const translationService = new TranslationService();
