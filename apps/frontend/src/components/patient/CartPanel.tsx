import { Info, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CartItemRow } from './CartItemRow';
import type { CartItem } from '@/types';
import type { DeliveryType } from '@/hooks/usePharmacy';

interface CartPanelProps {
  cart: CartItem[];
  deliveryType: DeliveryType;
  onDeliveryChange: (t: DeliveryType) => void;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onPlaceOrder: () => void;
  total: number;
  insuranceDiscountPct?: number;
  insuranceName?: string;
}

export function CartPanel({ cart, deliveryType, onDeliveryChange, onIncrease, onDecrease, onRemove, onPlaceOrder, total, insuranceDiscountPct, insuranceName }: CartPanelProps) {
  const discountAmount = (insuranceDiscountPct ?? 0) > 0 ? Math.round(total * (insuranceDiscountPct! / 100)) : 0;
  const amountDue = total - discountAmount;
  return (
    <div className="card p-5 flex flex-col gap-4 sticky top-24">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[var(--fg-1)]">Your order</h3>
        {cart.length > 0 && <Badge variant="brand">{cart.length}</Badge>}
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <ShoppingBag size={28} className="text-[var(--fg-4)]" />
          <p className="text-[13px] text-[var(--fg-3)]">Your cart is empty</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {cart.map((item) => (
              <CartItemRow key={item.medicationId} item={item} onIncrease={onIncrease} onDecrease={onDecrease} onRemove={onRemove} />
            ))}
          </ul>

          <hr className="border-[var(--border-1)]" />

          <div className="flex flex-col gap-1 text-[13px]">
            <div className="flex justify-between text-[var(--fg-2)]">
              <span>Subtotal</span>
              <span>{total > 0 ? `${total.toLocaleString()} EGP` : '—'}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[var(--positive-soft-fg)]">
                <span>{insuranceName ?? 'Insurance'} ({insuranceDiscountPct}%)</span>
                <span>−{discountAmount.toLocaleString()} EGP</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-[var(--fg-1)] mt-1">
              <span>You pay</span>
              <span>{total > 0 ? `${amountDue.toLocaleString()} EGP` : '—'}</span>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium text-[var(--fg-3)] uppercase tracking-[0.06em]">Delivery</p>
        <div className="flex gap-[6px] bg-[var(--sand-100)] p-1 rounded-[var(--radius-md)]">
          {(['pickup', 'home'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onDeliveryChange(type)}
              className={`flex-1 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors capitalize ${
                deliveryType === type ? 'bg-[var(--bg-surface)] text-[var(--fg-1)] shadow-[var(--shadow-xs)]' : 'text-[var(--fg-2)]'
              }`}
            >
              {type === 'pickup' ? 'Pick up' : 'Home delivery'}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onPlaceOrder} disabled={cart.length === 0} className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed">
        Send order to pharmacy
      </button>

      <div className="flex gap-2 p-3 bg-[var(--info-soft-bg)] text-[var(--info-soft-fg)] rounded-[var(--radius-md)] text-[12px]">
        <Info size={14} className="shrink-0 mt-[1px]" />
        <span>Prescription items require a valid prescription on file.</span>
      </div>
    </div>
  );
}
