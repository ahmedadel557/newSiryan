'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { User, Bell, Palette, Lock, AlertTriangle, Eye, EyeOff, Sun, Moon, Monitor } from 'lucide-react';
import { AvatarUpload } from '@/components/shared/AvatarUpload';
import { TagInput } from '@/components/ui/TagInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePatientProfile } from '@/hooks/patient';
import { useSettings } from '@/hooks/shared';
import { useAuth } from '@/hooks/shared';
import { patientService } from '@/services/patient.service';
import { cn } from '@/lib/utils';
import type { InsuranceCompany } from '@/types';

type Tab = 'profile' | 'notifications' | 'appearance' | 'security' | 'account';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={16} strokeWidth={1.75} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} strokeWidth={1.75} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} strokeWidth={1.75} /> },
  { id: 'security', label: 'Security', icon: <Lock size={16} strokeWidth={1.75} /> },
  { id: 'account', label: 'Account', icon: <AlertTriangle size={16} strokeWidth={1.75} /> },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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

export default function PatientSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);

  useEffect(() => {
    patientService.getInsuranceCompanies().then(setInsuranceCompanies).catch(() => {});
  }, []);
  const { profile, isLoading: profileLoading, isSaving: profileSaving, update } = usePatientProfile();
  const {
    settings,
    isLoading: settingsLoading,
    isSaving: settingsSaving,
    changePassword,
    updateNotifications,
    updateAppearance,
    deleteAccount,
  } = useSettings();
  const { user, profile: authProfile, setProfile: setAuthProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Local tag arrays kept in sync with profile
  const [allergies, setAllergies] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  useEffect(() => {
    if (profile?.allergies) setAllergies(profile.allergies);
    if (profile?.chronic_conditions) setChronicConditions(profile.chronic_conditions);
  }, [profile?.allergies, profile?.chronic_conditions]);

  // Profile form
  const { register, handleSubmit } = useForm({
    values: profile
      ? {
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          phone: profile.phone ?? '',
          date_of_birth: profile.date_of_birth?.slice(0, 10) ?? '',
          gender: profile.gender ?? '',
          blood_type: profile.blood_type ?? '',
          address: profile.address ?? '',
          allergies: profile.allergies ?? [],
          chronic_conditions: profile.chronic_conditions ?? [],
          insurance_provider: profile.insurance_provider ?? '',
          insurance_number: profile.insurance_number ?? '',
        }
      : undefined,
  });

  // Password form
  const pwForm = useForm<{ current: string; next: string; confirm: string }>();
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const nextPw = pwForm.watch('next') ?? '';

  // Notification toggles (local state initialised from settings)
  const [notifs, setNotifs] = useState<Record<string, boolean> | null>(null);
  if (settings && !notifs) setNotifs({ ...settings.notifications });

  // Delete account dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const onSaveProfile = handleSubmit(async (data) => {
    await update({ ...data, allergies, chronic_conditions: chronicConditions } as any);
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

  const onSaveLanguage = async (lang: 'en' | 'ar') => {
    await updateAppearance({ language: lang });
  };

  const onDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    const ok = await deleteAccount({ password: deletePassword });
    if (ok) router.push('/auth/login');
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
        {/* Sidebar tabs */}
        <aside className="hidden md:flex flex-col gap-0.5 w-48 shrink-0">
          {tabs.map((t) => (
            <button key={t.id} className={tabClass(t.id)} onClick={() => setActiveTab(t.id)}>
              <span className="shrink-0">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </aside>

        {/* Mobile pill row */}
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

        {/* Content panel */}
        <div className="flex-1 min-w-0 bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-1)] p-6">
          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <form onSubmit={onSaveProfile} className="space-y-6">
              <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Profile Information</h2>

              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                {profileLoading ? (
                  <Skeleton className="w-24 h-24 rounded-full" />
                ) : (
                  <AvatarUpload
                    size="lg"
                    currentUrl={authProfile?.avatar_url}
                    name={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || user?.username || '?'}
                    onUpload={() => {}}
                    onDelete={() => {}}
                  />
                )}
                <p className="text-[12px] text-[var(--fg-3)]">Click to change photo</p>
              </div>

              {/* Name */}
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

              {/* Email (disabled) */}
              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Email</label>
                <input
                  value={user?.email ?? ''}
                  disabled
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-3)] border border-transparent outline-none cursor-not-allowed"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Phone</label>
                <input
                  {...register('phone')}
                  placeholder="01XXXXXXXXX"
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                />
              </div>

              {/* DOB + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Date of birth</label>
                  <input
                    type="date"
                    {...register('date_of_birth')}
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Gender</label>
                  <select
                    {...register('gender')}
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {/* Blood type */}
              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Blood type</label>
                <select
                  {...register('blood_type')}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                >
                  <option value="">Select</option>
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Allergies</label>
                <TagInput value={allergies} onChange={setAllergies} />
              </div>

              {/* Chronic conditions */}
              <div>
                <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Chronic conditions</label>
                <TagInput value={chronicConditions} onChange={setChronicConditions} />
              </div>

              {/* Insurance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Insurance provider</label>
                  <select
                    {...register('insurance_provider')}
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
                  >
                    <option value="">No insurance</option>
                    {insuranceCompanies.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.discount_percentage}% discount)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Insurance number</label>
                  <input
                    {...register('insurance_number')}
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
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
                      ['lab_results', 'Lab results ready', 'When your lab results are available'],
                      ['pharmacy', 'Pharmacy order updates', 'Shipping and order status for pharmacy items'],
                      ['emergency', 'Emergency alerts', 'Critical health alerts from your care team'],
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
                      onClick={() => onSaveLanguage(l.value)}
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
                { id: 'current', label: 'Current password', key: 'current' as const },
                { id: 'next', label: 'New password', key: 'next' as const },
                { id: 'confirm', label: 'Confirm new password', key: 'confirm' as const },
              ].map(({ id, label, key }) => (
                <div key={id}>
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

          {/* ── ACCOUNT ── */}
          {activeTab === 'account' && (
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
            </div>
          )}
        </div>
      </div>

      {/* Delete account dialog */}
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
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirm('');
                  setDeletePassword('');
                }}
                className="h-9 px-4 rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--fg-2)] hover:bg-[var(--sand-100)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || !deletePassword || settingsSaving}
                className="h-9 px-4 rounded-[var(--radius-md)] bg-[var(--critical)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {settingsSaving ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
