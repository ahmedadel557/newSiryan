'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { cashierService } from '@/services/cashier.service';
import { useToast, usePagination } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { CashierInvoice, CashierPaymentInput, PaginatedResponse } from '@/types';

export function useCashierInvoices() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { page, limit, goToPage } = usePagination();

  const query = useQuery({
    queryKey: queryKeys.cashierInvoices({ page, limit }),
    queryFn: () => cashierService.getCashierInvoices({ page, limit }),
    staleTime: 1000 * 15,
  });

  useSocketEvent(
    'pharmacy:order:created',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['cashier', 'invoices'] });
    }, []),
  );
  useSocketEvent(
    'pharmacy:order:status',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['cashier', 'invoices'] });
    }, []),
  );

  const processPayment = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CashierPaymentInput }) =>
      input.mode === 'full'
        ? cashierService.payInvoiceFull(id, {
            payment_method: input.payment_method,
            amount_paid: input.amount,
            notes: input.notes,
          })
        : cashierService.payInvoicePartial(id, {
            amount_paid: input.amount,
            payment_method: input.payment_method,
            notes: input.notes,
          }),
    onSuccess: (updated, vars) => {
      qc.setQueryData<PaginatedResponse<CashierInvoice> | undefined>(
        queryKeys.cashierInvoices({ page, limit }),
        (prev) => prev ? { ...prev, items: prev.items.map((inv) => (inv.id === updated.id ? updated : inv)) } : prev,
      );
      qc.invalidateQueries({ queryKey: queryKeys.cashierInvoice(updated.id) });
      qc.invalidateQueries({ queryKey: ['cashier', 'report'] });
      qc.invalidateQueries({ queryKey: queryKeys.cashierAllInvoices() });
      showToast(vars.input.mode === 'full' ? 'Payment recorded' : 'Partial payment recorded', 'success');
    },
    onError: () => showToast('Failed to process payment', 'error'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cashierService.cancelInvoice(id),
    onSuccess: (updated) => {
      qc.setQueryData<PaginatedResponse<CashierInvoice> | undefined>(
        queryKeys.cashierInvoices({ page, limit }),
        (prev) => prev ? { ...prev, items: prev.items.map((inv) => (inv.id === updated.id ? updated : inv)) } : prev,
      );
      qc.invalidateQueries({ queryKey: queryKeys.cashierInvoice(updated.id) });
      showToast('Invoice cancelled', 'info');
    },
    onError: () => showToast('Failed to cancel invoice', 'error'),
  });

  return {
    allInvoices: query.data?.items ?? [],
    page,
    totalPages: query.data?.totalPages ?? 1,
    goToPage,
    loading: query.isLoading,
    error: query.error ? 'Failed to load invoices' : null,
    processPayment,
    cancel,
  };
}
