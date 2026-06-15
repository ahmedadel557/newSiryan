'use client';
import { Plus, MessageSquare, Sparkles, X } from 'lucide-react';
import type { ChatbotConversation } from '@/types';

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

function groupByTime(convs: ChatbotConversation[]) {
  const now = Date.now();
  const buckets: { label: string; items: ChatbotConversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 days', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const c of convs) {
    const age = now - new Date(c.last_message_at).getTime();
    if (age < 86_400_000) buckets[0].items.push(c);
    else if (age < 172_800_000) buckets[1].items.push(c);
    else if (age < 604_800_000) buckets[2].items.push(c);
    else buckets[3].items.push(c);
  }
  return buckets.filter((b) => b.items.length > 0);
}

interface Props {
  conversations: ChatbotConversation[];
  activeId?: string;
  onSelect: (c: ChatbotConversation) => void;
  onNew: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({ conversations, activeId, onSelect, onNew, isOpen, onClose }: Props) {
  const groups = groupByTime(conversations);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={[
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={[
          // Mobile: fixed overlay, slides in from left
          'fixed inset-y-0 left-0 z-50 w-72 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          // Desktop: part of flex flow, always visible
          'lg:relative lg:inset-auto lg:z-auto lg:w-64 lg:shrink-0 lg:translate-x-0',
          // Color & border
          'bg-[var(--bg-surface)] border-r border-[var(--border-1)]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-4 py-[14px] border-b border-[var(--border-1)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--forest-600) 0%, var(--iris-500) 100%)',
              }}
            >
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-[13.5px] text-[var(--fg-1)] leading-tight">
                Siryan AI
              </p>
              <p className="text-[10.5px] text-[var(--positive-soft-fg)] font-medium leading-tight">
                Health Assistant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-sunken)] transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* New conversation CTA */}
        <div className="p-3 shrink-0">
          <button
            onClick={() => {
              onNew();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all cursor-pointer active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, var(--forest-600) 0%, var(--forest-700, #1a3e35) 100%)',
              boxShadow: '0 2px 10px rgba(35,83,71,0.3)',
            }}
          >
            <Plus size={15} />
            New conversation
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-sunken)] flex items-center justify-center">
                <MessageSquare size={20} className="text-[var(--fg-4)]" />
              </div>
              <p className="text-[12px] text-[var(--fg-3)] leading-relaxed">
                No conversations yet.
                <br />
                Start a new chat above!
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-[var(--fg-4)] uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((conv) => {
                    const isActive = conv.id === activeId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => {
                          onSelect(conv);
                          onClose();
                        }}
                        className={[
                          'group text-start w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer',
                          isActive
                            ? 'bg-[var(--brand-soft-bg)]'
                            : 'hover:bg-[var(--bg-sunken)]',
                        ].join(' ')}
                      >
                        <MessageSquare
                          size={13}
                          className={`shrink-0 mt-[3px] transition-colors ${
                            isActive ? 'text-[var(--brand)]' : 'text-[var(--fg-4)] group-hover:text-[var(--fg-3)]'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[12.5px] font-medium truncate leading-snug ${
                              isActive ? 'text-[var(--brand-soft-fg)]' : 'text-[var(--fg-1)]'
                            }`}
                          >
                            {conv.preview || 'Conversation'}
                          </p>
                          <p className="text-[11px] text-[var(--fg-4)] mt-[3px]">
                            {formatRelativeTime(conv.last_message_at)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-1)] bg-[var(--bg-sunken)] shrink-0">
          <p className="text-[10.5px] text-[var(--fg-3)] leading-relaxed">
            General health info only — not a substitute for professional medical advice.
          </p>
        </div>
      </aside>
    </>
  );
}
