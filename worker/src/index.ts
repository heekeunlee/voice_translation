/**
 * FluentLive translation proxy.
 *
 * The browser app previously called Gemini with the API key in the URL query
 * string and OpenAI with the key in an Authorization header, both from
 * client-side JavaScript. On a static GitHub Pages deployment that means every
 * visitor either has to paste their own key or gets no AI engine at all, and any
 * key that is used leaks into browser history, extensions and proxy logs.
 *
 * This Worker holds the keys as secrets and forwards requests. It is a thin
 * pass-through — all prompt construction stays in the client — but a deliberately
 * *constrained* one, because a public endpoint in front of a paid API key is an
 * open invitation otherwise:
 *
 *   - Origin must be on the allowlist (checked server-side, not just via CORS).
 *   - Only the specific streaming endpoints and model ids below are reachable.
 *   - Request size, input text length and max output tokens are capped.
 *   - Per-IP rate limit (best effort — see the note on the limiter).
 *
 * Deploy: see worker/README.md
 */

export interface Env {
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  /** Comma-separated origin allowlist, e.g. "https://user.github.io,http://localhost:5173" */
  ALLOWED_ORIGINS?: string;
}

/** Models this proxy is willing to call. Keep it tight. */
const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
]);

const ALLOWED_OPENAI_MODELS = new Set([
  'gpt-4o-mini',
]);

const MAX_BODY_BYTES = 32_000;
const MAX_INPUT_CHARS = 4_000;
const MAX_OUTPUT_TOKENS = 1_024;

/** Requests allowed per IP per window. */
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

/**
 * Best-effort limiter. Worker isolates are per-colo and short-lived, so this
 * bounds a single burst rather than a determined attacker. For a real limit add
 * a Cloudflare WAF rate-limiting rule in the dashboard (no code needed) — the
 * README explains how.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (hits.size > 10_000) hits.clear(); // crude guard against unbounded growth
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const list = allowedOrigins(env);
  const allow = origin && list.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/** Total length of every text field the caller is asking the model to read. */
function countGeminiInputChars(payload: Record<string, unknown>): number {
  let total = 0;
  const contents = payload.contents;
  if (Array.isArray(contents)) {
    for (const item of contents) {
      const parts = (item as { parts?: Array<{ text?: string }> })?.parts;
      if (Array.isArray(parts)) for (const p of parts) total += p?.text?.length ?? 0;
    }
  }
  const sys = payload.systemInstruction as { parts?: Array<{ text?: string }> } | undefined;
  if (Array.isArray(sys?.parts)) for (const p of sys.parts) total += p?.text?.length ?? 0;
  return total;
}

function countOpenAiInputChars(payload: Record<string, unknown>): number {
  const messages = payload.messages;
  if (!Array.isArray(messages)) return 0;
  return messages.reduce<number>(
    (sum, m) => sum + (typeof (m as { content?: unknown }).content === 'string'
      ? ((m as { content: string }).content).length
      : 0),
    0,
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json(405, { error: 'Method not allowed' }, cors);
    }

    // Enforce the allowlist server-side. CORS alone only constrains browsers.
    if (!cors['Access-Control-Allow-Origin']) {
      return json(403, { error: 'Origin not allowed' }, cors);
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (rateLimited(ip)) {
      return json(429, { error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, cors);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json(413, { error: 'Request too large' }, cors);
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return json(400, { error: 'Invalid JSON' }, cors);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    const geminiMatch = path.match(/^\/gemini\/([a-zA-Z0-9.-]+)$/);
    if (geminiMatch) {
      return proxyGemini(geminiMatch[1], payload, env, cors);
    }

    if (path === '/openai/chat/completions') {
      return proxyOpenAi(payload, env, cors);
    }

    return json(404, { error: 'Not found' }, cors);
  },
};

async function proxyGemini(
  model: string,
  payload: Record<string, unknown>,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  if (!env.GEMINI_API_KEY) {
    return json(503, { error: 'Gemini 키가 이 프록시에 설정되어 있지 않습니다.' }, cors);
  }
  if (!ALLOWED_GEMINI_MODELS.has(model)) {
    return json(400, { error: `허용되지 않은 모델입니다: ${model}` }, cors);
  }
  if (countGeminiInputChars(payload) > MAX_INPUT_CHARS) {
    return json(413, { error: '입력이 너무 깁니다.' }, cors);
  }

  // Never let a caller run up the bill with a huge generation.
  const generationConfig = (payload.generationConfig ?? {}) as Record<string, unknown>;
  payload.generationConfig = {
    ...generationConfig,
    maxOutputTokens: Math.min(
      Number(generationConfig.maxOutputTokens) || MAX_OUTPUT_TOKENS,
      MAX_OUTPUT_TOKENS,
    ),
  };

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Header rather than a query string: keys do not belong in URLs.
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify(payload),
    },
  );

  return streamBack(upstream, cors);
}

async function proxyOpenAi(
  payload: Record<string, unknown>,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return json(503, { error: 'OpenAI 키가 이 프록시에 설정되어 있지 않습니다.' }, cors);
  }

  const model = String(payload.model ?? '');
  if (!ALLOWED_OPENAI_MODELS.has(model)) {
    return json(400, { error: `허용되지 않은 모델입니다: ${model}` }, cors);
  }
  if (countOpenAiInputChars(payload) > MAX_INPUT_CHARS) {
    return json(413, { error: '입력이 너무 깁니다.' }, cors);
  }

  payload.max_tokens = Math.min(Number(payload.max_tokens) || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS);

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  return streamBack(upstream, cors);
}

/**
 * Pipe the upstream response straight through. The body is an SSE stream and the
 * client renders it token by token, so it must not be buffered here.
 */
function streamBack(upstream: Response, cors: Record<string, string>): Response {
  const headers = new Headers(cors);
  headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'text/event-stream');
  headers.set('Cache-Control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, headers });
}
