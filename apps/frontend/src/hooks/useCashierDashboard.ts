'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cashierService } from '@/services/cashier.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type { CreateInvoiceDto, DailyTransaction, Invoice } from '@/types';

export interface CashierDashboardSummary {
  collectedToday: number;
  pendingCount: number;
  paidTodayCount: number;
  partialPendingCount: number;
}

const EMPTY_SUMMARY: CashierDashboardSummary = {
  collectedToday: 0,
  pendingCount: 0,
  paidTodayCount: 0,
  partialPendingCount: 0,
};

/**
 * Page 1 (cashier main dashboard) hook. Distinct from useCashier (which drives the
 * invoice-table pages): this one sources the summary cards + today's transactions from the
 * raw /reports/daily endpoint, and pulls counts from the invoices list.
 */
export function useCashierDashboard() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [collectedToday, setCollectedToday] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const reload = useCallback(() => {
    Promise.all([cashierService.getDailyReport(today), cashierService.getInvoices()])
      .then(([report, allInvoices]) => {
        setError(null);
        setCollectedToday(report.total_collected);
        setTransactions(report.transactions);
        setInvoices(allInvoices);
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [today]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Refresh when upstream billable events land (same events useCashier watches).
  useSocketEvent('pharmacy:order:created', useCallback(() => reload(), [reload]));
  useSocketEvent('pharmacy:order:status', useCallback(() => reload(), [reload]));

  const summary = useMemo<CashierDashboardSummary>(() => {
    if (loading) return EMPTY_SUMMARY;
    return {
      collectedToday,
      pendingCount: invoices.filter((inv) => inv.payment_status === 'unpaid').length,
      paidTodayCount: transactions.filter((t) => t.status === 'paid').length,
      partialPendingCount: invoices.filter((inv) => inv.payment_status === 'partial').length,
    };
  }, [loading, collectedToday, invoices, transactions]);

  const createInvoice = useCallback(
    async (data: CreateInvoiceDto) => {
      try {
        await cashierService.createInvoice(data);
        showToast('Invoice created', 'success');
        setCreateModalOpen(false);
        reload();
      } catch {
        showToast('Failed to create invoice', 'error');
      }
    },
    [showToast, reload]
  );

  return {
    loading,
    error,
    summary,
    transactions,
    createModalOpen,
    setCreateModalOpen,
    createInvoice,
    reload,
  };
}
