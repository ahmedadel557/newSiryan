'use client';

import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { useCashierPending } from '@/hooks/useCashierPending';
import { PendingPatientCard } from '@/components/staff/cashier/PendingPatientCard';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PendingPatient } from '@/types';

export default function CashierPendingPage() {
  const router = useRouter();
  const { patients, loading, error, generatingId, generateInvoice } = useCashierPending();

  async function handleGenerate(patient: PendingPatient) {
    const ok = await generateInvoice(patient);
    if (ok) router.push('/dashboard/cashier/invoices');
  }

  const pendingTotal = patients.reduce((s, p) => s + p.total_due, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Pending payments</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {patients.length} patient{patients.length === 1 ? '' : 's'} with un-invoiced charges
            {pendingTotal > 0 ? ` · ${pendingTotal.toLocaleString('en-US')} LBP due` : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="card">
          <EmptyState icon={<Wallet />} title="Couldn’t load pending payments" description={error} />
        </div>
      ) : patients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Wallet />}
            title="Nothing pending"
            description="Checked-in appointments, approved pharmacy orders, and active room bookings will appear here once they're ready to bill."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {patients.map((p) => (
            <PendingPatientCard
              key={p.patient_id}
              patient={p}
              generating={generatingId === p.patient_id}
              onGenerate={handleGenerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
