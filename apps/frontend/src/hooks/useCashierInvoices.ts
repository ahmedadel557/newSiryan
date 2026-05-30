'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cashierService } from '@/services/cashier.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type { CashierInvoice, CashierPaymentInput } from '@/types';

export type InvoiceTab = 'all' | 'unpaid' | 'paid' | 'partial';

const TAB_STATUS: Record<Exclude<InvoiceTab, 'all'>, CashierInvoice['status']> = {
  unpaid: 'unpaid',
  paid: 'paid',
  partial: 'partially_paid',
};

/**
 * Page 3 (Invoices) hook. Lists raw cashier invoices, filters by tab + patient-name search,
 * and processes full (/pay) or partial (/partial) payments.
 */
export function useCashierInvoices() {
  const { showToast } = useToast();
  const [allInvoices, setAllInvoices] = useState<CashierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<InvoiceTab>('all');
  const [search, setSearch] = useState('');
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);

  const reload = useCallback(() => {
    cashierService
      .getCashierInvoices()
      .then((data) => {
        setError(null);
        setAllInvoices(data);
      })
      .catch(() => setError('Failed to load invoices'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useSocketEvent('pharmacy:order:created', useCallback(() => reload(), [reload]));
  useSocketEvent('pharmacy:order:status', useCallback(() => reload(), [reload]));

  const counts = useMemo(
    () => ({
      all: allInvoices.length,
      unpaid: allInvoices.filter((i) => i.status === 'unpaid').length,
      paid: allInvoices.filter((i) => i.status === 'paid').length,
      partial: allInvoices.filter((i) => i.status === 'partially_paid').length,
    }),
    [allInvoices]
  );

  const invoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allInvoices
      .filter((inv) => (tab === 'all' ? true : inv.status === TAB_STATUS[tab]))
      .filter((inv) => (q ? inv.patient_name.toLowerCase().includes(q) : true));
  }, [allInvoices, tab, search]);

  const paymentInvoice = useMemo(
    () => allInvoices.find((inv) => inv.id === paymentInvoiceId) ?? null,
    [allInvoices, paymentInvoiceId]
  );

  const processPayment = useCallback(
    async (id: string, input: CashierPaymentInput) => {
      try {
        const updated =
          input.mode === 'full'
            ? await cashierService.payInvoiceFull(id, {
                payment_method: input.payment_method,
                amount_paid: input.amount,
                notes: input.notes,
              })
            : await cashierService.payInvoicePartial(id, {
                amount_paid: input.amount,
                payment_method: input.payment_method,
                notes: input.notes,
              });
        setAllInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
        showToast(input.mode === 'full' ? 'Payment recorded' : 'Partial payment recorded', 'success');
        setPaymentInvoiceId(null);
      } catch {
        showToast('Failed to process payment', 'error');
      }
    },
    [showToast]
  );

  return {
    invoices,
    loading,
    error,
    tab,
    setTab,
    search,
    setSearch,
    counts,
    paymentInvoice,
    paymentInvoiceId,
    setPaymentInvoiceId,
    processPayment,
    reload,
  };
}
