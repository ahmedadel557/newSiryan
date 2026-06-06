'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { scheduleService, type ScheduleEntryInput } from '@/services/schedule.service';
import { useToast } from '@/hooks/shared';

export function useAdminDepartmentSchedule(department: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.adminDepartmentSchedule(department),
    queryFn: () => scheduleService.getDepartmentSchedule(department),
    enabled: !!department,
    retry: (count, err: any) => {
      if (err?.response?.status === 404) return false;
      return count < 2;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: (data: { entries: ScheduleEntryInput[] }) =>
      scheduleService.upsertDepartmentSchedule(department, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminDepartmentSchedule(department) });
      showToast('Department schedule saved', 'success');
    },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to save schedule', 'error'),
  });

  return {
    schedule: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    upsertMutation,
  };
}
