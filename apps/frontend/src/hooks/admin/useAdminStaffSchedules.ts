'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { scheduleService, type ScheduleEntryInput } from '@/services/schedule.service';
import { useToast } from '@/hooks/shared';

export function useAdminStaffSchedules(filters?: { department?: string; role?: string }) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.adminStaffSchedules(filters as Record<string, unknown>),
    queryFn: () => scheduleService.getStaffSchedules(filters),
  });

  const upsertMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: { entries?: ScheduleEntryInput[] };
    }) => scheduleService.upsertStaffSchedule(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'staff-schedules'] });
      showToast('Staff schedule saved', 'success');
    },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to save staff schedule', 'error'),
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (department: string) => scheduleService.applyDepartmentTemplate(department),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'staff-schedules'] });
      showToast(`Template applied to ${data.updated} staff member(s)`, 'success');
    },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to apply template', 'error'),
  });

  return {
    schedules: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    upsertMutation,
    applyTemplateMutation,
  };
}
