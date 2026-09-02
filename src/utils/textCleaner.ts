import type { GlossaryItem } from '../types';

/**
 * Disfluency removal is deliberately CONSERVATIVE.
 *
 * The previous rules deleted any bare 그/저/이제/막/약간 and every English
 * `like/actually/basically/literally/honestly/sort of/kind of`, which destroyed
 * real content:
 *   "I like this coffee"                 -> "I  this coffee"      (verb deleted)
 *   "나는 그 사람이 저 차를 봤어"          -> "나는 사람이 차를 봤어"  (determiners deleted)
 * Those words are only fillers in specific positions, and an LLM already strips
 * them far more reliably than a regex can. So we now remove only tokens that
 * cannot be anything but a hesitation sound, and leave the rest to the model.
 */

/** Pure hesitation sounds: 어/음/으/아/에/어어/으음… standing alone as a token. */
const KOREAN_HESITATION = '(?:어+|음+|으+음*|아+|에+또?|엄+)';

const KOREAN_FILLERS: RegExp[] = [
  // Filler followed by an ellipsis / comma anywhere: "어...", "그...", "저기,"
  new RegExp(`(?:^|\\s)(?:${KOREAN_HESITATION}|그+|저기+|그니까+|그러니까+|있잖아+|그\\s*뭐냐+)\\s*(?:\\.{2,}|…|,)\\s*`, 'g'),
  // Standalone hesitation sound at the start of the utterance: "음 오늘은"
  new RegExp(`^\\s*${KOREAN_HESITATION}(?=\\s)\\s*`, 'g'),
  // Standalone hesitation sound between words: "오늘은 어 좀 춥네"
  new RegExp(`\\s+${KOREAN_HESITATION}(?=\\s)\\s*`, 'g'),
  // Trailing hesitation sound: "그래서 음"
  new RegExp(`\\s+${KOREAN_HESITATION}\\s*$`, 'g'),
];

const ENGLISH_FILLERS: RegExp[] = [
  // Non-lexical sounds only — these are never content words.
  /(?:^|\s)(?:u+m+|u+h+|e+r+m?|a+h+|hm+|mhm+|erm+)\b[,.]?/gi,
  // Discourse markers ONLY when comma-delimited, i.e. unambiguously parenthetical:
  // "It's, like, fine" / "I mean, sure" — never "I like coffee" or "what I mean".
  /,\s*(?:like|you know|i mean|sort of|kind of|actually|basically)\s*,/gi,
  /^(?:well|so|you know|i mean),\s*/gi,
];

/**
 * Collapse an immediately repeated word: "내가 내가 가볼게" -> "내가 가볼게".
 * Uses Unicode property escapes because JS `\b` is ASCII-only and never matched
 * Hangul, so the old rule silently did nothing for Korean.
 */
const STUTTER = /(^|[\s,.!?])(\p{L}[\p{L}\p{N}]*)(?:\s+\2)+(?=[\s,.!?]|$)/gu;

/**
 * Filter disfluencies, filler words, and stammers from spoken text
 */
export function removeDisfluencies(text: string): { cleanedText: string; removedCount: number } {
  if (!text || text.trim() === '') {
    return { cleanedText: '', removedCount: 0 };
  }

  let cleaned = text;
  let removedCount = 0;

  // 1. Collapse stutters, repeatedly (a triple repeat needs two passes).
  //    Bounded loop: the old `while (regex.test(...))` misfired because a /g
  //    regex carries lastIndex between .test() calls.
  for (let pass = 0; pass < 3; pass++) {
    const next = cleaned.replace(STUTTER, '$1$2');
    if (next === cleaned) break;
    removedCount++;
    cleaned = next;
  }

  // 2. Korean hesitation sounds
  for (const regex of KOREAN_FILLERS) {
    const matches = cleaned.match(regex);
    if (matches) {
      removedCount += matches.length;
      cleaned = cleaned.replace(regex, ' ');
    }
  }

  // 3. English hesitation sounds & parenthetical discourse markers
  for (const regex of ENGLISH_FILLERS) {
    const matches = cleaned.match(regex);
    if (matches) {
      removedCount += matches.length;
      cleaned = cleaned.replace(regex, regex.source.startsWith(',') ? ', ' : ' ');
    }
  }

  // 4. Tidy whitespace and stray punctuation left behind
  cleaned = cleaned
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // An utterance that is nothing but hesitation carries no meaning: return empty
  // so the caller skips the translation round-trip entirely.
  if (new RegExp(`^(?:${KOREAN_HESITATION}|u+m+|u+h+|hm+|a+h+|e+r+m?)[\\s.,…]*$`, 'i').test(cleaned)) {
    return { cleanedText: '', removedCount: removedCount + 1 };
  }

  // Otherwise never hand an empty string downstream — fall back to the raw utterance.
  return {
    cleanedText: cleaned.length > 0 ? cleaned : text.trim(),
    removedCount,
  };
}

