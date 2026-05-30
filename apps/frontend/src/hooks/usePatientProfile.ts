'use client';
import { useCallback, useEffect, useState } from 'react';
import { patientService } from '@/services/patient.service';
import { useToast } from './useToast';
import { useAuth } from './useAuth';
import type { Profile } from '@/types';

export function usePatientProfile() {
  const { showToast } = useToast();
  const { setProfile: setAuthProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await patientService.getProfile();
      setProfile(p);
    } catch {
      /* silent — leaves profile null only on network error */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (data: Partial<Profile>) => {
      setIsSaving(true);
      try {
        const updated = await patientService.updateProfile(data);
        setProfile(updated);
        setAuthProfile(updated);
        showToast('Profile updated', 'success');
      } catch {
        showToast('Failed to update profile', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [showToast]
  );

  const isProfileComplete = !!(profile?.first_name && profile?.date_of_birth);

  return { profile, isLoading, isSaving, isProfileComplete, update };
}
