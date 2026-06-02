'use client';
import { useState } from 'react';
import { ShoppingCart, ClipboardList, ShoppingBag } from 'lucide-react';
import { usePharmacy } from '@/hooks/patient';
import { MedicationCatalog } from '@/components/patient/MedicationCatalog';
import { CartPanel } from '@/components/patient/CartPanel';
import { PrescriptionSelectModal } from '@/components/patient/PrescriptionSelectModal';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import type { PharmTab } from '@/hooks/patient';

const TABS: { key: PharmTab; label: string }[] = [
  { key: 'catalog', label: 'Catalog' },
  { key: 'prescriptions', label: 'My Prescriptions' },
  { key: 'orders', label: 'Orders' },
];

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-1)] text-[13px]';

const cartProps = (hook: ReturnType<typeof usePharmacy>) => ({
  cart: hook.cart,
  deliveryType: hook.deliveryType,
  onDeliveryChange: hook.setDeliveryType,
  onIncrease: (id: string) => hook.updateQuantity(id, 1),
  onDecrease: (id: string) => hook.updateQuantity(id, -1),
  onRemove: hook.removeFromCart,
  onPlaceOrder: hook.placeOrder,
  total: hook.cartTotal,
  insuranceDiscountPct: hook.insuranceDiscountPct,
  insuranceName: hook.insuranceName,
});

export default function PharmacyPage() {
  const [cartOpen, setCartOpen] = useState(false);

  const hook = usePharmacy();
  const {
    medications,
    cart,
    prescriptions,
    orders,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isLoading,
    cartTotal,
    rxModalMedId,
    setRxModalMedId,
    pendingMed,
    confirmRxAdd,
    insuranceDiscountPct,
  } = hook;

  const discountAmt = (insuranceDiscountPct ?? 0) > 0 ? Math.round(cartTotal * (insuranceDiscountPct! / 100)) : 0;
  const amountDue = cartTotal - discountAmt;

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-0">
      <div>
        <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Pharmacy</p>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">Order medications</h1>
      </div>

      <div className="flex gap-1 border-b border-[var(--border-1)] pb-px overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeTab === key ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--fg-3)] hover:text-[var(--fg-1)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-[1fr_360px]">
        <div>
          {activeTab === 'catalog' && (
            <MedicationCatalog
              medications={medications}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onAdd={hook.addToCart}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'prescriptions' && (
            <div className="card">
              {prescriptions.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<ClipboardList />}
                    title="No prescriptions"
                    description="Your prescriptions will appear here once issued by your doctor."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={thClass}>Prescription</th>
                        <th className={thClass}>Medications</th>
                        <th className={thClass}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((rx) => (
                        <tr key={rx.id} className="hover:bg-[var(--sand-50)]">
                          <td className={tdClass}>
                            <span className="font-mono text-[12px] text-[var(--fg-3)]">#{rx.id.slice(0, 8)}</span>
                          </td>
                          <td className={tdClass}>{rx.items.map((i) => i.medication_name).join(', ')}</td>
                          <td className={`${tdClass} text-[var(--fg-3)]`}>{new Date(rx.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="card">
              {orders.length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={<ShoppingBag />} title="No orders" description="Your pharmacy orders will appear here." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={thClass}>Order</th>
                        <th className={thClass}>Items</th>
                        <th className={thClass}>Total</th>
                        <th className={thClass}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-[var(--sand-50)]">
                          <td className={tdClass}>
                            <span className="font-mono text-[12px] text-[var(--fg-3)]">#{order.id.slice(0, 8)}</span>
                          </td>
                          <td className={tdClass}>{order.items.length} item(s)</td>
                          <td className={`${tdClass} tabular-nums`}>{order.total_amount.toLocaleString()} LBP</td>
                          <td className={tdClass}>
                            <Badge variant={order.status === 'dispensed' ? 'positive' : order.status === 'cancelled' ? 'neutral' : 'caution'} dot>
                              {order.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop: sticky sidebar cart */}
        <div className="hidden md:block">
          <CartPanel {...cartProps(hook)} />
        </div>
      </div>

      {/* Mobile: sticky bottom cart bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-surface)] border-t border-[var(--border-1)] px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">
            {cart.length > 0 ? `${cart.length} item${cart.length !== 1 ? 's' : ''}` : 'Cart is empty'}
          </p>
          {cartTotal > 0 && <p className="text-[12px] text-[var(--fg-3)]">You pay {amountDue.toLocaleString()} EGP</p>}
        </div>
        <button
          onClick={() => setCartOpen(true)}
          disabled={cart.length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={16} />
          View cart
          {cart.length > 0 && <span className="bg-white/20 text-white text-[11px] font-semibold rounded-full px-[6px] py-[1px]">{cart.length}</span>}
        </button>
      </div>

      {/* Mobile: cart bottom sheet */}
      <ModalSheet open={cartOpen} onOpenChange={setCartOpen} maxWidth="md:w-[400px]">
        <div className="overflow-y-auto">
          <CartPanel {...cartProps(hook)} />
        </div>
      </ModalSheet>

      <PrescriptionSelectModal
        open={!!rxModalMedId}
        onClose={() => setRxModalMedId(null)}
        prescriptions={prescriptions}
        onSelect={(prescriptionId) => {
          if (pendingMed) confirmRxAdd(prescriptionId);
        }}
      />
    </div>
  );
}
