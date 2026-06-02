'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText } from 'lucide-react';
import { useCashierDashboard } from '@/hooks/cashier';
import { useSocketEvent } from '@/hooks/shared';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { TodaysTransactions } from '@/components/staff/cashier/TodaysTransactions';
import { CreateInvoiceModal } from '@/components/staff/cashier/CreateInvoiceModal';
import { PendingPaymentBanner } from '@/components/staff/cashier/PendingPaymentBanner';
import type { PaymentPendingPayload } from '@/types';

function fmtLBP(n: number) {
  return n.toLocaleString('en-US') + ' LBP';
}

export default function CashierDashboardPage() {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { loading, summary, transactions, createInvoice } = useCashierDashboard();

  // Real-time "new payment pending" alerts (pharmacy approved / physical visit completed).
  const [pendingAlerts, setPendingAlerts] = useState<(PaymentPendingPayload & { key: string })[]>([]);
  useSocketEvent<PaymentPendingPayload>(
    'payment:pending',
    useCallback((p) => {
      const key = `${p.source}:${p.source_id}`;
      setPendingAlerts((prev) => (prev.some((a) => a.key === key) ? prev : [{ ...p, key }, ...prev].slice(0, 5)));
    }, [])
  );
  const dismissAlert = useCallback((key: string) => {
    setPendingAlerts((prev) => prev.filter((a) => a.key !== key));
  }, []);

  const kpiCards = [
    { label: 'Total collected today', value: fmtLBP(summary.collectedToday) },
    {
      label: 'Pending payments',
      value: summary.pendingCount,
      tone: summary.pendingCount > 0 ? ('critical' as const) : undefined,
    },
    { label: 'Paid invoices today', value: summary.paidTodayCount },
    {
      label: 'Partial pending',
      value: summary.partialPendingCount,
      tone: summary.partialPendingCount > 0 ? ('caution' as const) : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Dashboard</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {summary.pendingCount} pending · {fmtLBP(summary.collectedToday)} collected today
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/cashier/reports" className="btn-ghost text-[13px] flex items-center gap-1">
            <FileText size={14} /> Daily report
          </Link>
          <button
            className="btn-primary text-[13px] flex items-center gap-1"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={14} /> New invoice
          </button>
        </div>
      </div>

      {pendingAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {pendingAlerts.map((a) => (
            <PendingPaymentBanner
              key={a.key}
              alert={a}
              onView={() => router.push('/dashboard/cashier/pending')}
              onDismiss={() => dismissAlert(a.key)}
            />
          ))}
        </div>
      )}

      <DoctorKPIStrip cards={kpiCards} />

      <TodaysTransactions transactions={transactions} loading={loading} />

      <CreateInvoiceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={async (data) => {
          await createInvoice.mutateAsync(data);
          setCreateModalOpen(false);
        }}
      />
    </div>
  );
}
