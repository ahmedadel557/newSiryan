'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { radiologyService } from '@/services/radiology.service';
import { useToast } from './useToast';
import type { RadiologyOrder, RadiologyFindingsDto, OrderStatus } from '@/types';

export function useRadiology() {
  const { showToast } = useToast();
  const [allOrders, setAllOrders] = useState<RadiologyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadOrderId, setUploadOrderId] = useState<string | null>(null);

  useEffect(() => {
    radiologyService
      .getOrders()
      .then(setAllOrders)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const submitFindings = useCallback(
    async (id: string, data: RadiologyFindingsDto) => {
      try {
        const updated = await radiologyService.submitResults(id, data);
        setAllOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
        showToast('Findings submitted', 'success');
        setUploadOrderId(null);
      } catch {
        showToast('Failed to submit findings', 'error');
      }
    },
    [showToast]
  );

  const updateStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      try {
        const updated = await radiologyService.updateOrderStatus(id, status);
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
      ordersToday: allOrders.filter((o) => o.created_at.slice(0, 10) === today).length,
      awaitingScan: pending.filter((o) => o.status === 'pending').length,
      awaitingUpload: pending.filter((o) => o.status === 'in_progress').length,
      uploadedToday: completed.filter((o) => o.completed_at?.slice(0, 10) === today).length,
      completedThisWeek: completed.filter((o) => (o.completed_at ?? '') >= weekStart).length,
    }),
    [allOrders, pending, completed, today, weekStart]
  );

  return {
    allOrders,
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