/**
 * Rich dictionary of 60+ Korean colloquial idioms, cultural expressions, and speech acts
 * to ensure natural, idiomatic localization instead of awkward direct translations.
 */
export const KOREAN_IDIOM_MAP: Array<{ pattern: RegExp; replacement: string; hint: string }> = [
  // 1. Everyday greetings & social phrases
  { pattern: /^밥\s*(먹었어|먹었니|드셨어요|먹었습니까|먹었냐)\??$/i, replacement: "Have you eaten yet?", hint: "안부 묻기: 밥 먹었어?" },
  { pattern: /^(식사\s*하셨어요|식사\s*하셨습니까)\??$/i, replacement: "Have you had a meal yet?", hint: "존댓말 안부: 식사하셨어요?" },
  { pattern: /^(수고하셨습니다|수고했어|고생하셨습니다|고생 많으셨어요)[!.]?$/i, replacement: "Thank you for your hard work! / Great job today!", hint: "격려 인사: 수고하셨습니다" },
  { pattern: /^(잘\s*부탁드립니다|잘\s*부탁드려요|잘\s*부탁해)[!.]?$/i, replacement: "Looking forward to working with you.", hint: "첫인사/협업: 잘 부탁드립니다" },
  { pattern: /^(조심히\s*들어가세요|조심히\s*가|살펴\s*가세요)[!.]?$/i, replacement: "Get home safe! / Take care on your way back.", hint: "배웅: 조심히 들어가세요" },
  { pattern: /^(별말씀을요|천만에요|아니에요|별거\s*아니에요)[!.]?$/i, replacement: "Don't mention it! / My pleasure!", hint: "겸손한 응답: 별말씀을요" },

  // 2. Korean cultural idioms (눈치, 부담, 손 등)
  { pattern: /눈치(를)?\s*보(다|네|고|지|았어|더라고)/i, replacement: "walk on eggshells / read the room", hint: "관용구: 눈치 보다" },
  { pattern: /눈치(가)?\s*(빠르|빨라|빠르네)/i, replacement: "quick on the uptake / good at reading the room", hint: "관용구: 눈치가 빠르다" },
  { pattern: /손(이)?\s*(크다|커|크네)/i, replacement: "generous with portions / generous", hint: "관용구: 손이 크다" },
  { pattern: /입(이)?\s*(짧다|짧아|짧네)/i, replacement: "picky eater / has a small appetite", hint: "관용구: 입이 짧다" },
  { pattern: /귀(가)?\s*(얇다|얇아|얇네)/i, replacement: "easily swayed / gullible", hint: "관용구: 귀가 얇다" },
  { pattern: /발(이)?\s*(넓다|넓어|넓네)/i, replacement: "well-connected / has a wide network", hint: "관용구: 발이 넓다" },
  { pattern: /부담\s*갖지\s*마(세요)?/i, replacement: "No pressure at all / Don't feel obligated", hint: "배려: 부담 갖지 마" },
  { pattern: /마음(이)?\s*쓰이(다|네|어|네요)/i, replacement: "It's on my mind / It weighs on my mind", hint: "심리: 마음에 쓰이다" },
  { pattern: /어쩔\s*수\s*없(지|네|어요)/i, replacement: "It is what it is / There's nothing we can do", hint: "체념/수용: 어쩔 수 없지" },
  { pattern: /말도\s*안\s*돼[!.]?/i, replacement: "No way! / That makes no sense!", hint: "놀람: 말도 안 돼" },
  { pattern: /(내가\s*쏠게|한턱\s*낼게|내가\s*살게)[!.]?/i, replacement: "It's on me! / My treat!", hint: "대접: 내가 쏠게" },
  { pattern: /답답해(요)?|답답하다/i, replacement: "frustrated / feeling suffocated", hint: "감정: 답답하다" },
  { pattern: /서운해(요)?|섭섭해(요)?/i, replacement: "I feel hurt / I feel disappointed", hint: "감정: 서운하다" },
  { pattern: /귀찮아(요)?|귀찮다/i, replacement: "can't be bothered / too lazy to do it", hint: "감정: 귀찮다" },

  // 3. Subjectless questions & daily phrases
  { pattern: /^어디\s*(가|가요|가세요|가니)\??$/i, replacement: "Where are you heading?", hint: "질문: 어디 가?" },
  { pattern: /^뭐\s*(해|해요|하십니까|하니)\??$/i, replacement: "What are you up to?", hint: "질문: 뭐 해?" },
  { pattern: /^언제\s*(와|와요|올래|올\s*거야)\??$/i, replacement: "When are you coming?", hint: "질문: 언제 와?" },
  { pattern: /^잘\s*(잤어|주무셨어요)\??$/i, replacement: "Did you sleep well?", hint: "안부: 잘 잤어?" },
  { pattern: /^도착했어\??$/i, replacement: "Did you arrive? / Are you there yet?", hint: "확인: 도착했어?" },
  { pattern: /^봤어\??$/i, replacement: "Did you check it out? / Did you see it?", hint: "확인: 봤어?" },
  { pattern: /^들었어\??$/i, replacement: "Did you hear about that?", hint: "확인: 들었어?" },
  { pattern: /^어떻게\s*생각해\??$/i, replacement: "What do you think about it?", hint: "의견: 어떻게 생각해?" },
  { pattern: /^출발했어\??$/i, replacement: "Did you leave yet? / Are you on your way?", hint: "확인: 출발했어?" },
];

