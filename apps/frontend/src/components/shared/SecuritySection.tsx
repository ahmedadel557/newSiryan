'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/shared';

function PasswordStrength({ password }: { password: string }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  const colors = ['var(--critical)', 'var(--caution)', 'var(--positive)', 'var(--brand)'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i < score ? colors[score - 1] : 'var(--border-1)' }}
          />
        ))}
      </div>
      <p className="text-[11px]" style={{ color: score > 0 ? colors[score - 1] : 'var(--fg-3)' }}>
        {labels[score - 1] ?? ''}
      </p>
    </div>
  );
}

export function SecuritySection() {
  const { isSaving, changePassword } = useSettings();
  const pwForm = useForm<{ current: string; next: string; confirm: string }>();
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const nextPw = pwForm.watch('next') ?? '';

  const onSavePassword = pwForm.handleSubmit(async (data) => {
    const ok = await changePassword({
      current_password: data.current,
      new_password: data.next,
      confirm_password: data.confirm,
    });
    if (ok) pwForm.reset();
  });

  return (
    <form onSubmit={onSavePassword} className="space-y-5">
      <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Change Password</h2>

      {[
        { label: 'Current password', key: 'current' as const },
        { label: 'New password', key: 'next' as const },
        { label: 'Confirm new password', key: 'confirm' as const },
      ].map(({ label, key }) => (
        <div key={key}>
          <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">{label}</label>
          <div className="relative">
            <input
              type={showPw[key] ? 'text' : 'password'}
              {...pwForm.register(key, { required: true })}
              className="w-full dark:text-black/80 h-9 pl-3 pr-9 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-black/50 hover:text-black transition-colors"
            >
              {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {key === 'next' && <PasswordStrength password={nextPw} />}
        </div>
      ))}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
