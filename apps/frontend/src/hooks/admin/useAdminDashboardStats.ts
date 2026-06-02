'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { adminService } from '@/services/admin.service';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/useToast';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import type { DashboardStats, InventoryItem } from '@/types';

type PaymentReceived = {
  invoice_id: string;
  amount: number;
  patient_name: string;
  payment_method: string;
  status: string;
  total_due: number;
  is_partial: boolean;
};

export function useAdminDashboardStats() {
  const { showToast } = useToast();

  const statsQuery = useQuery({
    queryKey: queryKeys.adminDashboardStats(),
    queryFn: () => adminService.getDashboardStats(),
    staleTime: 1000 * 30,
  });

  const lowStockQuery = useQuery({
    queryKey: queryKeys.adminLowStock(),
    queryFn: () => inventoryService.getLowStock(),
    staleTime: 1000 * 60 * 2,
  });

  // Authoritative refresh on real-time payment alerts (and surface a toast).
  useSocketEvent<PaymentReceived>(
    'payment:received',
    useCallback(
      (p) => {
        const label = p.is_partial ? 'Partial payment' : 'Payment';
        showToast(
          `${label} received: ${p.amount.toLocaleString('en-US')} EGP from ${p.patient_name} (${p.payment_method})`,
          p.is_partial ? 'info' : 'success',
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboardStats() });
      },
      [showToast],
    ),
  );

  return {
    stats: (statsQuery.data ?? null) as DashboardStats | null,
    lowStockItems: (lowStockQuery.data?.inventory ?? []) as InventoryItem[],
    loading: statsQuery.isLoading,
    error: statsQuery.error,
  };
}
