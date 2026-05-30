'use client';
import { useCallback, useEffect, useState } from 'react';
import { cashierService } from '@/services/cashier.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type { PendingPatient } from '@/types';

/**
 * Page 2 (Pending Payments) hook. Lists patients with un-invoiced checked-in appointments,
 * approved pharmacy orders, and active room bookings (GET /cashier/pending), and turns a
 * patient's pending items into an invoice (POST /cashier/invoices).
 */
export function useCashierPending() {
  const { showToast } = useToast();
  const [patients, setPatients] = useState<PendingPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    cashierService
      .getPending()
      .then((data) => {
        setError(null);
        setPatients(data);
      })
      .catch(() => setError('Failed to load pending payments'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Pending list changes as upstream billable events land.
  useSocketEvent('pharmacy:order:created', useCallback(() => reload(), [reload]));
  useSocketEvent('pharmacy:order:status', useCallback(() => reload(), [reload]));
  useSocketEvent('payment:pending', useCallback(() => reload(), [reload]));

  // Returns true on success so the page can navigate to the invoice view.
  const generateInvoice = useCallback(
    async (patient: PendingPatient): Promise<boolean> => {
      setGeneratingId(patient.patient_id);
      try {
        await cashierService.generateInvoiceFromPending(patient.patient_id, patient.items);
        setPatients((prev) => prev.filter((p) => p.patient_id !== patient.patient_id));
        showToast('Invoice generated', 'success');
        return true;
      } catch {
        showToast('Failed to generate invoice', 'error');
        return false;
      } finally {
        setGeneratingId(null);
      }
    },
    [showToast]
  );

  return { patients, loading, error, generatingId, generateInvoice, reload };
}
