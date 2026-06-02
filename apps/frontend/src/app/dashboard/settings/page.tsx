'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTheme } from 'next-themes';
import { User, Bell, Palette, Lock, Eye, EyeOff, Sun, Moon, Monitor } from 'lucide-react';
import { AvatarUpload } from '@/components/shared/AvatarUpload';
import { Skeleton } from '@/components/ui/Skeleton';
import { StaffShell } from '@/components/layouts/StaffShell';
import { useAuth } from '@/hooks/shared';
import { useSettings } from '@/hooks/shared';
import { staffService } from '@/services/staff.service';
import { useToast } from '@/hooks/shared';
import { roleNavMap } from '@/config/navItems';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';

type Tab = 'profile' | 'notifications' | 'appearance' | 'security';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={16} strokeWidth={1.75} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} strokeWidth={1.75} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} strokeWidth={1.75} /> },
  { id: 'security', label: 'Security', icon: <Lock size={16} strokeWidth={1.75} /> },
];

function PasswordStrength({ password }: { password: string }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  const colors = ['var(--critical)', 'var(--warning, #f59e0b)', '#84cc16', 'var(--brand)'];
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

function StaffSettingsContent() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { user, profile: authProfile, setProfile: setAuthProfile } = useAuth();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { settings, isLoading: settingsLoading, isSaving: settingsSaving, changePassword, updateNotifications, updateAppearance } = useSettings();

  const [staffProfile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!user?.role || user.role === 'patient') return;
    staffService
      .getProfile(user.role)
      .then(setProfile)
      .catch(() => {
        /* silent */
      })
      .finally(() => setProfileLoading(false));
  }, [user?.role]);

  const { register, handleSubmit } = useForm({
    values: staffProfile
      ? {
          first_name: staffProfile.first_name ?? '',
          last_name: staffProfile.last_name ?? '',
          phone: staffProfile.phone ?? '',
          bio: staffProfile.bio ?? '',
        }
      : undefined,
  });

  const pwForm = useForm<{ current: string; next: string; confirm: string }>();
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const nextPw = pwForm.watch('next') ?? '';

  const [notifs, setNotifs] = useState<Record<string, boolean> | null>(null);
  if (settings && !notifs) setNotifs({ ...settings.notifications });

  const onSaveProfile = handleSubmit(async (data) => {
    if (!user?.role) return;
    setProfileSaving(true);
    try {
      const updated = await staffService.updateProfile(user.role, data as Partial<Profile>);
      setProfile(updated);
      if (authProfile) setAuthProfile({ ...authProfile, ...updated });
      showToast('Profile updated', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  });

  const onSavePassword = pwForm.handleSubmit(async (data) => {
    const ok = await changePassword({
      current_password: data.current,
      new_password: data.next,
      confirm_password: data.confirm,
    });
    if (ok) pwForm.reset();
  });

  const onSaveNotifs = async () => {
    if (!notifs) return;
    await updateNotifications(notifs as any);
  };

  const tabClass = (id: Tab) =>
    cn(
      'flex items-center gap-2 px-3 py-2.5 rounded-[8px] text-[13.5px] transition-colors w-full text-left',
      activeTab === id
        ? 'bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] font-medium'
        : 'text-[var(--fg-2)] hover:bg-[var(--sand-100)] hover:text-[var(--fg-1)]'
    );

  return (
    <div className="max-w-[960px]">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mb-6">Settings</h1>

      <div className="flex gap-6">
        <aside className="hidden md:flex flex-col gap-0.5 w-48 shrink-0">
          {tabs.map((t) => (
            <button key={t.id} className={tabClass(t.id)} onClick={() => setActiveTab(t.id)}>
              <span className="shrink-0">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </aside>

        <div className="md:hidden mb-4 -mx-4 px-4 tab-scroll flex gap-2 pb-1">
          {tabs.map((t) => (
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

        <div className="flex-1 min-w-0 bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-1)] p-6">
          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <form onSubmit={onSaveProfile} className="space-y-6">
              <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Profile Information</h2>

              <div className="flex flex-col items-center gap-2">
                {profileLoading ? (
                  <Skeleton className="w-24 h-24 rounded-full" />
                ) : (
                  <AvatarUpload
                    size="lg"
                    currentUrl={authProfile?.avatar_url}
                    name={`${staffProfile?.first_name ?? ''} ${staffProfile?.last_name ?? ''}`.trim() || user?.username || '?'}
                    onUpload={(url) => {
                      setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
                    }}
                    onDelete={() => {
                      setProfile((prev) => (prev ? { ...prev, avatar_url: '' } : prev));
                    }}
                  />
                )}
                <p className="text-[12px] text-[var(--fg-3)]">Click to change photo</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">First name</label>
                  <input
                    {...register('first_name')}
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Last name</label>
                  <input
                    {...register('last_name')}
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Email</label>
                <input
                  value={user?.email ?? ''}
                  disabled
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-3)] border border-transparent outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Phone</label>
                <input
                  {...register('phone')}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Bio</label>
                <textarea
                  {...register('bio')}
                  rows={3}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Department</label>
                  <input
                    value={staffProfile?.department ?? '—'}
                    disabled
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-3)] border border-transparent outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Specialization</label>
                  <input
                    value={staffProfile?.specialization ?? '—'}
                    disabled
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-3)] border border-transparent outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="h-9 px-5 rounded-[var(--radius-md)] bg-[var(--brand)] text-white text-[13px] font-medium hover:bg-[var(--brand-hover)] disabled:opacity-60 transition-colors"
              >
                {profileSaving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Notification Preferences</h2>
              {settingsLoading || !notifs ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {(
                    [
                      ['appointments', 'Appointment reminders', 'Get notified about upcoming appointments'],
                      ['prescriptions', 'Prescription updates', 'When prescriptions are ready or updated'],
                      ['lab_results', 'Lab results ready', 'When lab results are available'],
                      ['pharmacy', 'Pharmacy order updates', 'Order status updates'],
                      ['emergency', 'Emergency alerts', 'Critical alerts from the system'],
                      ['system', 'System announcements', 'News and updates from Siryan'],
                    ] as [string, string, string][]
                  ).map(([key, label, desc]) => (
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
                    onClick={onSaveNotifs}
                    disabled={settingsSaving}
                    className="mt-2 h-9 px-5 rounded-[var(--radius-md)] bg-[var(--brand)] text-white text-[13px] font-medium hover:bg-[var(--brand-hover)] disabled:opacity-60 transition-colors"
                  >
                    {settingsSaving ? 'Saving…' : 'Save preferences'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {activeTab === 'appearance' && (
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
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
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
                      className="w-full h-9 pl-3 pr-9 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-3)] hover:text-[var(--fg-1)]"
                    >
                      {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {key === 'next' && <PasswordStrength password={nextPw} />}
                </div>
              ))}

              <button
                type="submit"
                disabled={settingsSaving}
                className="h-9 px-5 rounded-[var(--radius-md)] bg-[var(--brand)] text-white text-[13px] font-medium hover:bg-[var(--brand-hover)] disabled:opacity-60 transition-colors"
              >
                {settingsSaving ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StaffSettingsPage() {
  const { user } = useAuth();
  const navItems = user ? (roleNavMap[user.role] ?? []) : [];

  return (
    <StaffShell navItems={navItems} pageTitle="Settings">
      <StaffSettingsContent />
    </StaffShell>
  );
}
