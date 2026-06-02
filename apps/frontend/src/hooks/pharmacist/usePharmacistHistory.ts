'use client';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/shared';
import type { PharmaDispensingRecord } from '@/types';

export function usePharmacistHistory() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ date: '', medication_name: '', patient_name: '' });

  const { data: allRecords = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.pharmacistHistory(filters as Record<string, unknown>),
    queryFn: async () => {
      const data = await pharmacyService.getDispensingHistory({
        date: filters.date || undefined,
        patient_name: filters.patient_name || undefined,
      });
      return filters.medication_name
        ? data.filter((r) => r.medication_name.toLowerCase().includes(filters.medication_name.toLowerCase()))
        : data;
    },
  });

  const records = allRecords;

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
    queryClient.invalidateQueries({ queryKey: queryKeys.pharmacistHistory() });
  }, [queryClient]);

  return { records, loading, filters, setFilters, exportCsv, refresh };
}
