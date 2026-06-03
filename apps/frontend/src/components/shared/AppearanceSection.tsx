'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/shared';

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { settings, updateAppearance } = useSettings();

  return (
    <div className="space-y-6">
      <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Appearance</h2>

      <div>
        <p className="text-[13px] font-medium text-[var(--fg-1)] mb-3">Theme</p>
        <div className="flex gap-3">
          {(
            [
              { value: 'light', label: 'Light', icon: <Sun size={18} strokeWidth={1.75} /> },
              { value: 'dark', label: 'Dark', icon: <Moon size={18} strokeWidth={1.75} /> },
              { value: 'system', label: 'System', icon: <Monitor size={18} strokeWidth={1.75} /> },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border-2 transition-colors flex-1',
                theme === t.value ? 'border-[var(--brand)] bg-[var(--brand-soft-bg)]' : 'border-[var(--border-1)] hover:border-[var(--fg-3)]'
              )}
            >
              <span className={theme === t.value ? 'text-[var(--brand)]' : 'text-[var(--fg-2)]'}>{t.icon}</span>
              <span className={cn('text-[12.5px] font-medium', theme === t.value ? 'text-[var(--brand-soft-fg)]' : 'text-[var(--fg-2)]')}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium text-[var(--fg-1)] mb-3">Language</p>
        <div className="flex gap-2">
          {[
            { value: 'en' as const, label: 'English' },
            { value: 'ar' as const, label: 'العربية' },
          ].map((l) => (
            <button
              key={l.value}
              onClick={() => updateAppearance({ language: l.value })}
              className={cn(
                'px-4 py-2 rounded-full text-[13px] font-medium border-2 transition-colors',
                settings?.appearance.language === l.value
                  ? 'border-[var(--brand)] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)]'
                  : 'border-[var(--border-1)] text-[var(--fg-2)] hover:border-[var(--fg-3)]'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-[var(--fg-3)] mt-2">Full interface translation coming soon.</p>
      </div>
    </div>
  );
}
