'use client';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { labService } from '@/services/lab.service';
import { useToast, usePagination } from '@/hooks/shared';
import type { LabOrder, LabResultsDto, OrderStatus, PaginatedResponse } from '@/types';

export function useLab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { page, limit, goToPage } = usePagination();
  const [uploadOrderId, setUploadOrderId] = useState<string | null>(null);

  const { data: ordersData, isPending: isLoading } = useQuery({
    queryKey: queryKeys.labOrders({ page, limit }),
    queryFn: () => labService.getOrders({ page, limit }),
  });

  const allOrders = ordersData?.items ?? [];

  const submitResultsMutation = useMutation({
    mutationFn: (vars: { id: string; data: LabResultsDto }) => labService.submitResults(vars.id, vars.data),
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedResponse<LabOrder> | undefined>(
        queryKeys.labOrders({ page, limit }),
        (prev) => prev ? { ...prev, items: prev.items.map((o) => (o.id === updated.id ? updated : o)) } : prev,
      );
      showToast('Results submitted', 'success');
      setUploadOrderId(null);
    },
    onError: () => showToast('Failed to submit results', 'error'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) => labService.updateOrderStatus(vars.id, vars.status),
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedResponse<LabOrder> | undefined>(
        queryKeys.labOrders({ page, limit }),
        (prev) => prev ? { ...prev, items: prev.items.map((o) => (o.id === updated.id ? updated : o)) } : prev,
      );
      showToast('Order updated', 'success');
    },
    onError: () => showToast('Failed to update order', 'error'),
  });

  const submitResults = useCallback(
    (id: string, data: LabResultsDto) => submitResultsMutation.mutateAsync({ id, data }),
    [submitResultsMutation],
  );

  const updateStatus = useCallback(
    (id: string, status: OrderStatus) => updateStatusMutation.mutateAsync({ id, status }),
    [updateStatusMutation],
  );

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const pending = useMemo(() => allOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled'), [allOrders]);
  const completed = useMemo(() => allOrders.filter((o) => o.status === 'completed'), [allOrders]);

  const recentOrders = useMemo(
    () =>
      [...allOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [allOrders],
  );

  const stats = useMemo(
    () => ({
      pending: pending.length,
      urgent: pending.filter((o) => o.priority !== 'routine').length,
      ready: pending.filter((o) => o.status === 'in_progress').length,
      completedToday: completed.filter((o) => o.completed_at?.slice(0, 10) === today).length,
      completedThisWeek: completed.filter((o) => (o.completed_at ?? '') >= weekStart).length,
    }),
    [pending, completed, today, weekStart],
  );

  return {
    allOrders,
    page,
    totalPages: ordersData?.totalPages ?? 1,
    goToPage,
    pending,
    completed,
    recentOrders,
    isLoading,
    uploadOrderId,
    setUploadOrderId,
    submitResults,
    updateStatus,
    stats,
  };
}
