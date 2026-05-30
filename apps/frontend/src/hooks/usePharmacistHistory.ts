'use client';
import { useCallback, useEffect, useState } from 'react';
import { pharmacyService } from '@/services/pharmacy.service';
import { useToast } from './useToast';
import type { PharmaDispensingRecord } from '@/types';

export function usePharmacistHistory() {
  const { showToast } = useToast();
  const [records, setRecords] = useState<PharmaDispensingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date: '', medication_name: '', patient_name: '' });

  const load = useCallback(async () => {
    try {
      const data = await pharmacyService.getDispensingHistory({
        date: filters.date || undefined,
        patient_name: filters.patient_name || undefined,
      });
      const filtered = filters.medication_name
        ? data.filter((r) => r.medication_name.toLowerCase().includes(filters.medication_name.toLowerCase()))
        : data;
      setRecords(filtered);
    } catch {
      showToast('Failed to load dispensing history', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => { load(); }, [load]);

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

  return { records, loading, filters, setFilters, exportCsv, refresh: load };
}
