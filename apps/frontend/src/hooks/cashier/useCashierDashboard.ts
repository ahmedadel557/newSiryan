'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { cashierService } from '@/services/cashier.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { CreateInvoiceDto } from '@/types';

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

export function useCashierDashboard() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const reportQuery = useQuery({
    queryKey: queryKeys.cashierDailyReport(today),
    queryFn: () => cashierService.getDailyReport(today),
    staleTime: 1000 * 60,
  });

  const invoicesQuery = useQuery({
    queryKey: queryKeys.cashierAllInvoices(),
    queryFn: () => cashierService.getInvoices(),
    staleTime: 1000 * 30,
  });

  useSocketEvent(
    'pharmacy:order:created',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashierAllInvoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cashierDailyReport(today) });
    }, [today]),
  );
  useSocketEvent(
    'pharmacy:order:status',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashierAllInvoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cashierDailyReport(today) });
    }, [today]),
  );

  const loading = reportQuery.isLoading || invoicesQuery.isLoading;
  const error = reportQuery.error || invoicesQuery.error ? 'Failed to load dashboard' : null;

  const transactions = reportQuery.data?.transactions ?? [];

  const summary = useMemo<CashierDashboardSummary>(() => {
    if (loading || !reportQuery.data || !invoicesQuery.data) return EMPTY_SUMMARY;
    return {
      collectedToday: reportQuery.data.total_collected,
      pendingCount: invoicesQuery.data.filter((inv) => inv.payment_status === 'unpaid').length,
      paidTodayCount: transactions.filter((t) => t.status === 'paid').length,
      partialPendingCount: invoicesQuery.data.filter((inv) => inv.payment_status === 'partial').length,
    };
  }, [loading, reportQuery.data, invoicesQuery.data, transactions]);

  const createInvoice = useMutation({
    mutationFn: (data: CreateInvoiceDto) => cashierService.createInvoice(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cashierAllInvoices() });
      qc.invalidateQueries({ queryKey: queryKeys.cashierInvoices() });
      qc.invalidateQueries({ queryKey: queryKeys.cashierDailyReport(today) });
      showToast('Invoice created', 'success');
    },
    onError: () => showToast('Failed to create invoice', 'error'),
  });

  return {
    loading,
    error,
    summary,
    transactions,
    createInvoice,
  };
}
