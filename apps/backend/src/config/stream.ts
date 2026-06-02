import { StreamClient } from '@stream-io/node-sdk';

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

export const STREAM_API_KEY = apiKey ?? '';
export const isStreamConfigured = Boolean(apiKey && apiSecret);

// Construct lazily-guarded so a missing config never crashes app startup —
// video endpoints surface a 503 instead (see getStreamClient).
const client: StreamClient | null = isStreamConfigured
  ? new StreamClient(apiKey as string, apiSecret as string)
  : null;

export function getStreamClient(): StreamClient {
  if (!client) {
    const err = Object.assign(new Error('Video service is not configured'), { status: 503 });
    throw err;
  }
  return client;
}
