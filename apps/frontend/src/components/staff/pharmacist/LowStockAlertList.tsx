import { AlertTriangle, Send } from 'lucide-react';
import type { PharmaMedication } from '@/types';

interface Props {
  medications: PharmaMedication[];
  supplyLoading: string | null;
  onRequestSupply: (id: string, name: string) => void;
}

export function LowStockAlertList({ medications, supplyLoading, onRequestSupply }: Props) {
  if (medications.length === 0) {
    return (
      <div className="card px-5 py-6 flex items-center gap-3">
        <AlertTriangle size={18} className="text-[var(--fg-3)]" />
        <p className="text-[13px] text-[var(--fg-3)]">No low stock medications</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-1)]">
        <AlertTriangle size={16} className="text-[var(--caution)]" />
        <h2 className="text-[15px] font-semibold text-[var(--fg-1)]">Low stock</h2>
        <span className="chip chip-caut">{medications.length}</span>
      </div>
      {medications.map((med) => (
        <div
          key={med.id}
          className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-1)] last:border-0"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--fg-1)]">{med.name}</p>
            <p className="text-[12px] text-[var(--fg-3)]">
              {med.stock_quantity} {med.unit}s remaining · threshold {med.low_stock_threshold}
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm flex items-center gap-1 shrink-0"
            style={{ fontSize: 12 }}
            onClick={() => onRequestSupply(med.id, med.name)}
            disabled={supplyLoading === med.id}
          >
            {supplyLoading === med.id ? (
              <span className="w-3 h-3 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
            ) : (
              <Send size={12} />
            )}
            Request supply
          </button>
        </div>
      ))}
    </div>
  );
}
