'use client';
import { useCallback, useEffect, useState } from 'react';
import { cashierService } from '@/services/cashier.service';
import type { DailyReport } from '@/types';

/**
 * Page 5 (Daily Report) hook — fetches the aggregated report for a selected day.
 */
export function useCashierReport(initialDate: string) {
  const [date, setDate] = useState(initialDate);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    cashierService
      .getDailyReport(date)
      .then((data) => {
        setError(null);
        setReport(data);
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Set loading in the event handler (not the effect) so the spinner shows while a new day loads.
  const changeDate = useCallback((d: string) => {
    setLoading(true);
    setDate(d);
  }, []);

  return { date, setDate: changeDate, report, loading, error, reload };
}
