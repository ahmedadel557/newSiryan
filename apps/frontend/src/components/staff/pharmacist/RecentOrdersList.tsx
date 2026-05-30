import { Package } from 'lucide-react';
import type { PharmacyOrderFull } from '@/types';

const statusChip: Record<string, string> = {
  pending: 'chip chip-caut',
  approved: 'chip chip-pos',
  rejected: 'chip chip-crit',
  dispensed: 'chip chip-neut',
};

interface Props {
  orders: PharmacyOrderFull[];
  loading: boolean;
}

export function RecentOrdersList({ orders, loading }: Props) {
  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-1)]">
          <h2 className="text-[15px] font-semibold text-[var(--fg-1)]">Recent orders</h2>
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-1)] last:border-0 animate-pulse">
            <div className="h-4 bg-[var(--bg-page)] rounded w-32" />
            <div className="h-4 bg-[var(--bg-page)] rounded w-20 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-10 gap-2">
        <Package size={28} className="text-[var(--fg-3)]" />
        <p className="text-[14px] text-[var(--fg-3)]">No recent orders</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-1)]">
        <h2 className="text-[15px] font-semibold text-[var(--fg-1)]">Recent orders</h2>
        <span className="text-[12px] text-[var(--fg-3)]">{orders.length} shown</span>
      </div>
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-1)] last:border-0"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--fg-1)] truncate">
              {order.patient_name ?? 'Unknown patient'}
            </p>
            <p className="text-[12px] text-[var(--fg-3)]">
              {order.items.length} medication{order.items.length !== 1 ? 's' : ''} ·{' '}
              {order.order_type === 'prescription' ? 'Prescription' : 'OTC'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] text-[var(--fg-3)] tabular-nums">
              EGP {order.total_amount.toLocaleString()}
            </span>
            <span className={statusChip[order.status] ?? 'chip chip-neut'}>
              {order.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
