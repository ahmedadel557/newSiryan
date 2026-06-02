'use client';
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { PharmacyOrderFull, PharmaMedication, PharmacyLowStockPayload, PharmacyExpiryAlertPayload } from '@/types';

export interface PharmacistDashboardStats {
  pendingOrders: number;
  approvedToday: number;
  rejectedToday: number;
  lowStockCount: number;
  expiringSoonCount: number;
}

export function usePharmacistDashboard() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [supplyLoading, setSupplyLoading] = useState<string | null>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistDashboard(),
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [orders, lowStock, expiring] = await Promise.all([
        pharmacyService.listOrders(),
        pharmacyService.getMedications({ low_stock: true }),
        pharmacyService.getMedications({ expiring_soon: true }),
      ]);
      const stats: PharmacistDashboardStats = {
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        approvedToday: orders.filter((o) => o.status === 'approved' && o.createdAt.slice(0, 10) === today).length,
        rejectedToday: orders.filter((o) => o.status === 'rejected' && o.createdAt.slice(0, 10) === today).length,
        lowStockCount: lowStock.length,
        expiringSoonCount: expiring.length,
      };
      return { recentOrders: orders.slice(0, 8), lowStockMeds: lowStock, expiringSoonMeds: expiring, stats };
    },
  });

  const recentOrders = data?.recentOrders ?? [];
  const lowStockMeds = data?.lowStockMeds ?? [];
  const expiringSoonMeds = data?.expiringSoonMeds ?? [];
  const stats = data?.stats ?? { pendingOrders: 0, approvedToday: 0, rejectedToday: 0, lowStockCount: 0, expiringSoonCount: 0 };

  useSocketEvent<unknown>('pharmacy:order:created', () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistDashboard() });
  });

  useSocketEvent<PharmacyLowStockPayload>('inventory:low_stock', useCallback((d) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistDashboard() });
    showToast(`Low stock: ${d.name} (${d.stock_quantity} remaining)`, d.severity === 'critical' ? 'error' : 'info');
  }, [queryClient, showToast]));

  useSocketEvent<PharmacyExpiryAlertPayload>('pharmacy:expiry_alert', useCallback((d) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistDashboard() });
    const urgentCount = d.items.filter((i) => i.urgent).length;
    if (urgentCount > 0) {
      showToast(`${urgentCount} medication(s) expiring within 7 days!`, 'error');
    } else {
      showToast(`${d.items.length} medication(s) expiring within 30 days`, 'info');
    }
  }, [queryClient, showToast]));

  useSocketEvent<unknown>('refill:new', useCallback(() => {
    showToast('New refill request received', 'info');
  }, [showToast]));

  const requestSupply = useCallback(async (medicationId: string, medicationName: string) => {
    setSupplyLoading(medicationId);
    try {
      await pharmacyService.createSupplyRequest({ medication_id: medicationId, quantity_requested: 50 });
      showToast(`Supply request sent for ${medicationName}`, 'success');
    } catch {
      showToast('Failed to send supply request', 'error');
    } finally {
      setSupplyLoading(null);
    }
  }, [showToast]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistDashboard() });
  }, [queryClient]);

  return { recentOrders, lowStockMeds, expiringSoonMeds, stats, loading, supplyLoading, requestSupply, refresh };
}
