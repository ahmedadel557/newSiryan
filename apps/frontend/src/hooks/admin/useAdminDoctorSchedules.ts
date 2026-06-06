'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { scheduleService, type ScheduleEntryInput } from '@/services/schedule.service';
import { useToast } from '@/hooks/shared';

export function useAdminDoctorSchedules() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.adminDoctorSchedules(),
    queryFn: () => scheduleService.getDoctorSchedules(),
  });

  const upsertMutation = useMutation({
    mutationFn: ({
      doctorId,
      data,
    }: {
      doctorId: string;
      data: { entries?: ScheduleEntryInput[]; admin_controlled?: boolean };
    }) => scheduleService.upsertDoctorSchedule(doctorId, data),
    onSuccess: (_, { doctorId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.adminDoctorSchedules() });
      qc.invalidateQueries({ queryKey: queryKeys.adminDoctorSchedule(doctorId) });
      showToast('Doctor schedule saved', 'success');
    },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to save doctor schedule', 'error'),
  });

  return {
    schedules: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    upsertMutation,
  };
}

export function useAdminDoctorSchedule(doctorId: string) {
  const query = useQuery({
    queryKey: queryKeys.adminDoctorSchedule(doctorId),
    queryFn: () => scheduleService.getDoctorSchedule(doctorId),
    enabled: !!doctorId,
    retry: (count, err: any) => {
      if (err?.response?.status === 404) return false;
      return count < 2;
    },
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
  };
}
