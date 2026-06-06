'use client';

import { usePharmacistDashboard } from '@/hooks/pharmacist';
import { PharmacistSummaryCards } from '@/components/staff/pharmacist/PharmacistSummaryCards';
import { MyScheduleWidget } from '@/components/shared/MyScheduleWidget';
import { RecentOrdersList } from '@/components/staff/pharmacist/RecentOrdersList';
import { LowStockAlertList } from '@/components/staff/pharmacist/LowStockAlertList';
import { ExpiringAlertList } from '@/components/staff/pharmacist/ExpiringAlertList';

export default function PharmacistDashboardPage() {
  const {
    recentOrders,
    lowStockMeds,
    expiringSoonMeds,
    stats,
    loading,
    supplyLoading,
    requestSupply,
  } = usePharmacistDashboard();

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Pharmacy</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
          {stats.pendingOrders} pending order{stats.pendingOrders !== 1 ? 's' : ''} · {stats.lowStockCount} low stock alert{stats.lowStockCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Summary cards */}
      <PharmacistSummaryCards stats={stats} />

      <MyScheduleWidget />

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Recent orders</h2>
          <a href="/dashboard/pharmacist/orders" className="text-[13px] text-[var(--brand)] hover:underline">
            View all orders →
          </a>
        </div>
        <RecentOrdersList orders={recentOrders} loading={loading} />
      </div>

      {/* Alerts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--fg-1)] mb-3">Low stock alerts</h2>
          <LowStockAlertList
            medications={lowStockMeds}
            supplyLoading={supplyLoading}
            onRequestSupply={requestSupply}
          />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--fg-1)] mb-3">Expiring soon (30 days)</h2>
          <ExpiringAlertList medications={expiringSoonMeds} />
        </div>
      </div>
    </div>
  );
}
