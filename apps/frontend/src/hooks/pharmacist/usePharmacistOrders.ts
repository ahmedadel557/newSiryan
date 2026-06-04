'use client';
import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast, usePagination } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { PharmacyOrderFull, PharmaMedication, PharmaDrugInteraction, PaginatedResponse } from '@/types';

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
  const { page, limit, goToPage } = usePagination();
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [interactionCheck, setInteractionCheck] = useState<InteractionCheck | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [substitutes, setSubstitutes] = useState<{ orderId: string; substitutes: PharmaMedication[] } | null>(null);
  const pendingRejectIdRef = useRef<string | null>(null);

  const filters: Record<string, unknown> = { page, limit };
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (typeFilter !== 'all') filters.type = typeFilter;

  const { data: ordersData, isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistOrders(filters),
    queryFn: () => pharmacyService.listOrders({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      page,
      limit,
    }),
  });

  const orders = ordersData?.items ?? [];

  useSocketEvent<Record<string, unknown>>('pharmacy:order:created', () => {
    queryClient.invalidateQueries({ queryKey: ['pharmacist', 'orders'] });
  });

  const updateOrderInCache = useCallback((id: string, updated: PharmacyOrderFull) => {
    queryClient.setQueryData<PaginatedResponse<PharmacyOrderFull> | undefined>(
      queryKeys.pharmacistOrders(filters),
      (prev) => prev ? { ...prev, items: prev.items.map((o) => (o.id === id ? updated : o)) } : prev,
    );
  }, [queryClient, filters]);

  const handleApproveOtc = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      const updated = await pharmacyService.approveOtcOrder(id);
      updateOrderInCache(id, updated);
      showToast('Order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, updateOrderInCache]);

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
      updateOrderInCache(order.id, updated);
      showToast('Prescription order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, updateOrderInCache]);

  const confirmApprovePrescription = useCallback(async () => {
    if (!interactionCheck) return;
    const { orderId } = interactionCheck;
    setInteractionCheck(null);
    setActionLoading(orderId);
    try {
      const updated = await pharmacyService.approvePrescriptionOrder(orderId);
      updateOrderInCache(orderId, updated);
      showToast('Prescription order approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve order', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [interactionCheck, showToast, updateOrderInCache]);

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
        // fall through to reject modal
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
      queryClient.setQueryData<PaginatedResponse<PharmacyOrderFull> | undefined>(
        queryKeys.pharmacistOrders(filters),
        (prev) => prev ? { ...prev, items: prev.items.map((o) => (o.id === id ? { ...o, status: 'rejected' as const, rejection_reason: reason } : o)) } : prev,
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
      updateOrderInCache(id, updated);
      showToast(`Delivery status: ${status}`, 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to update delivery status', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, updateOrderInCache]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pharmacist', 'orders'] });
  }, [queryClient]);

  return {
    orders,
    page,
    totalPages: ordersData?.totalPages ?? 1,
    goToPage,
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
