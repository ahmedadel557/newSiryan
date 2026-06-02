'use client';

import { useRouter } from 'next/navigation';
import { Scan, CalendarDays, ArrowRight } from 'lucide-react';
import { useRadiology } from '@/hooks/radiology';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { RadiologyOrdersTable } from '@/components/staff/radiology/RadiologyOrdersTable';
import { UploadScanModal } from '@/components/staff/radiology/UploadScanModal';

export default function RadiologyDashboardPage() {
  const router = useRouter();
  const { recentOrders, allOrders, isLoading, uploadOrderId, setUploadOrderId, submitFindings, updateStatus, stats } = useRadiology();

  const uploadOrder = allOrders.find((o) => o.id === uploadOrderId) ?? null;

  const kpiCards = [
    {
      label: 'Pending scans',
      value: isLoading ? '—' : stats.awaitingScan,
      tone: stats.awaitingScan > 0 ? ('caution' as const) : undefined,
    },
    {
      label: 'In progress',
      value: isLoading ? '—' : stats.awaitingUpload,
    },
    {
      label: 'Completed today',
      value: isLoading ? '—' : stats.uploadedToday,
      delta: stats.uploadedToday > 0 ? `+${stats.uploadedToday}` : undefined,
      deltaDir: 'up' as const,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Radiology dashboard</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {isLoading ? 'Loading…' : `${stats.awaitingScan} pending · ${stats.awaitingUpload} in progress`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost text-[13px] flex items-center gap-1"
            onClick={() => router.push('/dashboard/radiology/schedule')}
          >
            <CalendarDays size={14} /> Schedule
          </button>
          <button
            className="btn btn-primary text-[13px] flex items-center gap-1"
            onClick={() => router.push('/dashboard/radiology/orders')}
          >
            All orders <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <DoctorKPIStrip cards={kpiCards} />

      {/* Recent orders */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
            <Scan size={15} style={{ color: 'var(--info)' }} />
            Recent orders
          </p>
          <button
            className="text-[13px] text-[var(--brand)] hover:opacity-75 transition-opacity flex items-center gap-1"
            onClick={() => router.push('/dashboard/radiology/orders')}
          >
            View all <ArrowRight size={13} />
          </button>
        </div>

        <RadiologyOrdersTable
          orders={recentOrders}
          isLoading={isLoading}
          onUpload={setUploadOrderId}
          onUpdateStatus={updateStatus}
        />
      </div>

      {/* Upload modal */}
      <UploadScanModal
        order={uploadOrder}
        onClose={() => setUploadOrderId(null)}
        onSubmit={submitFindings}
      />
    </div>
  );
}