/**
 * Apply custom glossary and Translation Memory (TM) to text
 */
export function applyGlossaryToText(text: string, glossary: GlossaryItem[]): string {
  if (!text || glossary.length === 0) return text;

  // Longest term first, so "Read the room" wins over a "room" entry.
  const entries = [...glossary]
    .filter(item => item.sourceTerm && item.targetTerm)
    .sort((a, b) => b.sourceTerm.length - a.sourceTerm.length);

  let result = text;
  for (const item of entries) {
    try {
      result = result.replace(buildTermPattern(item.sourceTerm), item.targetTerm);
    } catch {
      result = result.split(item.sourceTerm).join(item.targetTerm);
    }
  }
  return result;
}

/**
 * Match a glossary term on its own, not inside a longer word.
 *
 * JS `\b` is defined over ASCII `\w`, so `\b눈치\b` never matched anything —
 * every Korean, Japanese or Chinese glossary entry was silently inert. These
 * lookarounds use Unicode letter/number classes instead, which behave correctly
 * for Hangul and CJK as well as Latin.
 */
function buildTermPattern(term: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`,
    'giu',
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate formatted glossary prompt injection for LLM
 */
export function formatGlossaryForPrompt(glossary: GlossaryItem[]): string {
  if (!glossary || glossary.length === 0) return '';
  
  const entries = glossary
    .map(g => `- "${g.sourceTerm}" ➔ "${g.targetTerm}" (${g.category || '용어'}${g.description ? `: ${g.description}` : ''})`)
    .join('\n');
    
  return `\n[강제 적용 전문 용어집(Custom Glossary / TM)]:\n반드시 아래 원문 용어는 지정된 번역어로만 일치시켜 번역하세요:\n${entries}\n`;
}
