'use client';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { PharmaRefillRequest } from '@/types';

export function usePharmacistRefills() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);

  const { data: refills = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistRefills(),
    queryFn: () => pharmacyService.listRefillRequests(),
  });

  useSocketEvent<{ id?: string; _id?: string; status?: string }>('pharmacy:refill:status', (payload) => {
    const id = payload._id ?? payload.id ?? '';
    queryClient.setQueryData<PharmaRefillRequest[]>(queryKeys.pharmacistRefills(), (prev) =>
      (prev ?? []).map((r) => (r.id === id ? { ...r, status: (payload.status as PharmaRefillRequest['status']) ?? r.status } : r)),
    );
  });

  useSocketEvent<Record<string, unknown>>('refill:new', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistRefills() });
  }, [queryClient]));

  const approve = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      await pharmacyService.approveRefillRequest(id);
      queryClient.setQueryData<PharmaRefillRequest[]>(queryKeys.pharmacistRefills(), (prev) =>
        (prev ?? []).map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r)),
      );
      showToast('Refill request approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve refill', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, queryClient]);

  const reject = useCallback(async (id: string, reason: string) => {
    setRejectModalId(null);
    setActionLoading(id);
    try {
      await pharmacyService.rejectRefillRequest(id, reason);
      queryClient.setQueryData<PharmaRefillRequest[]>(queryKeys.pharmacistRefills(), (prev) =>
        (prev ?? []).map((r) => (r.id === id ? { ...r, status: 'rejected' as const, rejection_reason: reason } : r)),
      );
      showToast('Refill request rejected', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to reject refill', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast, queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistRefills() });
  }, [queryClient]);

  return { refills, loading, actionLoading, rejectModalId, setRejectModalId, approve, reject, refresh };
}
