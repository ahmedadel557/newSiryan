import { X, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { PharmaMedication } from '@/types';

interface Props {
  data: { orderId: string; substitutes: PharmaMedication[] } | null;
  onClose: () => void;
  onProceedToReject: () => void;
}

export function SubstitutionModal({ data, onClose, onProceedToReject }: Props) {
  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[480px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Substitution suggestions</p>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">Available alternatives from same category</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-2">
          {data.substitutes.map((med) => (
            <div key={med.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--bg-page)]">
              <div>
                <p className="text-[13px] font-medium text-[var(--fg-1)]">{med.name}</p>
                <p className="text-[12px] text-[var(--fg-3)]">
                  {med.category} · {med.stock_quantity} in stock · EGP {med.price}
                </p>
              </div>
              <Badge variant={med.stock_quantity > 0 ? 'positive' : 'critical'} className="shrink-0">
                {med.stock_quantity > 0 ? 'Available' : 'Out of stock'}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end px-6 pb-5">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-danger flex items-center gap-1"
            onClick={onProceedToReject}
          >
            Proceed to Reject
            <ArrowRight className="rtl:rotate-180" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
