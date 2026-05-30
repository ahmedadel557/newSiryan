'use client';
import { useCallback, useEffect, useState } from 'react';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
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
  const [recentOrders, setRecentOrders] = useState<PharmacyOrderFull[]>([]);
  const [lowStockMeds, setLowStockMeds] = useState<PharmaMedication[]>([]);
  const [expiringSoonMeds, setExpiringSoonMeds] = useState<PharmaMedication[]>([]);
  const [stats, setStats] = useState<PharmacistDashboardStats>({
    pendingOrders: 0,
    approvedToday: 0,
    rejectedToday: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [supplyLoading, setSupplyLoading] = useState<string | null>(null);

  const fetchLowStockMeds = useCallback(async () => {
    try {
      const lowStock = await pharmacyService.getMedications({ low_stock: true });
      setLowStockMeds(lowStock);
      setStats((prev) => ({ ...prev, lowStockCount: lowStock.length }));
    } catch { /* non-fatal */ }
  }, []);

  const fetchExpiringMeds = useCallback(async () => {
    try {
      const expiring = await pharmacyService.getMedications({ expiring_soon: true });
      setExpiringSoonMeds(expiring);
      setStats((prev) => ({ ...prev, expiringSoonCount: expiring.length }));
    } catch { /* non-fatal */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const [orders, lowStock, expiring] = await Promise.all([
        pharmacyService.listOrders(),
        pharmacyService.getMedications({ low_stock: true }),
        pharmacyService.getMedications({ expiring_soon: true }),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      setRecentOrders(orders.slice(0, 8));
      setLowStockMeds(lowStock);
      setExpiringSoonMeds(expiring);
      setStats({
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        approvedToday: orders.filter((o) => o.status === 'approved' && o.createdAt.slice(0, 10) === today).length,
        rejectedToday: orders.filter((o) => o.status === 'rejected' && o.createdAt.slice(0, 10) === today).length,
        lowStockCount: lowStock.length,
        expiringSoonCount: expiring.length,
      });
    } catch {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useSocketEvent<unknown>('pharmacy:order:created', () => { load(); });

  useSocketEvent<PharmacyLowStockPayload>('inventory:low_stock', useCallback((data) => {
    fetchLowStockMeds();
    showToast(`Low stock: ${data.name} (${data.stock_quantity} remaining)`, data.severity === 'critical' ? 'error' : 'info');
  }, [showToast, fetchLowStockMeds]));

  useSocketEvent<PharmacyExpiryAlertPayload>('pharmacy:expiry_alert', useCallback((data) => {
    fetchExpiringMeds();
    const urgentCount = data.items.filter((i) => i.urgent).length;
    if (urgentCount > 0) {
      showToast(`${urgentCount} medication(s) expiring within 7 days!`, 'error');
    } else {
      showToast(`${data.items.length} medication(s) expiring within 30 days`, 'info');
    }
  }, [showToast, fetchExpiringMeds]));

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

  return { recentOrders, lowStockMeds, expiringSoonMeds, stats, loading, supplyLoading, requestSupply, refresh: load };
}
