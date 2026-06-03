import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { PharmaMedication } from '@/types';

interface Props {
  medications: PharmaMedication[];
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function ExpiringAlertList({ medications }: Props) {
  if (medications.length === 0) {
    return (
      <div className="card px-5 py-6 flex items-center gap-3">
        <Clock size={18} className="text-[var(--fg-3)]" />
        <p className="text-[13px] text-[var(--fg-3)]">No medications expiring soon</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-1)]">
        <Clock size={16} className="text-[var(--caution)]" />
        <h2 className="text-[15px] font-semibold text-[var(--fg-1)]">Expiring soon</h2>
        <Badge variant="caution">{medications.length}</Badge>
      </div>
      {medications.map((med) => {
        const days = med.expiry_date ? daysUntil(med.expiry_date) : null;
        return (
          <div
            key={med.id}
            className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-1)] last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--fg-1)]">{med.name}</p>
              <p className="text-[12px] text-[var(--fg-3)]">
                {med.category} · {med.stock_quantity} {med.unit}s in stock
              </p>
            </div>
            {days !== null && (
              <Badge variant={days <= 7 ? 'critical' : 'caution'} className="shrink-0">
                {days === 0 ? 'Expires today' : `${days}d left`}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
