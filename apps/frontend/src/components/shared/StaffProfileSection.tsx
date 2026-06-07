'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AvatarUpload } from '@/components/shared/AvatarUpload';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/shared';
import { useToast } from '@/hooks/shared';
import { staffService } from '@/services/staff.service';
import type { Profile } from '@/types';

export function StaffProfileSection() {
  const { user, profile: authProfile, setProfile: setAuthProfile } = useAuth();
  const { showToast } = useToast();

  const [staffProfile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!user?.role || user.role === 'patient') return;
    staffService
      .getProfile(user.role)
      .then(setProfile)
      .catch(() => {})
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

  return (
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
            onUpload={(url) => setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev))}
            onDelete={() => setProfile((prev) => (prev ? { ...prev, avatar_url: '' } : prev))}
          />
        )}
        <p className="text-[12px] text-[var(--fg-3)]">Click to change photo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['first_name', 'last_name'] as const).map((key) => (
          <div key={key}>
            <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">
              {key === 'first_name' ? 'First name' : 'Last name'}
            </label>
            <input
              {...register(key)}
              className="w-full dark:text-black/80 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Email</label>
        <input
          value={user?.email ?? ''}
          disabled
          className="w-full dark:text-black/80 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-3)] border border-transparent outline-none cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Phone</label>
        <input
          {...register('phone')}
          className="w-full dark:text-black/80 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Bio</label>
        <textarea
          {...register('bio')}
          rows={3}
          className="w-full dark:text-black/80 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-1)] border border-transparent focus:border-[var(--brand)] outline-none resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Department</label>
          <input
            value={staffProfile?.department ?? '—'}
            disabled
            className="w-full dark:text-black/80 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-3)] border border-transparent outline-none cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--fg-2)] mb-1">Specialization</label>
          <input
            value={staffProfile?.specialization ?? '—'}
            disabled
            className="w-full dark:text-black/80 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--sand-100)] text-[13px] text-[var(--fg-3)] border border-transparent outline-none cursor-not-allowed"
          />
        </div>
      </div>

      <Button type="submit" disabled={profileSaving}>
        {profileSaving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
