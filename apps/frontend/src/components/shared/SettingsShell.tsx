'use client';

import { useState } from 'react';
import { User, Bell, Palette, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppearanceSection } from './AppearanceSection';
import { SecuritySection } from './SecuritySection';
import { NotificationsSection } from './NotificationsSection';

type Tab = 'profile' | 'notifications' | 'appearance' | 'security';

const BASE_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={16} strokeWidth={1.75} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} strokeWidth={1.75} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} strokeWidth={1.75} /> },
  { id: 'security', label: 'Security', icon: <Lock size={16} strokeWidth={1.75} /> },
];

interface SettingsShellProps {
  profileSection: React.ReactNode;
  extraTabs?: { id: string; label: string; icon: React.ReactNode; content: React.ReactNode }[];
}

export function SettingsShell({ profileSection, extraTabs = [] }: SettingsShellProps) {
  const [activeTab, setActiveTab] = useState<string>('profile');

  const allTabs = [
    ...BASE_TABS,
    ...extraTabs.map((t) => ({ id: t.id as Tab, label: t.label, icon: t.icon })),
  ];

  const tabClass = (id: string) =>
    cn(
      'flex items-center gap-2 px-3 py-2.5 rounded-[8px] text-[13.5px] transition-colors w-full text-left',
      activeTab === id
        ? 'bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] font-medium'
        : 'text-[var(--fg-2)] hover:bg-[var(--bg-sunken)] hover:text-[var(--fg-1)]'
    );

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mb-6">Settings</h1>

      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <aside className="hidden md:flex flex-col gap-0.5 w-48 shrink-0">
          {allTabs.map((t) => (
            <button key={t.id} className={tabClass(t.id)} onClick={() => setActiveTab(t.id)}>
              <span className="shrink-0">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="md:hidden tab-scroll flex gap-2 pb-1">
            {allTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors',
                  activeTab === t.id
                    ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                    : 'bg-transparent text-[var(--fg-2)] border-[var(--border-1)]'
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-1)] p-5 sm:p-6">
            {activeTab === 'profile' && profileSection}
            {activeTab === 'notifications' && <NotificationsSection />}
            {activeTab === 'appearance' && <AppearanceSection />}
            {activeTab === 'security' && <SecuritySection />}
            {extraTabs.map((t) => activeTab === t.id && <div key={t.id}>{t.content}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
