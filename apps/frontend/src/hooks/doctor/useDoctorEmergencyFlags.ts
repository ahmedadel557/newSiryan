'use client';
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';
import { useSocketEvent } from '@/hooks/shared';

export function useDoctorEmergencyFlags() {
  const queryClient = useQueryClient();
  const key = queryKeys.doctorEmergencyFlags();

  const { data, isPending, isError } = useQuery({
    queryKey: key,
    queryFn: () => doctorService.getDoctorEmergencyFlags(),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (flagId: string) => doctorService.acknowledgeFlag(flagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (vars: { flagId: string; notes?: string }) => doctorService.resolveFlag(vars.flagId, vars.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  useSocketEvent(
    'emergency:flag',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: key });
    }, [queryClient, key]),
  );

  const resolveFlag = useCallback(
    (flagId: string, notes?: string) => resolveMutation.mutate({ flagId, notes }),
    [resolveMutation],
  );

  return {
    flags: data?.flags ?? [],
    isLoading: isPending,
    isError,
    acknowledgeFlag: acknowledgeMutation.mutate,
    resolveFlag,
    saving: acknowledgeMutation.isPending || resolveMutation.isPending,
  };
}
