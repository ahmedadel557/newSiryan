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
}

// In-call-only chat over a Stream Chat 'messaging' channel keyed by the call id.
// Reuses the same Stream app + user token as the video call. Best-effort: any failure
// (e.g. Chat product not enabled) sets `error` but never throws into the call UI.
export function useInCallChat({ apiKey, userId, userName, token, callId, otherUserId }: UseInCallChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<StreamChat | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!apiKey || !token || !callId) return;
    let active = true;
    const client = StreamChat.getInstance(apiKey);

    const toMsg = (m: any): ChatMessage => ({
      id: m.id,
      text: m.text ?? '',
      senderId: m.user?.id ?? '',
      senderName: m.user?.name ?? m.user?.id ?? 'User',
      createdAt: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
    });

    (async () => {
      try {
        if (client.userID && client.userID !== userId) await client.disconnectUser();
        if (!client.userID) await client.connectUser({ id: userId, name: userName }, token);

        const members = otherUserId ? [userId, otherUserId] : undefined;
        const channel = client.channel('messaging', callId, members ? { members } : undefined);
        await channel.watch();
        if (!active) return;

        clientRef.current = client;
        channelRef.current = channel;
        setMessages((channel.state.messages ?? []).map(toMsg));
        channel.on('message.new', (ev: any) => {
          if (ev.message) setMessages((prev) => [...prev, toMsg(ev.message)]);
        });
        setIsConnecting(false);
      } catch {
        if (active) {
          setError('Chat is unavailable for this call.');
          setIsConnecting(false);
        }
      }
    })();

    return () => {
      active = false;
      try { channelRef.current?.off?.(); } catch { /* noop */ }
      clientRef.current?.disconnectUser?.().catch(() => {});
      clientRef.current = null;
      channelRef.current = null;
    };
  }, [apiKey, token, callId, userId, userName, otherUserId]);

  const sendMessage = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || !channelRef.current) return;
    try { await channelRef.current.sendMessage({ text: t }); } catch { /* surfaced via error elsewhere */ }
  }, []);

  return { messages, sendMessage, isConnecting, error };
}
