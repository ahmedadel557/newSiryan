'use client';
import { useCallback, useEffect, useState } from 'react';
import { cashierService } from '@/services/cashier.service';
import { useToast } from './useToast';
import type { CashierInvoice, CashierPaymentInput } from '@/types';

/**
 * Page 4 (Invoice Detail) hook — loads a single invoice and processes full/partial payments on it.
 */
export function useCashierInvoice(id: string) {
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState<CashierInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const reload = useCallback(() => {
    cashierService
      .getCashierInvoice(id)
      .then((data) => {
        setError(null);
        setInvoice(data);
      })
      .catch(() => setError('Invoice not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const processPayment = useCallback(
    async (invoiceId: string, input: CashierPaymentInput) => {
      try {
        const updated =
          input.mode === 'full'
            ? await cashierService.payInvoiceFull(invoiceId, {
                payment_method: input.payment_method,
                amount_paid: input.amount,
                notes: input.notes,
              })
            : await cashierService.payInvoicePartial(invoiceId, {
                amount_paid: input.amount,
                payment_method: input.payment_method,
                notes: input.notes,
              });
        setInvoice(updated);
        showToast(input.mode === 'full' ? 'Payment recorded' : 'Partial payment recorded', 'success');
        setPaymentOpen(false);
      } catch {
        showToast('Failed to process payment', 'error');
      }
    },
    [showToast]
  );

  const cancelInvoice = useCallback(async () => {
    try {
      const updated = await cashierService.cancelInvoice(id);
      setInvoice(updated);
      showToast('Invoice cancelled', 'info');
      setCancelConfirm(false);
    } catch {
      showToast('Failed to cancel invoice', 'error');
    }
  }, [id, showToast]);

  return { invoice, loading, error, paymentOpen, setPaymentOpen, processPayment, cancelConfirm, setCancelConfirm, cancelInvoice, reload };
}
