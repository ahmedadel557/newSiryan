import { X, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SupplyRequest, InventoryItem } from '@/types';

interface Props {
  request: SupplyRequest | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  items?: InventoryItem[];
}

export function FulfillConfirmModal({ request, onClose, onConfirm, items = [] }: Props) {
  if (!request) return null;

  const isMulti = request.requested_items && request.requested_items.length > 0;

  type StockWarning = { name: string; need: number; have: number };
  const stockWarnings: StockWarning[] = [];
  if (isMulti) {
    for (const ri of request.requested_items!) {
      if (ri.item_type !== 'inventory') continue;
      const inv = items.find((i) => i.id === ri.item_id || i.id === String(ri.item_id));
      const have = inv?.quantity ?? 0;
      if (have < ri.quantity) stockWarnings.push({ name: ri.item_name, need: ri.quantity, have });
    }
  } else if (request.item_id && request.quantity_requested) {
    const inv = items.find((i) => i.id === request.item_id);
    const have = inv?.quantity ?? 0;
    if (have < (request.quantity_requested ?? 0)) {
      stockWarnings.push({ name: request.item_name ?? request.item_id, need: request.quantity_requested ?? 0, have });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[460px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Fulfill supply request</p>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">{isMulti ? `${request.requested_items!.length} item(s)` : 'Single item'}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px]"><X size={15} /></button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-3">
          {isMulti ? (
            <div className="flex flex-col gap-1 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-1)]">
              {request.requested_items!.map((ri, i) => {
                const inv = items.find((it) => it.id === ri.item_id || it.id === String(ri.item_id));
                const insufficient = ri.item_type === 'inventory' && (inv?.quantity ?? 0) < ri.quantity;
                return (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 text-[13px] ${i > 0 ? 'border-t border-[var(--border-1)]' : ''}`}>
                    <span className={insufficient ? 'text-[var(--critical-soft-fg)] font-medium' : 'text-[var(--fg-1)]'}>{ri.item_name}</span>
                    <span className="text-[var(--fg-2)]">
                      {ri.quantity} {ri.unit}
                      {inv && ri.item_type === 'inventory' && (
                        <span className={`ml-2 text-[11px] ${insufficient ? 'text-[var(--critical-soft-fg)]' : 'text-[var(--fg-3)]'}`}>
                          ({inv.quantity} in stock)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2 px-4 py-4 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-sunken)' }}>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[var(--fg-3)]">Item</span>
                <span className="text-[13px] font-semibold text-[var(--fg-1)]">{request.item_name ?? request.item_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[var(--fg-3)]">Quantity</span>
                <span className="text-[13px] font-semibold text-[var(--fg-1)]">{request.quantity_requested}</span>
              </div>
            </div>
          )}

          {stockWarnings.length > 0 && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--caution-soft-bg)]">
              <AlertTriangle size={14} className="shrink-0 mt-[2px]" style={{ color: 'var(--caution-soft-fg)' }} />
              <div className="flex flex-col gap-[2px]">
                <p className="text-[12px] font-medium" style={{ color: 'var(--caution-soft-fg)' }}>Insufficient stock warning</p>
                {stockWarnings.map((w, i) => (
                  <p key={i} className="text-[12px]" style={{ color: 'var(--caution-soft-fg)' }}>
                    {w.name}: need {w.need}, have {w.have}
                  </p>
                ))}
              </div>
            </div>
          )}

          {request.notes && <p className="text-[12px] text-[var(--fg-3)]">Notes: {request.notes}</p>}
        </div>

        <div className="flex gap-2 justify-end px-6 pb-6">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary flex items-center gap-1"
            onClick={() => { onConfirm(request.id); onClose(); }}
          >
            <CheckCircle2 size={14} />
            Fulfill request
          </button>
        </div>
      </div>
    </div>
  );
}
