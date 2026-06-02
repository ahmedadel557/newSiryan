'use client';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/shared';
import type { PharmaMedication, PharmaMedicationBatch } from '@/types';

export function usePharmacistMedications() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);
  const [batchesModal, setBatchesModal] = useState<{ medicationId: string; medicationName: string; batches: PharmaMedicationBatch[] } | null>(null);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [supplyLoading, setSupplyLoading] = useState<string | null>(null);

  const filters: Record<string, unknown> = {};
  if (lowStockOnly) filters.low_stock = true;
  if (expiringSoonOnly) filters.expiring_soon = true;

  const { data: medications = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistMedications(filters),
    queryFn: () =>
      pharmacyService.getMedications({
        low_stock: lowStockOnly || undefined,
        expiring_soon: expiringSoonOnly || undefined,
      }),
  });

  const viewBatches = useCallback(async (med: PharmaMedication) => {
    setBatchesLoading(true);
    setBatchesModal({ medicationId: med.id, medicationName: med.name, batches: [] });
    try {
      const batches = await pharmacyService.getMedicationBatches(med.id);
      setBatchesModal({ medicationId: med.id, medicationName: med.name, batches });
    } catch {
      showToast('Failed to load batches', 'error');
      setBatchesModal(null);
    } finally {
      setBatchesLoading(false);
    }
  }, [showToast]);

  const addBatch = useCallback(async (medicationId: string, data: { batch_number: string; quantity: number; expiry_date: string }) => {
    const batch = await pharmacyService.addMedicationBatch(medicationId, data);
    setBatchesModal((prev) => prev ? { ...prev, batches: [...prev.batches, batch] } : prev);
    showToast('Batch added', 'success');
  }, [showToast]);

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
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistMedications() });
  }, [queryClient]);

  return {
    medications,
    loading,
    lowStockOnly,
    setLowStockOnly,
    expiringSoonOnly,
    setExpiringSoonOnly,
    batchesModal,
    batchesLoading,
    setBatchesModal,
    supplyLoading,
    viewBatches,
    addBatch,
    requestSupply,
    refresh,
  };
}
