'use client';

import { useRouter } from 'next/navigation';
import { FlaskConical, CalendarDays, ArrowRight } from 'lucide-react';
import { useLab } from '@/hooks/lab';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { MyScheduleWidget } from '@/components/shared/MyScheduleWidget';
import { LabOrdersTable } from '@/components/staff/lab/LabOrdersTable';
import { UploadResultsModal } from '@/components/staff/lab/UploadResultsModal';

export default function LabDashboardPage() {
  const router = useRouter();
  const { recentOrders, allOrders, isLoading, uploadOrderId, setUploadOrderId, submitResults, updateStatus, stats } = useLab();

  const uploadOrder = allOrders.find((o) => o.id === uploadOrderId) ?? null;

  const kpiCards = [
    {
      label: 'Pending orders',
      value: isLoading ? '—' : stats.pending,
      tone: stats.pending > 0 ? ('caution' as const) : undefined,
    },
    {
      label: 'In progress',
      value: isLoading ? '—' : stats.ready,
    },
    {
      label: 'Completed today',
      value: isLoading ? '—' : stats.completedToday,
      delta: stats.completedToday > 0 ? `+${stats.completedToday}` : undefined,
      deltaDir: 'up' as const,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Lab dashboard</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {isLoading ? 'Loading…' : `${stats.pending} pending · ${stats.urgent} urgent`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost text-[13px] flex items-center gap-1"
            onClick={() => router.push('/dashboard/lab/schedule')}
          >
            <CalendarDays size={14} /> Schedule
          </button>
          <button
            className="btn btn-primary text-[13px] flex items-center gap-1"
            onClick={() => router.push('/dashboard/lab/orders')}
          >
            All orders <ArrowRight className="rtl:rotate-180" size={14} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <DoctorKPIStrip cards={kpiCards} />

      <MyScheduleWidget />

      {/* Recent orders */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
            <FlaskConical size={15} style={{ color: 'var(--info)' }} />
            Recent orders
          </p>
          <button
            className="text-[13px] text-[var(--brand)] hover:opacity-75 transition-opacity flex items-center gap-1"
            onClick={() => router.push('/dashboard/lab/orders')}
          >
            View all <ArrowRight className="rtl:rotate-180" size={13} />
          </button>
        </div>

        <LabOrdersTable
          orders={recentOrders}
          isLoading={isLoading}
          onUpload={setUploadOrderId}
          onUpdateStatus={updateStatus}
        />
      </div>

      {/* Upload modal */}
      <UploadResultsModal
        order={uploadOrder}
        onClose={() => setUploadOrderId(null)}
        onSubmit={submitResults}
      />
    </div>
  );
}
