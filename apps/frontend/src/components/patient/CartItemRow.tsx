import { Minus, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { CartItem } from '@/types';

interface CartItemRowProps {
  item: CartItem;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CartItemRow({ item, onIncrease, onDecrease, onRemove }: CartItemRowProps) {
  return (
    <li className="p-[10px] bg-[var(--sand-50)] rounded-[var(--radius-md)] flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--fg-1)] truncate">{item.name}</p>
          <div className="mt-[2px]">
            {item.requiresPrescription ? (
              <Badge variant="info" dot>
                Rx
              </Badge>
            ) : (
              <Badge variant="positive" dot>
                OTC
              </Badge>
            )}
          </div>
        </div>
        <button onClick={() => onRemove(item.medicationId)} className="text-[var(--fg-4)] hover:text-[var(--critical)] transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1 border border-[var(--border-1)] rounded-full p-[2px]">
          <button
            onClick={() => onDecrease(item.medicationId)}
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center hover:bg-[var(--sand-200)] transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="text-[13px] font-medium w-6 text-center tabular-nums">{item.quantity}</span>
          <button
            onClick={() => onIncrease(item.medicationId)}
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center hover:bg-[var(--sand-200)] transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
        <span className="text-[13px] font-semibold text-[var(--fg-1)]">
          {item.unitPrice > 0 ? `${(item.unitPrice * item.quantity).toLocaleString()} LBP` : '—'}
        </span>
      </div>
    </li>
  );
}
