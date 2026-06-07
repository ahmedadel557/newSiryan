'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import type { ChatMessage } from '@/hooks/shared';

interface InCallChatProps {
  userId: string;
  chat: {
    messages: ChatMessage[];
    sendMessage: (text: string) => Promise<void>;
    isConnecting: boolean;
    error: string | null;
  };
  onClose: () => void;
}

export function InCallChat({ userId, chat, onClose }: InCallChatProps) {
  const { messages, sendMessage, isConnecting, error } = chat;
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const t = draft.trim();
    if (!t) return;
    sendMessage(t);
    setDraft('');
  };

  return (
    <aside
      className="absolute right-0 top-0 z-30 flex h-full w-full flex-col border-l md:w-[340px]"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-1)' }}
    >
      <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--border-1)' }}>
        <p className="flex-1 text-[14px] font-semibold text-[var(--fg-1)]">In-call chat</p>
        <button onClick={onClose} className="btn-ghost p-1" aria-label="Close chat">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {isConnecting ? (
          <p className="text-[13px] text-[var(--fg-3)]">Connecting chat…</p>
        ) : error ? (
          <p className="text-[13px]" style={{ color: 'var(--critical-soft-fg)' }}>{error}</p>
        ) : messages.length === 0 ? (
          <p className="text-[13px] text-[var(--fg-3)]">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const own = m.senderId === userId;
            return (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-[var(--radius-md)] px-3 py-2 ${own ? 'self-end' : 'self-start'}`}
                style={{ background: own ? 'var(--brand)' : 'var(--bg-sunken)', color: own ? 'var(--fg-on-brand)' : 'var(--fg-1)' }}
              >
                {!own && <p className="mb-[2px] text-[11px] font-medium opacity-70">{m.senderName}</p>}
                <p className="whitespace-pre-wrap break-words text-[13px]">{m.text}</p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3" style={{ borderColor: 'var(--border-1)' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 resize-none rounded-[var(--radius-md)] border px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          style={{ borderColor: 'var(--border-1)', background: 'var(--bg-surface)' }}
        />
        <button onClick={handleSend} className="btn btn-primary inline-flex h-9 w-9 items-center justify-center p-0" aria-label="Send message">
          <Send size={16} />
        </button>
      </div>
    </aside>
  );
}
