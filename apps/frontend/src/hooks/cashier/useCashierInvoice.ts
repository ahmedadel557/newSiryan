'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { cashierService } from '@/services/cashier.service';
import { useToast } from '@/hooks/shared';
import type { CashierInvoice, CashierPaymentInput } from '@/types';

export function useCashierInvoice(id: string) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.cashierInvoice(id),
    queryFn: () => cashierService.getCashierInvoice(id),
    enabled: !!id,
    staleTime: 1000 * 15,
  });

  const processPayment = useMutation({
    mutationFn: (input: CashierPaymentInput) =>
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
    onSuccess: (updated, input) => {
      qc.setQueryData<CashierInvoice>(queryKeys.cashierInvoice(id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.cashierInvoices() });
      qc.invalidateQueries({ queryKey: ['cashier', 'report'] });
      qc.invalidateQueries({ queryKey: queryKeys.cashierAllInvoices() });
      showToast(input.mode === 'full' ? 'Payment recorded' : 'Partial payment recorded', 'success');
    },
    onError: () => showToast('Failed to process payment', 'error'),
  });

  const cancel = useMutation({
    mutationFn: () => cashierService.cancelInvoice(id),
    onSuccess: (updated) => {
      qc.setQueryData<CashierInvoice>(queryKeys.cashierInvoice(id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.cashierInvoices() });
      showToast('Invoice cancelled', 'info');
    },
    onError: () => showToast('Failed to cancel invoice', 'error'),
  });

  return {
    invoice: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? 'Invoice not found' : null,
    processPayment,
    cancel,
  };
}

// Wrapper that adapts the mutation to the signature `(id, input) => Promise<CashierInvoice>`
// required by PaymentModal which is shared with the list page.
export function makeProcessPaymentHandler(
  mutation: ReturnType<typeof useCashierInvoice>['processPayment'],
): (invoiceId: string, input: CashierPaymentInput) => Promise<void> {
  return async (_invoiceId, input) => {
    await mutation.mutateAsync(input);
  };
}
