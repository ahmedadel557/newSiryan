'use client';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { radiologyService } from '@/services/radiology.service';
import { useToast, usePagination } from '@/hooks/shared';
import type { RadiologyOrder, RadiologyFindingsDto, OrderStatus, PaginatedResponse } from '@/types';

export function useRadiology() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { page, limit, goToPage } = usePagination();
  const [uploadOrderId, setUploadOrderId] = useState<string | null>(null);

  const { data: ordersData, isPending: isLoading } = useQuery({
    queryKey: queryKeys.radiologyOrders({ page, limit }),
    queryFn: () => radiologyService.getOrders({ page, limit }),
  });

  const allOrders = ordersData?.items ?? [];

  const submitFindingsMutation = useMutation({
    mutationFn: (vars: { id: string; data: RadiologyFindingsDto }) => radiologyService.submitResults(vars.id, vars.data),
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedResponse<RadiologyOrder> | undefined>(
        queryKeys.radiologyOrders({ page, limit }),
        (prev) => prev ? { ...prev, items: prev.items.map((o) => (o.id === updated.id ? updated : o)) } : prev,
      );
      showToast('Findings submitted', 'success');
      setUploadOrderId(null);
    },
    onError: () => showToast('Failed to submit findings', 'error'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) => radiologyService.updateOrderStatus(vars.id, vars.status),
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedResponse<RadiologyOrder> | undefined>(
        queryKeys.radiologyOrders({ page, limit }),
        (prev) => prev ? { ...prev, items: prev.items.map((o) => (o.id === updated.id ? updated : o)) } : prev,
      );
      showToast('Order updated', 'success');
    },
    onError: () => showToast('Failed to update order', 'error'),
  });

  const submitFindings = useCallback(
    (id: string, data: RadiologyFindingsDto) => submitFindingsMutation.mutateAsync({ id, data }),
    [submitFindingsMutation],
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
      ordersToday: allOrders.filter((o) => o.created_at.slice(0, 10) === today).length,
      awaitingScan: pending.filter((o) => o.status === 'pending').length,
      awaitingUpload: pending.filter((o) => o.status === 'in_progress').length,
      uploadedToday: completed.filter((o) => o.completed_at?.slice(0, 10) === today).length,
      completedThisWeek: completed.filter((o) => (o.completed_at ?? '') >= weekStart).length,
    }),
    [allOrders, pending, completed, today, weekStart],
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
    submitFindings,
    updateStatus,
    stats,
  };
}
