import { Sparkles } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.from === 'user';

  if (isUser) {
    return (
      <div className="flex gap-[10px] max-w-[88%] self-end">
        <div className="bg-[var(--brand)] text-white rounded-[14px] rounded-br-[4px] px-[14px] py-3 text-[14px] leading-[1.5]">{message.text}</div>
      </div>
    );
  }

  return (
    <div className="flex gap-[10px] max-w-[88%] self-start">
      <div className="w-7 h-7 rounded-[8px] bg-[var(--info-soft-bg)] text-[var(--info-soft-fg)] flex items-center justify-center shrink-0 mt-1">
        <Sparkles size={15} />
      </div>
      <div className="bg-[var(--sand-100)] text-[var(--fg-1)] dark:text-black rounded-[14px] rounded-bl-[4px] px-[14px] py-3 text-[14px] leading-[1.5]">
        {message.isLoading ? (
          <span className="flex gap-1 items-center py-[2px]">
            <span className="w-2 h-2 rounded-full bg-[var(--fg-3)] animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-[var(--fg-3)] animate-pulse [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-[var(--fg-3)] animate-pulse [animation-delay:300ms]" />
          </span>
        ) : (
          message.text
        )}
      </div>
    </div>
  );
}
