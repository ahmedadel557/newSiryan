'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { cashierService } from '@/services/cashier.service';
import { useToast } from '@/hooks/useToast';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import type { PendingPatient } from '@/types';

export function useCashierPending() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.cashierPending(),
    queryFn: () => cashierService.getPending(),
    staleTime: 1000 * 15,
  });

  useSocketEvent(
    'pharmacy:order:created',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashierPending() });
    }, []),
  );
  useSocketEvent(
    'pharmacy:order:status',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashierPending() });
    }, []),
  );
  useSocketEvent(
    'payment:pending',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashierPending() });
    }, []),
  );

  const generateInvoice = useMutation({
    mutationFn: (patient: PendingPatient) =>
      cashierService.generateInvoiceFromPending(patient.patient_id, patient.items),
    onSuccess: (_, patient) => {
      qc.setQueryData<PendingPatient[] | undefined>(queryKeys.cashierPending(), (prev) =>
        prev ? prev.filter((p) => p.patient_id !== patient.patient_id) : prev,
      );
      qc.invalidateQueries({ queryKey: queryKeys.cashierInvoices() });
      qc.invalidateQueries({ queryKey: queryKeys.cashierAllInvoices() });
      showToast('Invoice generated', 'success');
    },
    onError: () => showToast('Failed to generate invoice', 'error'),
  });

  return {
    patients: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? 'Failed to load pending payments' : null,
    generatingId: generateInvoice.isPending ? (generateInvoice.variables?.patient_id ?? null) : null,
    generateInvoice,
  };
}
