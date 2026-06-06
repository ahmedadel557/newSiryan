'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { scheduleService, type ShiftInput } from '@/services/schedule.service';
import { useToast } from '@/hooks/shared';

export function useAdminShifts() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.adminShifts(),
    queryFn: () => scheduleService.getShifts(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.adminShifts() });

  const createMutation = useMutation({
    mutationFn: (data: ShiftInput) => scheduleService.createShift(data),
    onSuccess: () => { invalidate(); showToast('Shift created', 'success'); },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to create shift', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShiftInput> }) =>
      scheduleService.updateShift(id, data),
    onSuccess: () => { invalidate(); showToast('Shift updated', 'success'); },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to update shift', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduleService.deleteShift(id),
    onSuccess: () => { invalidate(); showToast('Shift deactivated', 'success'); },
    onError: () => showToast('Failed to delete shift', 'error'),
  });

  return {
    shifts: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
