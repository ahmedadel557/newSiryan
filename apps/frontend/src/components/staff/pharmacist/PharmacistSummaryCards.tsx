import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import type { PharmacistDashboardStats } from '@/hooks/pharmacist';

interface Props {
  stats: PharmacistDashboardStats;
}

export function PharmacistSummaryCards({ stats }: Props) {
  const cards = [
    {
      label: 'Pending orders',
      value: stats.pendingOrders,
      tone: stats.pendingOrders > 0 ? ('critical' as const) : undefined,
    },
    {
      label: 'Approved today',
      value: stats.approvedToday,
      tone: 'positive' as const,
    },
    {
      label: 'Rejected today',
      value: stats.rejectedToday,
    },
    {
      label: 'Low stock',
      value: stats.lowStockCount,
      tone: stats.lowStockCount > 0 ? ('caution' as const) : undefined,
    },
    {
      label: 'Expiring soon',
      value: stats.expiringSoonCount,
      tone: stats.expiringSoonCount > 0 ? ('caution' as const) : undefined,
    },
  ];

  return <DoctorKPIStrip cards={cards} />;
}
