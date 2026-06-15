'use client';
import { useState } from 'react';
import { Sparkles, Plus, Menu } from 'lucide-react';
import { ChatMessageList } from '@/components/patient/chatbot/ChatMessageList';
import { ChatInput } from '@/components/patient/chatbot/ChatInput';
import { ChatSidebar } from '@/components/patient/chatbot/ChatSidebar';
import {
  useChatbotHistory,
  useSendChatbotMessage,
  useChatbotConversations,
} from '@/hooks/shared/useChatbot';
import type { ChatbotConversation } from '@/types';

const QUICK_SUGGESTIONS = [
  'What do my recent lab results mean?',
  'I have a headache — what could cause it?',
  'How can I improve my sleep quality?',
  'What should I know about my current medications?',
];

export default function AssistantPage() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: history = [], isLoading: historyLoading } = useChatbotHistory(conversationId);
  const { data: conversations = [] } = useChatbotConversations();
  const { mutate: sendMessage, isPending } = useSendChatbotMessage();

  const activeConversation = conversations.find((c) => c.id === conversationId);

  function handleSend(text: string, audio?: File) {
    const formData = new FormData();
    formData.append('text', text);
    if (conversationId) formData.append('conversation_id', conversationId);
    if (audio) formData.append('audio', audio);

    sendMessage(formData, {
      onSuccess: (data) => {
        if (!conversationId) setConversationId(data.conversation_id);
      },
    });
  }

  function handleSelectConversation(conv: ChatbotConversation) {
    setConversationId(conv.id);
  }

  function handleNewChat() {
    setConversationId(undefined);
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-[var(--bg-sunken)]">
      {/* ── Left sidebar ── */}
      <ChatSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main chat panel ── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[var(--bg-surface)]">
        {/* Header */}
        <ChatHeader
          activeConversation={activeConversation}
          onMenuOpen={() => setSidebarOpen(true)}
          onNewChat={handleNewChat}
        />

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {conversationId ? (
            <ChatMessageList
              messages={history}
              isLoading={historyLoading && !!conversationId}
            />
          ) : (
            <EmptyWelcome onSuggestion={handleSend} />
          )}
        </div>

        {/* Disclaimer */}
        <div className="px-4 py-2 border-t border-[var(--border-1)] shrink-0">
          <p className="text-[11px] text-[var(--fg-3)] text-center leading-relaxed">
            General health info only — not a substitute for professional medical advice.
          </p>
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} isPending={isPending} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   ChatHeader
───────────────────────────────────────────────────────────────────── */
function ChatHeader({
  activeConversation,
  onMenuOpen,
  onNewChat,
}: {
  activeConversation?: ChatbotConversation;
  onMenuOpen: () => void;
  onNewChat: () => void;
}) {
  function formatRelativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-1)] shrink-0 bg-[var(--bg-surface)]">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-1.5 rounded-lg text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-sunken)] transition-colors cursor-pointer shrink-0"
          aria-label="Open conversation history"
        >
          <Menu size={18} />
        </button>

        {/* Title */}
        {activeConversation ? (
          <div className="min-w-0">
            <p className="font-semibold text-[14px] text-[var(--fg-1)] truncate leading-tight max-w-[200px] sm:max-w-sm md:max-w-lg">
              {activeConversation.preview || 'Conversation'}
            </p>
            <p className="text-[11px] text-[var(--fg-3)] leading-tight mt-[2px]">
              {formatRelativeTime(activeConversation.last_message_at)}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div
              className="relative w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, var(--forest-600) 0%, var(--iris-500) 100%)',
              }}
            >
              <Sparkles size={16} className="text-white" />
              <span className="absolute -bottom-[3px] -right-[3px] w-[10px] h-[10px] rounded-full bg-[var(--positive)] border-2 border-[var(--bg-surface)]" />
            </div>
            <div>
              <p className="font-semibold text-[14px] text-[var(--fg-1)] leading-tight">
                Siryan Assistant
              </p>
              <p className="text-[11px] text-[var(--positive-soft-fg)] font-medium leading-tight mt-[1px]">
                Online · Ready to help
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New chat button */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-sunken)] rounded-lg transition-colors cursor-pointer shrink-0 ms-3"
        aria-label="Start new conversation"
      >
        <Plus size={13} />
        <span className="hidden sm:inline">New chat</span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   EmptyWelcome — shown when no conversation is active
───────────────────────────────────────────────────────────────────── */
function EmptyWelcome({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-5 py-8 gap-7">
      {/* Brand */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--forest-50, #f0f7f5) 0%, var(--iris-50, #f0efff) 100%)',
          }}
        >
          <div
            className="w-12 h-12 rounded-[15px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--forest-600) 0%, var(--iris-500) 100%)',
              boxShadow: '0 8px 24px rgba(35, 83, 71, 0.28)',
            }}
          >
            <Sparkles size={22} className="text-white" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[20px] font-bold text-[var(--fg-1)] tracking-tight">
            How can I help you today?
          </p>
          <p className="text-[13.5px] text-[var(--fg-3)] mt-1.5 leading-relaxed max-w-[340px]">
            Ask about symptoms, medications, lab results, or general health questions.
          </p>
        </div>
      </div>

      {/* Quick suggestions grid */}
      <div className="w-full max-w-xl">
        <p className="text-[10px] font-semibold text-[var(--fg-3)] uppercase tracking-[0.08em] mb-2.5 text-center">
          Try asking
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_SUGGESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onSuggestion(q)}
              className="group text-start px-4 py-3.5 rounded-xl border border-[var(--border-1)] bg-[var(--bg-surface)] hover:border-[var(--forest-300,#7ab5a8)] hover:bg-[var(--brand-soft-bg)] text-[13px] text-[var(--fg-2)] hover:text-[var(--brand-soft-fg)] transition-all cursor-pointer leading-snug shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
