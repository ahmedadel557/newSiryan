'use client';
import { useCallback, useEffect, useState } from 'react';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from './useToast';
import type { PharmacistRx } from '@/types';

export type RxFilter = 'today' | 'restricted' | 'otc' | 'all';

export interface PharmacistStats {
  awaiting: number;
  verifiedToday: number;
  dispensedToday: number;
  lowStock: number;
}

export function usePharmacist() {
  const { showToast } = useToast();
  const [allPrescriptions, setAllPrescriptions] = useState<PharmacistRx[]>([]);
  const [filter, setFilter] = useState<RxFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    pharmacyService
      .getPrescriptionQueue()
      .then(setAllPrescriptions)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const approve = useCallback(
    async (id: string) => {
      try {
        const updated = await pharmacyService.verifyPrescription(id);
        setAllPrescriptions((prev) => prev.map((rx) => (rx.id === id ? updated : rx)));
        showToast('Prescription verified', 'success');
      } catch {
        showToast('Failed to verify prescription', 'error');
      }
    },
    [showToast]
  );

  const reject = useCallback(
    async (id: string) => {
      try {
        await pharmacyService.rejectPrescription(id);
        setAllPrescriptions((prev) => prev.map((rx) => (rx.id === id ? { ...rx, state: 'rejected' as const } : rx)));
        showToast('Prescription rejected', 'success');
      } catch {
        showToast('Failed to reject prescription', 'error');
      }
    },
    [showToast]
  );

  const today = new Date().toISOString().slice(0, 10);

  const stats: PharmacistStats = {
    awaiting: allPrescriptions.filter((rx) => rx.state === 'awaiting_verification').length,
    verifiedToday: allPrescriptions.filter((rx) => rx.state === 'verified' && rx.created_at.slice(0, 10) === today).length,
    dispensedToday: allPrescriptions.filter((rx) => rx.state === 'dispensed' && rx.created_at.slice(0, 10) === today).length,
    lowStock: 0,
  };

  const filteredByTab = allPrescriptions.filter((rx) => {
    if (filter === 'restricted') return rx.flag_type === 'restricted';
    if (filter === 'otc') return rx.flag_type === 'otc';
    if (filter === 'today') return rx.created_at.slice(0, 10) === today;
    return true;
  });

  const prescriptions = searchQuery.trim()
    ? filteredByTab.filter((rx) => {
        const q = searchQuery.toLowerCase();
        return rx.patient_name.toLowerCase().includes(q) || rx.id.toLowerCase().includes(q);
      })
    : filteredByTab;

  return {
    prescriptions,
    allPrescriptions,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    approveConfirmId,
    setApproveConfirmId,
    rejectModalId,
    setRejectModalId,
    isLoading,
    approve,
    reject,
    stats,
  };
}
