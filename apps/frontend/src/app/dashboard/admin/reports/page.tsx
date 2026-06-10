'use client';

import { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import {
  useAdminDashboardStats,
  useAdminDoctorReport,
  useAdminRevenueReport,
  useAdminOccupancyReport,
  useAdminPharmacyReport,
} from '@/hooks/admin';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { RevenueChart } from '@/components/staff/admin/RevenueChart';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatEGP } from '@/lib/pricing';
import type { DoctorReportItem } from '@/types';

type Tab = 'revenue' | 'occupancy' | 'doctors' | 'pharmacy';

const CATEGORY_LABEL: Record<string, string> = {
  appointment: 'Appointments',
  pharmacy: 'Pharmacy',
  room: 'Rooms',
  lab: 'Lab',
  radiology: 'Radiology',
  other: 'Other',
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'occupancy', label: 'Occupancy' },
  { id: 'doctors', label: 'Doctor Performance' },
  { id: 'pharmacy', label: 'Pharmacy' },
];

function occupancyStatusVariant(status: string) {
  if (status === 'occupied') return 'critical' as const;
  if (status === 'maintenance') return 'caution' as const;
  return 'positive' as const;
}

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('revenue');
  const [dateFrom, setDateFrom] = useState('');
  const [appliedRange, setAppliedRange] = useState<{ from?: string; to?: string }>({});
  const [dateTo, setDateTo] = useState('');

  const { stats } = useAdminDashboardStats();
  const { data: doctorReport = [], isLoading: doctorLoading } = useAdminDoctorReport();
  const { data: revenue, isLoading: revenueLoading } = useAdminRevenueReport(appliedRange);
  const { data: occupancy, isLoading: occupancyLoading } = useAdminOccupancyReport({ enabled: activeTab === 'occupancy' });
  const { data: pharmacy, isLoading: pharmacyLoading } = useAdminPharmacyReport({ enabled: activeTab === 'pharmacy' });

  const byCategory = revenue?.by_category ?? [];
  const byMethod = revenue?.by_payment_method ?? [];
  const byDay = revenue?.by_day ?? [];
  const totalRevenue = useMemo(() => byCategory.reduce((s, c) => s + c.total, 0), [byCategory]);

  function applyRevenueRange() {
    setAppliedRange({ from: dateFrom || undefined, to: dateTo || undefined });
  }
  function clearRevenueRange() {
    setDateFrom('');
    setDateTo('');
    setAppliedRange({});
  }

  const categoryOrder = ['appointment', 'pharmacy', 'room', 'lab', 'radiology', 'other'];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Reports</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Hospital performance analytics</p>
        </div>
      </div>

      <div className="flex gap-1 bg-[var(--bg-sunken)] p-1 rounded-[var(--radius-lg)] w-fit border border-[var(--border-1)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-[7px] rounded-[var(--radius-md)] text-[13px] font-medium transition-all"
            style={{
              background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === tab.id ? 'var(--fg-1)' : 'var(--fg-3)',
              boxShadow: activeTab === tab.id ? 'var(--shadow-xs)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'revenue' && (
        <div className="flex flex-col gap-5">
          <div className="card p-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[var(--fg-2)]">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input h-9 text-[13px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[var(--fg-2)]">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input h-9 text-[13px]"
              />
            </div>
            <button
              className="btn btn-primary text-[13px] h-9"
              onClick={applyRevenueRange}
            >
              Apply
            </button>
            {(dateFrom || dateTo) && (
              <button
                className="btn btn-ghost text-[13px] h-9"
                onClick={clearRevenueRange}
              >
                Clear
              </button>
            )}
          </div>

          <DoctorKPIStrip
            cards={[
              { label: 'Total Revenue', value: revenueLoading ? '…' : formatEGP(totalRevenue) },
              { label: 'Invoices', value: revenueLoading ? '…' : byCategory.reduce((s, c) => s + c.count, 0) },
              { label: 'Today', value: stats ? formatEGP(stats.total_revenue_today) : '—' },
              { label: 'Appointments today', value: stats?.total_appointments_today ?? '—' },
            ]}
          />

          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-[var(--fg-1)]">Revenue by service</h2>
              <span className="text-[12px] text-[var(--fg-3)] tabular-nums">{formatEGP(totalRevenue)} total</span>
            </div>
            {revenueLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="72px" className="rounded" />)}
              </div>
            ) : byCategory.length === 0 ? (
              <p className="text-[12px] text-[var(--fg-3)]">No paid invoices in this period.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {categoryOrder.map((cat) => {
                  const row = byCategory.find((c) => c._id === cat);
                  const value = row?.total ?? 0;
                  const pct = totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0;
                  return (
                    <div key={cat} className="flex flex-col gap-1 p-3 rounded-[var(--radius-md)] bg-[var(--bg-sunken)] border border-[var(--border-1)]">
                      <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">{CATEGORY_LABEL[cat] ?? cat}</span>
                      <span className="text-[16px] font-semibold tabular-nums text-[var(--fg-1)]">{formatEGP(value)}</span>
                      <span className="text-[10px] text-[var(--fg-4)]">{pct}% of total</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {byMethod.length > 0 && (
            <div className="card p-5 flex flex-col gap-3">
              <h2 className="text-[14px] font-semibold text-[var(--fg-1)]">Revenue by payment method</h2>
              <div className="flex flex-wrap gap-3">
                {byMethod.map((m) => (
                  <div key={m._id} className="flex flex-col gap-0.5 p-3 rounded-[var(--radius-md)] bg-[var(--bg-sunken)] border border-[var(--border-1)] min-w-[120px]">
                    <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] capitalize">{m._id || 'other'}</span>
                    <span className="text-[15px] font-semibold tabular-nums text-[var(--fg-1)]">{formatEGP(m.total)}</span>
                    <span className="text-[10px] text-[var(--fg-4)]">{m.count} invoices</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5 flex flex-col gap-4">
            <p className="text-[14px] font-semibold text-[var(--fg-1)]">Revenue trend (last 7 days)</p>
            {revenueLoading ? <div className="h-[140px] rounded bg-[var(--sand-100)] animate-pulse" /> : <RevenueChart data={byDay} />}
          </div>
        </div>
      )}

      {activeTab === 'occupancy' && (
        <div className="flex flex-col gap-5">
          {occupancyLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="48px" className="rounded" />)}
            </div>
          ) : !occupancy ? (
            <EmptyState icon={null} title="No occupancy data" description="Room data will appear here once rooms are configured." />
          ) : (
            <>
              <DoctorKPIStrip
                cards={[
                  { label: 'Total Rooms', value: occupancy.overall.total_capacity },
                  { label: 'Occupied', value: occupancy.overall.occupied, tone: occupancy.overall.occupied > 0 ? ('caution' as const) : undefined },
                  { label: 'Available', value: occupancy.overall.available },
                  { label: 'Occupancy Rate', value: `${occupancy.overall.occupancy_pct}%` },
                ]}
              />

              {Object.keys(occupancy.by_type).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(occupancy.by_type).map(([type, data]) => {
                    const rate = data.total_capacity > 0 ? Math.round((data.occupied / data.total_capacity) * 100) : 0;
                    return (
                      <div key={type} className="card p-4 flex flex-col gap-1">
                        <span className="text-[12px] text-[var(--fg-3)] capitalize">{type}</span>
                        <div className="flex items-end justify-between">
                          <span className="text-[20px] font-semibold text-[var(--fg-1)] tabular-nums">{data.occupied}/{data.total_capacity}</span>
                          <span className="text-[13px] text-[var(--fg-3)]">{rate}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--border-1)] overflow-hidden mt-1">
                          <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${rate}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {occupancy.rooms.length > 0 && (
                <div className="card overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border-1)] text-left text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">
                        <th className="px-5 py-3 font-medium">Room</th>
                        <th className="px-5 py-3 font-medium">Type</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Capacity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-1)]">
                      {occupancy.rooms.map((room) => (
                        <tr key={room.id} className="hover:bg-[var(--bg-sunken)] transition-colors">
                          <td className="px-5 py-3 font-medium text-[var(--fg-1)]">{room.name}</td>
                          <td className="px-5 py-3 text-[var(--fg-2)] capitalize">{room.type}</td>
                          <td className="px-5 py-3">
                            <Badge variant={occupancyStatusVariant(room.status)} dot>
                              {room.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-[var(--fg-3)]">{room.current_occupancy}/{room.capacity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="flex flex-col gap-5">
          {doctorLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="48px" className="rounded" />)}
            </div>
          ) : doctorReport.length === 0 ? (
            <EmptyState icon={null} title="No doctor data" description="Doctor performance will appear once appointments are completed." />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border-1)] text-left text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">
                    <th className="px-5 py-3 font-medium">Doctor</th>
                    <th className="px-5 py-3 font-medium">Specialty</th>
                    <th className="px-5 py-3 font-medium text-right">Appointments</th>
                    <th className="px-5 py-3 font-medium text-right">Patients</th>
                    <th className="px-5 py-3 font-medium text-right">Avg Rating</th>
                    <th className="px-5 py-3 font-medium text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-1)]">
                  {doctorReport.map((doc: DoctorReportItem) => (
                    <tr key={doc.doctor_id} className="hover:bg-[var(--bg-sunken)] transition-colors">
                      <td className="px-5 py-3 font-medium text-[var(--fg-1)]">{doc.name}</td>
                      <td className="px-5 py-3 text-[var(--fg-3)]">{doc.specialty || '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-[var(--fg-1)]">{doc.total_visits}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-[var(--fg-2)]">{doc.total_patients ?? '—'}</td>
                      <td className="px-5 py-3 text-right">
                        {doc.avg_rating != null ? (
                          <span className="flex items-center justify-end gap-1">
                            <Star size={12} className="fill-[var(--brand)] text-[var(--brand)]" />
                            <span className="tabular-nums text-[var(--fg-1)]">{doc.avg_rating.toFixed(1)}</span>
                            {doc.rating_count != null && (
                              <span className="text-[10px] text-[var(--fg-4)]">({doc.rating_count})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[var(--fg-4)]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-[var(--fg-2)]">
                        {doc.completion_rate != null ? `${Math.round(doc.completion_rate * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pharmacy' && (
        <div className="flex flex-col gap-5">
          {pharmacyLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="48px" className="rounded" />)}
            </div>
          ) : !pharmacy ? (
            <EmptyState icon={null} title="No pharmacy data" description="Pharmacy reports will appear once orders are processed." />
          ) : (
            <>
              <DoctorKPIStrip
                cards={[
                  { label: 'Total Orders', value: pharmacy.summary.total_orders },
                  { label: 'Revenue', value: formatEGP(pharmacy.summary.total_revenue) },
                  { label: 'Low Stock', value: pharmacy.low_stock_count, tone: pharmacy.low_stock_count > 0 ? ('critical' as const) : undefined },
                ]}
              />

              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-1)]">
                  <p className="text-[14px] font-semibold text-[var(--fg-1)]">Top medications</p>
                </div>
                {pharmacy.top_medications.length === 0 ? (
                  <div className="p-8">
                    <EmptyState icon={null} title="No data" description="No medications dispensed yet." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border-1)] text-left text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">
                        <th className="px-5 py-3 font-medium">Medication</th>
                        <th className="px-5 py-3 font-medium text-right">Dispensed</th>
                        <th className="px-5 py-3 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-1)]">
                      {pharmacy.top_medications.map((med) => (
                        <tr key={med.medication_id} className="hover:bg-[var(--bg-sunken)] transition-colors">
                          <td className="px-5 py-3 font-medium text-[var(--fg-1)]">{med.name}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-[var(--fg-2)]">{med.total_dispensed}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-[var(--fg-1)]">{formatEGP(med.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
