'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSettings } from '@/hooks/shared';

const NOTIF_ITEMS: [string, string, string][] = [
  ['appointments', 'Appointment reminders', 'Get notified about upcoming appointments'],
  ['prescriptions', 'Prescription updates', 'When prescriptions are ready or updated'],
  ['lab_results', 'Lab results ready', 'When lab results are available'],
  ['pharmacy', 'Pharmacy order updates', 'Order status updates'],
  ['emergency', 'Emergency alerts', 'Critical alerts from the system'],
  ['system', 'System announcements', 'News and updates from Siryan'],
];

export function NotificationsSection() {
  const { settings, isLoading, isSaving, updateNotifications } = useSettings();
  const [notifs, setNotifs] = useState<Record<string, boolean> | null>(null);
  if (settings && !notifs) setNotifs({ ...settings.notifications });

  const onSave = async () => {
    if (!notifs) return;
    await updateNotifications(notifs as any);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Notification Preferences</h2>
      {isLoading || !notifs ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <>
          {NOTIF_ITEMS.map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-[var(--border-1)] last:border-0">
              <div>
                <p className="text-[13.5px] font-medium text-[var(--fg-1)]">{label}</p>
                <p className="text-[12px] text-[var(--fg-3)] mt-0.5">{desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={notifs[key]}
                onClick={() => setNotifs((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev))}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
                  notifs[key] ? 'bg-[var(--brand)]' : 'bg-[var(--border-1)]'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5',
                    notifs[key] ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          ))}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="mt-2 h-9 px-5 rounded-[var(--radius-md)] bg-[var(--brand)] text-white text-[13px] font-medium hover:bg-[var(--brand-hover)] disabled:opacity-60 transition-colors"
          >
            {isSaving ? 'Saving…' : 'Save preferences'}
          </button>
        </>
      )}
    </div>
  );
}
