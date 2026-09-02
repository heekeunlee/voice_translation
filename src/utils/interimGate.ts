/**
 * Decides WHEN a still-growing interim transcript is worth translating ahead of
 * the final result.
 *
 * Why this exists: Chrome's Web Speech API only marks a result `isFinal` after
 * roughly 0.7-2s of silence. Waiting for that puts an endpointing delay in front
 * of every translation, so the perceived latency is 1.5-3s no matter how fast the
 * model is. Translating the interim transcript speculatively and replacing it
 * when the final arrives is what makes the output appear while you are still
 * talking.
 *
 * The cost of speculating is an extra API call, so the gate below is deliberately
 * strict: the text must be long enough to translate meaningfully, must have grown
 * since the last speculation, and must have stopped changing (or landed on a
 * clause boundary).
 */

/** Latin sentence/clause punctuation, plus CJK equivalents. */
const PUNCTUATION_BOUNDARY = /[.!?;:,。！？；：、]\s*$/;

/**
 * Korean connective endings that reliably close a clause. Kept deliberately
 * short — common sentence enders like 다/요/어 appear mid-word far too often to
 * be used as boundaries.
 */
const KOREAN_CLAUSE_BOUNDARY = /(?:는데|은데|지만|면서|니까|어서|아서|다가|거나|든지|하고)\s*$/;

const CJK_RANGE = /[぀-ヿ㐀-鿿가-힯]/g;

/**
 * Rough "how much has been said" measure that behaves consistently across
 * scripts: CJK writes ~1 syllable per character, Latin ~3 characters per short
 * word, so both land on a comparable scale.
 */
export function speechUnitCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const cjk = (trimmed.match(CJK_RANGE) || []).length;
  if (cjk > 0) return cjk;
  return trimmed.split(/\s+/).filter(Boolean).length * 3;
}

/** True when the transcript currently ends on a natural clause break. */
export function isClauseBoundary(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return PUNCTUATION_BOUNDARY.test(trimmed) || KOREAN_CLAUSE_BOUNDARY.test(trimmed);
}

export interface SpeculationGateInput {
  /** The live interim transcript. */
  interim: string;
  /** The interim text we last sent for speculative translation ('' if none). */
  lastSpeculated: string;
  /** Minimum size before speculating at all. */
  minUnits?: number;
  /** Minimum growth over `lastSpeculated` before speculating again. */
  minGrowthUnits?: number;
}

/**
 * Should we spend an API call on this interim transcript?
 */
export function shouldSpeculate({
  interim,
  lastSpeculated,
  minUnits = 8,
  minGrowthUnits = 5,
}: SpeculationGateInput): boolean {
  const text = interim.trim();
  if (!text) return false;

  const units = speechUnitCount(text);
  if (units < minUnits) return false;

  // Never re-translate identical text.
  if (text === lastSpeculated.trim()) return false;

  // A revision that shrank or barely moved isn't worth another call. STT often
  // rewrites the tail of an interim result without adding information.
  const growth = units - speechUnitCount(lastSpeculated);
  if (lastSpeculated && growth < minGrowthUnits) return false;

  return true;
}

/**
 * How long to wait for the transcript to settle before firing.
 * A clause boundary is already a natural stopping point, so we barely wait.
 */
export function speculationDelayMs(
  interim: string,
  { stableMs = 420, boundaryMs = 120 } = {},
): number {
  return isClauseBoundary(interim) ? boundaryMs : stableMs;
}
