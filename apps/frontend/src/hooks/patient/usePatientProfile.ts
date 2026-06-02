'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { patientService } from '@/services/patient.service';
import { useToast } from '@/hooks/shared';
import { useAuth } from '@/hooks/shared';
import type { Profile } from '@/types';

export function usePatientProfile() {
  const { showToast } = useToast();
  const { setProfile: setAuthProfile } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile = null, isPending } = useQuery({
    queryKey: queryKeys.patientProfile(),
    queryFn: () => patientService.getProfile(),
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Profile>) => patientService.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.patientProfile(), updated);
      setAuthProfile(updated);
      showToast('Profile updated', 'success');
    },
    onError: () => showToast('Failed to update profile', 'error'),
  });

  const isProfileComplete = !!(profile?.first_name && profile?.date_of_birth);

  return {
    profile,
    isLoading: isPending,
    isSaving: mutation.isPending,
    isProfileComplete,
    update: (data: Partial<Profile>) => mutation.mutateAsync(data),
  };
}
