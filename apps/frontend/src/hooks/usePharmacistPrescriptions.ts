'use client';
import { useCallback, useEffect, useState } from 'react';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from './useToast';
import type { PharmaPrescription } from '@/types';

export function usePharmacistPrescriptions() {
  const { showToast } = useToast();
  const [prescriptions, setPrescriptions] = useState<PharmaPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<PharmaPrescription | null>(null);
  const [filters, setFilters] = useState({ doctor: '', specialization: '', status: '' });

  const load = useCallback(async () => {
    try {
      const data = await pharmacyService.getPrescriptions({
        doctor: filters.doctor || undefined,
        specialization: filters.specialization || undefined,
        status: filters.status || undefined,
      });
      setPrescriptions(data);
    } catch {
      showToast('Failed to load prescriptions', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => { load(); }, [load]);

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

  return { prescriptions, loading, detailId, detailItem, filters, setFilters, openDetail, closeDetail, refresh: load };
}
