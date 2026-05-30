'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type { PharmacyOrderFull, PharmaMedication, PharmaDrugInteraction } from '@/types';

export type OrderStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
export type OrderTypeFilter = 'all' | 'otc' | 'prescription';

export interface InteractionCheck {
  orderId: string;
  interactions: PharmaDrugInteraction[];
  has_severe: boolean;
}

export function usePharmacistOrders() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<PharmacyOrderFull[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [interactionCheck, setInteractionCheck] = useState<InteractionCheck | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [substitutes, setSubstitutes] = useState<{ orderId: string; substitutes: PharmaMedication[] } | null>(null);
  const pendingRejectIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const filters: { status?: string; type?: string } = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      const data = await pharmacyService.listOrders(filters);
      setOrders(data);
    } catch {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  useSocketEvent<Record<string, unknown>>('pharmacy:order:created', () => { load(); });

  const handleApproveOtc = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await pharmacyService.approveOtcOrder(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast('Order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const handleApprovePrescription = useCallback(async (order: PharmacyOrderFull) => {
    setActionLoading(order.id);
    try {
      const medicationIds = order.items.map((i) => i.medication).filter(Boolean);
      if (medicationIds.length >= 2) {
        const check = await pharmacyService.checkDrugInteractions(medicationIds);
        if (check.interactions.length > 0) {
          setInteractionCheck({ orderId: order.id, interactions: check.interactions, has_severe: check.has_severe });
          setActionLoading(null);
          return;
        }
      }
      const updated = await pharmacyService.approvePrescriptionOrder(order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      showToast('Prescription order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const confirmApprovePrescription = useCallback(async () => {
    if (!interactionCheck) return;
    const { orderId } = interactionCheck;
    setInteractionCheck(null);
    setActionLoading(orderId);
    try {
      const updated = await pharmacyService.approvePrescriptionOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast('Prescription order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [interactionCheck, showToast]);

  const handleRejectClick = useCallback(async (order: PharmacyOrderFull) => {
    const oosItems = order.items.filter((i) => i.medication);
    if (oosItems.length > 0) {
      try {
        const firstId = oosItems[0].medication;
        const subs = await pharmacyService.getMedicationSubstitutes(firstId);
        if (subs.length > 0) {
          pendingRejectIdRef.current = order.id;
          setSubstitutes({ orderId: order.id, substitutes: subs });
          return;
        }
      } catch {
        // ignore — fall through to reject modal
      }
    }
    setRejectModalId(order.id);
  }, []);

  const proceedToRejectFromSubstitution = useCallback(() => {
    const id = pendingRejectIdRef.current;
    setSubstitutes(null);
    if (id) setRejectModalId(id);
  }, []);

  const handleReject = useCallback(async (id: string, reason: string) => {
    setRejectModalId(null);
    setActionLoading(id);
    try {
      await pharmacyService.rejectOrder(id, reason);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'rejected' as const, rejection_reason: reason } : o)));
      showToast('Order rejected', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to reject order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const handleUpdateDelivery = useCallback(async (id: string, status: 'preparing' | 'dispatched' | 'delivered') => {
    setActionLoading(id);
    try {
      const updated = await pharmacyService.updateDeliveryStatus(id, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast(`Delivery status: ${status}`, 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to update delivery status', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  return {
    orders,
    loading,
    actionLoading,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    interactionCheck,
    setInteractionCheck,
    rejectModalId,
    setRejectModalId,
    substitutes,
    setSubstitutes,
    handleApproveOtc,
    handleApprovePrescription,
    confirmApprovePrescription,
    handleRejectClick,
    proceedToRejectFromSubstitution,
    handleReject,
    handleUpdateDelivery,
    refresh: load,
  };
}
