'use client';
import { Sparkles } from 'lucide-react';
import { detectTextDirection } from '@/lib/textDirection';
import type { ChatbotMessage } from '@/types';

interface Props {
  message: ChatbotMessage;
}

export function ChatMessageBubble({ message }: Props) {
  const dir = detectTextDirection(message.content_text);
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex max-w-[80%] self-end">
        <div
          dir={dir}
          style={{
            textAlign: dir === 'rtl' ? 'right' : 'left',
            background: 'linear-gradient(135deg, var(--forest-600) 0%, var(--forest-700, #1a3e35) 100%)',
            boxShadow: '0 2px 10px rgba(35, 83, 71, 0.2)',
          }}
          className="text-white rounded-[18px] rounded-br-[5px] px-4 py-[10px] text-[14px] leading-[1.6] whitespace-pre-wrap break-words"
        >
          {message.content_text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 max-w-[88%] self-start">
      {/* AI avatar */}
      <div
        className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 mt-[3px]"
        style={{
          background: 'linear-gradient(135deg, var(--forest-600) 0%, var(--iris-500) 100%)',
        }}
      >
        <Sparkles size={13} className="text-white" />
      </div>

      {/* Bubble */}
      <div
        dir={dir}
        style={{
          textAlign: dir === 'rtl' ? 'right' : 'left',
          boxShadow: 'var(--shadow-xs)',
        }}
        className="bg-[var(--bg-surface)] border border-[var(--border-1)] text-[var(--fg-1)] rounded-[18px] rounded-bl-[5px] px-4 py-[10px] text-[14px] leading-[1.6] whitespace-pre-wrap break-words"
      >
        {message.isLoading ? <TypingDots /> : message.content_text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-[5px] items-center h-5">
      {([0, 150, 300] as const).map((delay) => (
        <span
          key={delay}
          className="w-[6px] h-[6px] rounded-full bg-[var(--fg-3)] animate-bounce [animation-duration:900ms]"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
