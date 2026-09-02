/**
 * Scoring for the shadowing exercise.
 *
 * What this measures, honestly: whether the speech recogniser heard the same
 * words in the same order. It is NOT a measure of pronunciation quality — the
 * recogniser already normalises audio into text, so accent, stress and intonation
 * are gone by the time we see it. The UI is labelled accordingly.
 *
 * The previous implementation compared bags of words, so "the cat sat on the mat"
 * and "mat the on sat cat the" both scored 100%, and it stripped every non-ASCII
 * character, which made the score a constant 0 for Japanese, Chinese and Korean
 * targets.
 */

export type TokenStatus = 'match' | 'missing' | 'extra';

export interface AlignedToken {
  text: string;
  status: TokenStatus;
}

export interface ShadowingResult {
  /** 0-100. Order-aware overlap between the target and what was heard. */
  score: number;
  /** The target sentence, each word marked matched or missing. */
  target: AlignedToken[];
  /** What the recogniser heard, each word marked matched or extra. */
  spoken: AlignedToken[];
  matched: number;
  targetCount: number;
}

/** Scripts that do not separate words with spaces. */
const SCRIPTLESS_SPACING = /[぀-ヿ㐀-鿿]/;

/**
 * Split into comparable units. Space-delimited languages tokenise by word;
 * Japanese and Chinese have no word spacing, so they tokenise by character —
 * coarse, but it degrades gracefully instead of returning nothing.
 */
export function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    // Strip punctuation across scripts, keep letters/digits/marks and spaces.
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  if (SCRIPTLESS_SPACING.test(normalized)) {
    return Array.from(normalized).filter(ch => ch.trim().length > 0);
  }

  return normalized.split(' ').filter(Boolean);
}

/** Length of the longest common subsequence, plus the backtrace table. */
function lcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      table[i][j] = a[i - 1] === b[j - 1]
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table;
}

/**
 * Compare what should have been said with what was heard.
 *
 * Order matters: alignment is a longest-common-subsequence, so a scrambled
 * sentence scores far below a correct one. The score is the Dice coefficient
 * over that alignment — it penalises both dropped words and invented ones.
 */
export function scoreShadowing(target: string, spoken: string): ShadowingResult {
  const t = tokenize(target);
  const s = tokenize(spoken);

  if (t.length === 0 || s.length === 0) {
    return {
      score: 0,
      target: t.map(text => ({ text, status: 'missing' as const })),
      spoken: s.map(text => ({ text, status: 'extra' as const })),
      matched: 0,
      targetCount: t.length,
    };
  }

  const table = lcsTable(t, s);

  // Walk the table backwards to mark which tokens took part in the alignment.
  const targetMatched = new Array<boolean>(t.length).fill(false);
  const spokenMatched = new Array<boolean>(s.length).fill(false);
  let i = t.length;
  let j = s.length;
  while (i > 0 && j > 0) {
    if (t[i - 1] === s[j - 1]) {
      targetMatched[i - 1] = true;
      spokenMatched[j - 1] = true;
      i--; j--;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const matched = table[t.length][s.length];
  const score = Math.round((2 * matched * 100) / (t.length + s.length));

  return {
    score: Math.max(0, Math.min(100, score)),
    target: t.map((text, idx) => ({ text, status: targetMatched[idx] ? 'match' : 'missing' })),
    spoken: s.map((text, idx) => ({ text, status: spokenMatched[idx] ? 'match' : 'extra' })),
    matched,
    targetCount: t.length,
  };
}
