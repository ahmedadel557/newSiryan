'use client';
import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
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
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [interactionCheck, setInteractionCheck] = useState<InteractionCheck | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [substitutes, setSubstitutes] = useState<{ orderId: string; substitutes: PharmaMedication[] } | null>(null);
  const pendingRejectIdRef = useRef<string | null>(null);

  const filters: Record<string, unknown> = {};
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (typeFilter !== 'all') filters.type = typeFilter;

  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistOrders(filters),
    queryFn: () => pharmacyService.listOrders(Object.keys(filters).length ? { status: filters.status as string, type: filters.type as string } : undefined),
  });

  useSocketEvent<Record<string, unknown>>('pharmacy:order:created', () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistOrders() });
  });

  const handleApproveOtc = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await pharmacyService.approveOtcOrder(id);
      queryClient.setQueryData<PharmacyOrderFull[]>(queryKeys.pharmacistOrders(filters), (prev) =>
        (prev ?? []).map((o) => (o.id === id ? updated : o)),
      );
      showToast('Order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, queryClient, filters]);

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
      queryClient.setQueryData<PharmacyOrderFull[]>(queryKeys.pharmacistOrders(filters), (prev) =>
        (prev ?? []).map((o) => (o.id === order.id ? updated : o)),
      );
      showToast('Prescription order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, queryClient, filters]);

  const confirmApprovePrescription = useCallback(async () => {
    if (!interactionCheck) return;
    const { orderId } = interactionCheck;
    setInteractionCheck(null);
    setActionLoading(orderId);
    try {
      const updated = await pharmacyService.approvePrescriptionOrder(orderId);
      queryClient.setQueryData<PharmacyOrderFull[]>(queryKeys.pharmacistOrders(filters), (prev) =>
        (prev ?? []).map((o) => (o.id === orderId ? updated : o)),
      );
      showToast('Prescription order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [interactionCheck, showToast, queryClient, filters]);

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
      queryClient.setQueryData<PharmacyOrderFull[]>(queryKeys.pharmacistOrders(filters), (prev) =>
        (prev ?? []).map((o) => (o.id === id ? { ...o, status: 'rejected' as const, rejection_reason: reason } : o)),
      );
      showToast('Order rejected', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to reject order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, queryClient, filters]);

  const handleUpdateDelivery = useCallback(async (id: string, status: 'preparing' | 'dispatched' | 'delivered') => {
    setActionLoading(id);
    try {
      const updated = await pharmacyService.updateDeliveryStatus(id, { status });
      queryClient.setQueryData<PharmacyOrderFull[]>(queryKeys.pharmacistOrders(filters), (prev) =>
        (prev ?? []).map((o) => (o.id === id ? updated : o)),
      );
      showToast(`Delivery status: ${status}`, 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to update delivery status', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, queryClient, filters]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistOrders() });
  }, [queryClient]);

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
    refresh,
  };
}
