// ADAPTER CONTRACT — adjust here if AI team's API differs
// Request:  POST AI_MODEL_API_URL
//   headers: Authorization: Bearer <AI_MODEL_API_KEY>
//   body:    { messages: { role: string; content: string }[], session_id?: string }
// Response: { reply?: string } | { content?: string } | { message?: string }
// Only the first non-empty string found across those three keys is used.

const AI_TIMEOUT_MS = 30_000;

async function doRequest(
  messages: { role: string; content: string }[],
  sessionId?: string,
): Promise<string> {
  const url = process.env.AI_MODEL_API_URL;
  const key = process.env.AI_MODEL_API_KEY;
  if (!url) throw new Error('AI_MODEL_API_URL is not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({ messages, session_id: sessionId }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw Object.assign(
      new Error(`AI model responded with HTTP ${res.status}`),
      { status: res.status },
    );
  }

  const data: any = await res.json();
  const reply = data?.reply ?? data?.content ?? data?.message;
  if (typeof reply !== 'string' || !reply.trim()) {
    throw new Error('AI model returned an unexpected response shape');
  }
  return reply;
}

export async function getChatCompletion(
  messages: { role: string; content: string }[],
  sessionId?: string,
): Promise<string> {
  try {
    return await doRequest(messages, sessionId);
  } catch (err: any) {
    // Retry once on network-level errors only (fetch failures, aborts — no HTTP response)
    if (err.name === 'AbortError' || err.cause || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.type === 'system') {
      return await doRequest(messages, sessionId);
    }
    throw err;
  }
}
