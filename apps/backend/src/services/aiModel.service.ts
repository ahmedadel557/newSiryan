import axios from 'axios';

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

  const { data } = await axios.post(
    url,
    { messages, session_id: sessionId },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      timeout: AI_TIMEOUT_MS,
    },
  );

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
    // Retry once on network-level errors only (no HTTP response received)
    if (err.code && !err.response) {
      return await doRequest(messages, sessionId);
    }
    throw err;
  }
}
