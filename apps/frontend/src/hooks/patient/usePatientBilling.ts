'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { patientService } from '@/services/patient.service';
import type { Invoice } from '@/types';

export function usePatientBilling() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices = [], isPending } = useQuery({
    queryKey: queryKeys.patientInvoices(),
    queryFn: () => patientService.getInvoices(),
  });

  const totalPaid = invoices.filter((i) => i.payment_status === 'paid').reduce((s, i) => s + i.total_amount, 0);
  const totalDue = invoices
    .filter((i) => i.payment_status === 'unpaid' || i.payment_status === 'partial')
    .reduce((s, i) => s + i.total_amount, 0);

  return { invoices, isLoading: isPending, totalPaid, totalDue, selectedInvoice, setSelectedInvoice };
}
