'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StreamChat } from 'stream-chat';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

interface UseInCallChatArgs {
  apiKey: string | null;
  userId: string;
  userName: string;
  token: string | null;
  callId: string | null;
  otherUserId?: string | null;
  // Optional silent-refresh provider (same one the video client uses). When given,
  // Stream Chat refreshes its token on the 1 h expiry so chat survives long calls.
  tokenProvider?: (() => Promise<string>) | null;
}

// In-call-only chat over a Stream Chat 'messaging' channel keyed by the call id.
// Reuses the same Stream app + user token as the video call. Best-effort: any failure
// (e.g. Chat product not enabled) sets `error` but never throws into the call UI.
export function useInCallChat({ apiKey, userId, userName, token, callId, otherUserId, tokenProvider }: UseInCallChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<StreamChat | null>(null);
  const channelRef = useRef<any>(null);
  // Store the unsubscribe function returned by channel.on() so we can cleanly
  // remove the listener without needing the original handler reference.
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // Holds the in-flight connect/watch promise. Cleanup awaits it before
  // disconnecting so we never call disconnectUser() while connectUser() is still
  // pending on the shared StreamChat singleton (the StrictMode double-mount race
  // that produced "WS connection rejected" / duplicate-listener churn).
  const setupPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!apiKey || !token || !callId) return;
    let active = true;

    const toMsg = (m: any): ChatMessage => ({
      id: m.id,
      text: m.text ?? '',
      senderId: m.user?.id ?? '',
      senderName: m.user?.name ?? m.user?.id ?? 'User',
      createdAt: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
    });

    const setup = (async () => {
      try {
        // Reuse a single StreamChat instance per apiKey (singleton). Only
        // (re-)connect if no user is connected or a different user is active.
        // Prefer the tokenProvider so the WS refreshes the token on the 1 h
        // expiry — without it, chat silently dies on consultations over an hour.
        const client = StreamChat.getInstance(apiKey);
        const credential = tokenProvider ?? token;
        if (client.userID && client.userID !== userId) await client.disconnectUser();
        if (!client.userID) await client.connectUser({ id: userId, name: userName }, credential);

        const members = otherUserId ? [userId, otherUserId] : undefined;
        const channel = client.channel('messaging', callId, members ? { members } : undefined);
        await channel.watch();
        if (!active) return;

        clientRef.current = client;
        channelRef.current = channel;
        setMessages((channel.state.messages ?? []).map(toMsg));

        // channel.on() returns { unsubscribe } — store it so cleanup can remove
        // exactly this listener without needing the handler reference.
        const { unsubscribe } = channel.on('message.new', (ev: any) => {
          if (ev.message) setMessages((prev) => [...prev, toMsg(ev.message)]);
        });
        unsubscribeRef.current = unsubscribe;

        setIsConnecting(false);
      } catch {
        if (active) {
          setError('Chat is unavailable for this call.');
          setIsConnecting(false);
        }
      }
    })();
    setupPromiseRef.current = setup;

    return () => {
      active = false;
      // Remove the listener and disconnect when the hook tears down (call ends).
      // Because useInCallChat is called at VideoCallLayout level (always mounted for
      // the full call), this cleanup only fires when the user leaves the call page.
      // Await the in-flight setup first so we never disconnect mid-connect.
      const teardown = async () => {
        try { await setupPromiseRef.current; } catch { /* noop */ }
        try { unsubscribeRef.current?.(); } catch { /* noop */ }
        unsubscribeRef.current = null;
        await clientRef.current?.disconnectUser?.().catch(() => {});
        clientRef.current = null;
        channelRef.current = null;
      };
      void teardown();
    };
  }, [apiKey, token, callId, userId, userName, otherUserId, tokenProvider]);

  const sendMessage = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || !channelRef.current) return;
    try { await channelRef.current.sendMessage({ text: t }); } catch { /* surfaced via error elsewhere */ }
  }, []);

  return { messages, sendMessage, isConnecting, error };
}
