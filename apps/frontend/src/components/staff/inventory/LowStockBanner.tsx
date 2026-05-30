import { AlertTriangle } from 'lucide-react';
import type { InventoryItem, Medication } from '@/types';

interface LowStockBannerProps {
  lowStock: { inventory: InventoryItem[]; medications: Medication[] };
}

export function LowStockBanner({ lowStock }: LowStockBannerProps) {
  const total = lowStock.inventory.length + lowStock.medications.length;
  if (total === 0) return null;

  const allNames = [...lowStock.inventory.map((i) => i.name), ...lowStock.medications.map((m) => m.name)];
  const preview = allNames.slice(0, 3).join(', ');
  const extra = total > 3 ? ` +${total - 3} more` : '';

  return (
    <div
      className="flex items-start gap-3 rounded-[var(--radius-md)] px-4 py-3"
      style={{ background: 'var(--critical-soft-bg)', border: '1px solid var(--critical-soft-fg)' }}
    >
      <AlertTriangle size={16} style={{ color: 'var(--critical-soft-fg)', marginTop: 2, flexShrink: 0 }} />
      <p className="text-[13px]" style={{ color: 'var(--critical-soft-fg)' }}>
        <span className="font-semibold">
          {total} item{total !== 1 ? 's' : ''} below reorder threshold:
        </span>{' '}
        {preview}
        {extra}. Submit a supply request to restock.
      </p>
    </div>
  );
}
