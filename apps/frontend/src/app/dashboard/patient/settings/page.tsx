'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useSettings } from '@/hooks/shared';
import { SettingsShell } from '@/components/shared/SettingsShell';
import { PatientProfileSection } from '@/components/shared/PatientProfileSection';

function AccountTab() {
  const router = useRouter();
  const { isSaving, deleteAccount } = useSettings();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const onDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    const ok = await deleteAccount({ password: deletePassword });
    if (ok) router.push('/auth/login');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Account</h2>
      <div className="border-2 border-[var(--critical)] rounded-[var(--radius-md)] p-5 space-y-4">
        <div>
          <p className="text-[14px] font-semibold text-[var(--critical)]">Danger zone</p>
          <p className="text-[12.5px] text-[var(--fg-2)] mt-1">
            Permanently deletes your account and all associated medical records. This cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setDeleteOpen(true)}
          className="h-9 px-4 rounded-[var(--radius-md)] bg-[var(--critical)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          Delete account
        </button>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-1)] p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-[16px] font-semibold text-[var(--fg-1)]">Delete account</h3>
            <p className="text-[13px] text-[var(--fg-2)]">
              This will permanently delete your account and all your medical records. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-[var(--border-1)] outline-none focus:border-[var(--critical)]"
            />
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-[var(--border-1)] outline-none focus:border-[var(--critical)]"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); setDeletePassword(''); }}
                className="h-9 px-4 rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--fg-2)] hover:bg-[var(--bg-sunken)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || !deletePassword || isSaving}
                className="h-9 px-4 rounded-[var(--radius-md)] bg-[var(--critical)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {isSaving ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientSettingsPage() {
  return (
    <SettingsShell
      profileSection={<PatientProfileSection />}
      extraTabs={[
        {
          id: 'account',
          label: 'Account',
          icon: <AlertTriangle size={16} strokeWidth={1.75} />,
          content: <AccountTab />,
        },
      ]}
    />
  );
}
