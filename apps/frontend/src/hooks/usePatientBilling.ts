'use client';
import { useEffect, useState } from 'react';
import { patientService } from '@/services/patient.service';
import type { Invoice } from '@/types';

export function usePatientBilling() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    patientService
      .getInvoices()
      .then(setInvoices)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const totalPaid = invoices.filter((i) => i.payment_status === 'paid').reduce((s, i) => s + i.total_amount, 0);

  const totalDue = invoices
    .filter((i) => i.payment_status === 'unpaid' || i.payment_status === 'partial')
    .reduce((s, i) => s + i.total_amount, 0);

  return { invoices, isLoading, totalPaid, totalDue, selectedInvoice, setSelectedInvoice };
}
