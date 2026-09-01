import type { GlossaryItem } from '../types';

const KOREAN_FILLERS = [
  /^(어+|음+|그+|저+|저기+|막+|이제+|아+|그니까+)\s+/gi,
  /\s+(어+|음+|그+|저기+|막+|이제+|그니까+)\s+/gi,
  /\s+(어+|음+|그+|저기+|막+|이제+|그니까+)$/gi,
  /\b(어\.\.\.|음\.\.\.|그\.\.\.|아\.\.\.)\b/gi,
];

const ENGLISH_FILLERS = [
  /\b(um+|uh+|er+|ah+|like+|you know+|i mean+|sort of+|kind of+|basically+|actually+)\b[,.]?/gi,
];

/**
 * Filter disfluencies and filler words from spoken text
 */
export function removeDisfluencies(text: string): { cleanedText: string; removedCount: number } {
  if (!text || text.trim() === '') {
    return { cleanedText: '', removedCount: 0 };
  }

  let cleaned = text;
  let removedCount = 0;

  // Process Korean fillers
  for (const regex of KOREAN_FILLERS) {
    const matches = cleaned.match(regex);
    if (matches) {
      removedCount += matches.length;
      cleaned = cleaned.replace(regex, ' ');
    }
  }

  // Process English fillers
  for (const regex of ENGLISH_FILLERS) {
    const matches = cleaned.match(regex);
    if (matches) {
      removedCount += matches.length;
      cleaned = cleaned.replace(regex, ' ');
    }
  }

  // Clean up duplicate spaces and trim
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return {
    cleanedText: cleaned.length > 0 ? cleaned : text.trim(),
    removedCount,
  };
}

/**
 * Apply custom glossary and Translation Memory (TM) to text
 */
export function applyGlossaryToText(text: string, glossary: GlossaryItem[]): string {
  if (!text || glossary.length === 0) return text;

  let result = text;
  for (const item of glossary) {
    if (!item.sourceTerm || !item.targetTerm) continue;
    
    // Case-insensitive replacement for whole terms
    try {
      const regex = new RegExp(`\\b${escapeRegExp(item.sourceTerm)}\\b`, 'gi');
      result = result.replace(regex, item.targetTerm);
    } catch {
      // Fallback simple replace
      result = result.split(item.sourceTerm).join(item.targetTerm);
    }
  }
  return result;
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
