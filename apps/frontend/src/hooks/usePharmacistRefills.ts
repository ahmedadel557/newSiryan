'use client';
import { useCallback, useEffect, useState } from 'react';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type { PharmaRefillRequest } from '@/types';

export function usePharmacistRefills() {
  const { showToast } = useToast();
  const [refills, setRefills] = useState<PharmaRefillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await pharmacyService.listRefillRequests();
      setRefills(data);
    } catch {
      showToast('Failed to load refill requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useSocketEvent<{ id?: string; _id?: string; status?: string }>('pharmacy:refill:status', (payload) => {
    const id = payload._id ?? payload.id ?? '';
    setRefills((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: (payload.status as PharmaRefillRequest['status']) ?? r.status } : r))
    );
  });

  useSocketEvent<Record<string, unknown>>('refill:new', useCallback(() => {
    load();
  }, [load]));

  const approve = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      await pharmacyService.approveRefillRequest(id);
      setRefills((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r)));
      showToast('Refill request approved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to approve refill', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  const reject = useCallback(async (id: string, reason: string) => {
    setRejectModalId(null);
    setActionLoading(id);
    try {
      await pharmacyService.rejectRefillRequest(id, reason);
      setRefills((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as const, rejection_reason: reason } : r)));
      showToast('Refill request rejected', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to reject refill', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [showToast]);

  return { refills, loading, actionLoading, rejectModalId, setRejectModalId, approve, reject, refresh: load };
}
