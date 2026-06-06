'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { scheduleService } from '@/services/schedule.service';
import { useToast } from '@/hooks/shared';

export function useAdminBlockedDates(filters?: {
  scope?: 'department' | 'user';
  department?: string;
  user?: string;
}) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.adminBlockedDates(filters as Record<string, unknown>),
    queryFn: () => scheduleService.getBlockedDates(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      scope: 'department' | 'user';
      department?: string;
      user?: string;
      date: string;
      reason?: string;
    }) => scheduleService.createBlockedDate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blocked-dates'] });
      showToast('Date blocked', 'success');
    },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to block date', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduleService.deleteBlockedDate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blocked-dates'] });
      showToast('Block removed', 'success');
    },
    onError: () => showToast('Failed to remove block', 'error'),
  });

  return {
    blocks: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    createMutation,
    deleteMutation,
  };
}
