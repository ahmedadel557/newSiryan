'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { labService } from '@/services/lab.service';
import { useToast } from './useToast';
import type { LabOrder, LabResultsDto, OrderStatus } from '@/types';

export function useLab() {
  const { showToast } = useToast();
  const [allOrders, setAllOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadOrderId, setUploadOrderId] = useState<string | null>(null);

  useEffect(() => {
    labService
      .getOrders()
      .then(setAllOrders)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const submitResults = useCallback(
    async (id: string, data: LabResultsDto) => {
      try {
        const updated = await labService.submitResults(id, data);
        setAllOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
        showToast('Results submitted', 'success');
        setUploadOrderId(null);
      } catch {
        showToast('Failed to submit results', 'error');
      }
    },
    [showToast]
  );

  const updateStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      try {
        const updated = await labService.updateOrderStatus(id, status);
        setAllOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
        showToast('Order updated', 'success');
      } catch {
        showToast('Failed to update order', 'error');
      }
    },
    [showToast]
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
    [allOrders]
  );

  const stats = useMemo(
    () => ({
      pending: pending.length,
      urgent: pending.filter((o) => o.priority !== 'routine').length,
      ready: pending.filter((o) => o.status === 'in_progress').length,
      completedToday: completed.filter((o) => o.completed_at?.slice(0, 10) === today).length,
      completedThisWeek: completed.filter((o) => (o.completed_at ?? '') >= weekStart).length,
    }),
    [pending, completed, today, weekStart]
  );

  return {
    allOrders,
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
