/**
 * Server-Sent Events reader that buffers across network chunk boundaries.
 *
 * A `ReadableStream` read can split a single `data: {...}` line in half. Parsing
 * each raw chunk independently (the previous approach) silently dropped those
 * payloads inside an empty catch block, so long translations lost tokens.
 * Here we keep the trailing partial line in a buffer until its newline arrives.
 */
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (payload: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const abortHandler = () => {
    reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', abortHandler, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on newlines; the last element is a possibly-incomplete line.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        onEvent(payload);
      }
    }

    // Flush whatever the stream ended on without a trailing newline.
    buffer += decoder.decode();
    const tail = buffer.trim();
    if (tail.startsWith('data:')) {
      const payload = tail.slice(5).trim();
      if (payload && payload !== '[DONE]') onEvent(payload);
    }
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    reader.releaseLock();
  }
}
