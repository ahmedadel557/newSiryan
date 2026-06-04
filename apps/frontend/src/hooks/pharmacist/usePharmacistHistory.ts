'use client';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast, usePagination } from '@/hooks/shared';

export function usePharmacistHistory() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { page, limit, goToPage } = usePagination();
  const [filters, setFilters] = useState({ date: '', medication_name: '', patient_name: '' });

  const { data: historyData, isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistHistory({ ...filters, page, limit } as Record<string, unknown>),
    queryFn: () =>
      pharmacyService.getDispensingHistory({
        date: filters.date || undefined,
        medication_id: undefined,
        patient_name: filters.patient_name || undefined,
        page,
        limit,
      }),
  });

  const records = (historyData?.items ?? []).filter((r) =>
    filters.medication_name
      ? r.medication_name.toLowerCase().includes(filters.medication_name.toLowerCase())
      : true,
  );

  const exportCsv = useCallback(() => {
    const header = 'Patient,Medication,Quantity,Dispensed At,Pharmacist';
    const rows = records.map((r) =>
      [
        r.patient_name ?? '',
        r.medication_name,
        r.quantity,
        new Date(r.dispensed_at).toLocaleString(),
        r.pharmacist_name ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispensing-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [records]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pharmacist', 'history'] });
  }, [queryClient]);

  return {
    records,
    page,
    totalPages: historyData?.totalPages ?? 1,
    goToPage,
    loading,
    filters,
    setFilters,
    exportCsv,
    refresh,
  };
}
