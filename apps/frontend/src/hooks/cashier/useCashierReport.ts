'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { cashierService } from '@/services/cashier.service';

export function useCashierReport(date?: string) {
  const query = useQuery({
    queryKey: queryKeys.cashierDailyReport(date),
    queryFn: () => cashierService.getDailyReport(date),
    staleTime: 1000 * 60,
  });

  return {
    report: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? 'Failed to load report' : null,
  };
}
