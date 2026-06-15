'use client';
import { useEffect, useRef } from 'react';
import { ChatMessageBubble } from './ChatMessageBubble';
import type { ChatbotMessage } from '@/types';

interface Props {
  messages: ChatbotMessage[];
  isLoading?: boolean;
}

function SkeletonBubble({ isUser }: { isUser: boolean }) {
  return (
    <div className={`flex max-w-[85%] ${isUser ? 'self-end' : 'self-start gap-[10px]'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-[9px] bg-[var(--bg-sunken)] shrink-0 mt-[2px] animate-pulse" />
      )}
      <div
        className={`rounded-[16px] animate-pulse bg-[var(--bg-sunken)] h-10 ${
          isUser ? 'w-36 rounded-br-[5px]' : 'w-52 rounded-bl-[5px]'
        }`}
      />
    </div>
  );
}

export function ChatMessageList({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full">
        <SkeletonBubble isUser={false} />
        <SkeletonBubble isUser={true} />
        <SkeletonBubble isUser={false} />
        <SkeletonBubble isUser={true} />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <p className="text-[13px] text-[var(--fg-3)] text-center leading-relaxed max-w-[260px]">
          Type a message below to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full">
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
