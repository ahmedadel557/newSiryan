'use client';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/shared';
import type { PharmaPrescription } from '@/types';

export function usePharmacistPrescriptions() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<PharmaPrescription | null>(null);
  const [filters, setFilters] = useState({ doctor: '', specialization: '', status: '' });

  const { data: prescriptions = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistPrescriptions(filters as Record<string, unknown>),
    queryFn: () =>
      pharmacyService.getPrescriptions({
        doctor: filters.doctor || undefined,
        specialization: filters.specialization || undefined,
        status: filters.status || undefined,
      }),
  });

  const openDetail = useCallback(async (id: string) => {
    setDetailId(id);
    try {
      const detail = await pharmacyService.getPrescriptionById(id);
      setDetailItem(detail);
    } catch {
      showToast('Failed to load prescription detail', 'error');
    }
  }, [showToast]);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetailItem(null);
  }, []);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistPrescriptions() });
  }, [queryClient]);

  return { prescriptions, loading, detailId, detailItem, filters, setFilters, openDetail, closeDetail, refresh };
}
