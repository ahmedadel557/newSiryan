'use client';

import { useRouter } from 'next/navigation';
import { Plus, BarChart2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { RevenueChart } from '@/components/staff/admin/RevenueChart';
import { OccupancySection } from '@/components/staff/admin/OccupancySection';
import { CreateStaffModal } from '@/components/staff/admin/CreateStaffModal';

function actionColor(action: string): string {
  if (action.startsWith('login') || action.startsWith('logout')) return 'var(--brand)';
  if (action.startsWith('delete') || action.startsWith('reject') || action.startsWith('cancel') || action.startsWith('deactivate'))
    return 'var(--critical)';
  if (action.startsWith('create') || action.startsWith('approve') || action.startsWith('pay') || action.startsWith('activate'))
    return 'var(--positive)';
  return 'var(--fg-2)';
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const { allUsers, stats, logs, isLoading, createModalOpen, setCreateModalOpen, createUser, pendingStaffCount } = useAdmin();

  const kpiCards = [
    { label: 'Total users', value: allUsers.length, meta: 'all roles' },
    { label: "Today's revenue", value: stats ? stats.total_revenue_today.toLocaleString('en-US') + ' EGP' : '—' },
    { label: 'Active appointments', value: stats?.total_appointments_today ?? '—' },
    {
      label: 'Pending staff requests',
      value: pendingStaffCount,
      tone: pendingStaffCount > 0 ? ('caution' as const) : undefined,
    },
  ];

  const recentLogs = logs.slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Hospital overview</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost text-[13px] flex items-center gap-1"
            onClick={() => router.push('/dashboard/admin/reports')}
          >
            <BarChart2 size={14} /> View Reports
          </button>
          <button
            className="btn btn-primary text-[13px] flex items-center gap-1"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={14} /> Create Staff Account
          </button>
        </div>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="grid grid-cols-2 gap-5">
        <div className="card p-5 flex flex-col gap-4">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Revenue (last 7 days)</p>
          <RevenueChart />
        </div>

        <div className="card p-5 flex flex-col gap-4">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Bed occupancy</p>
          <OccupancySection />
        </div>

        <div className="card p-5 flex flex-col gap-3 col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-[var(--fg-1)]">Recent activity</p>
            <button
              className="text-[12px] text-[var(--brand)] hover:underline"
              onClick={() => router.push('/dashboard/admin/audit-log')}
            >
              View all
            </button>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-[var(--sand-100)] animate-pulse" />
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)] py-3">No activity yet</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--border-1)]">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-3">
                  <span
                    className="text-[12px] font-semibold w-[110px] shrink-0 truncate"
                    style={{ color: actionColor(log.action) }}
                  >
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[13px] text-[var(--fg-1)] font-medium w-[130px] shrink-0 truncate">
                    {log.performed_by?.username ?? '—'}
                  </span>
                  <span className="text-[12px] text-[var(--fg-3)] truncate flex-1">{log.resource}</span>
                  <span className="text-[11px] text-[var(--fg-4)] font-mono shrink-0 tabular-nums">
                    {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateStaffModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSubmit={createUser} />
    </div>
  );
}
