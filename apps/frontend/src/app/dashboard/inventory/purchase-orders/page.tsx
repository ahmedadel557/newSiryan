'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { useInventory } from '@/hooks/inventory';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CreatePurchaseOrderModal } from '@/components/staff/inventory/CreatePurchaseOrderModal';
import { useToast } from '@/hooks/shared';
import { getStatusVariant } from '@/lib/statusBadge';
import type { PurchaseOrder, CreatePurchaseOrderDto, Supplier } from '@/types';

type StatusTab = 'all' | PurchaseOrder['status'];

const STATUS_TABS: StatusTab[] = ['all', 'draft', 'ordered', 'shipped', 'received', 'cancelled'];

const thClass = 'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

export default function PurchaseOrdersPage() {
  const { showToast } = useToast();
  const { items, suppliers } = useInventory();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setIsLoading(true);
    try {
      const data = await inventoryService.getPurchaseOrders();
      setOrders(data);
    } catch {
      showToast('Failed to load purchase orders', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = tab === 'all' ? orders : orders.filter((o) => o.status === tab);

  const counts = {
    draft: orders.filter((o) => o.status === 'draft').length,
    ordered: orders.filter((o) => o.status === 'ordered').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    received: orders.filter((o) => o.status === 'received').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const kpiCards = [
    { label: 'Total orders', value: orders.length },
    { label: 'Pending', value: counts.ordered + counts.shipped, tone: (counts.ordered + counts.shipped) > 0 ? ('caution' as const) : undefined },
    { label: 'Received', value: counts.received, tone: counts.received > 0 ? ('positive' as const) : undefined },
    { label: 'Draft', value: counts.draft },
  ];

  async function handleCreatePO(data: CreatePurchaseOrderDto) {
    try {
      const result = await inventoryService.createPurchaseOrder(data);
      setOrders((prev) => [result.order, ...prev]);
      showToast('Purchase order created', 'success');
      return result;
    } catch {
      showToast('Failed to create purchase order', 'error');
      throw new Error('failed');
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    setActionLoading(id);
    try {
      const updated = await inventoryService.updatePurchaseOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast('Status updated', 'success');
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReceive(id: string) {
    setActionLoading(id);
    try {
      const updated = await inventoryService.receivePurchaseOrder(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      showToast('Order received — stock updated', 'success');
    } catch {
      showToast('Failed to receive order', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const supplierName = (s: PurchaseOrder['supplier']) =>
    typeof s === 'object' ? (s as Supplier).name : s;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Purchase Orders</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Manage supplier purchase orders and receive stock</p>
        </div>
        <button className="btn btn-primary text-[13px] flex items-center gap-1" onClick={() => setCreateOpen(true)}>
          <ShoppingCart size={14} /> Create Order
        </button>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px] w-fit flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors capitalize',
              tab === t ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]' : 'text-[var(--fg-3)] hover:text-black/80',
            ].join(' ')}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Supplier', 'Items', 'Total', 'Expected Delivery', 'Status', 'Created', 'Actions'].map((h) => (
                <th key={h} className={thClass}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className={tdClass}><div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12">
                  <EmptyState icon={<ShoppingCart />} title="No purchase orders" description="Create a purchase order to get started." />
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <>
                  <tr
                    key={order.id}
                    className="hover:bg-[var(--sand-50)] transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <td className={`${tdClass} font-medium text-[var(--fg-1)]`}>{supplierName(order.supplier)}</td>
                    <td className={`${tdClass} text-[var(--fg-2)]`}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                    <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>EGP {order.total_amount.toFixed(2)}</td>
                    <td className={`${tdClass} text-[var(--fg-3)]`}>{order.expected_delivery_date?.slice(0, 10) ?? '—'}</td>
                    <td className={tdClass}>
                      <Badge variant={getStatusVariant(order.status)} dot>{order.status}</Badge>
                    </td>
                    <td className={`${tdClass} text-[var(--fg-3)]`}>{order.createdAt?.slice(0, 10)}</td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        {order.status !== 'received' && order.status !== 'cancelled' && (
                          <>
                            {order.status !== 'shipped' && (
                              <button
                                disabled={actionLoading === order.id}
                                onClick={() => handleUpdateStatus(order.id, order.status === 'draft' ? 'ordered' : 'shipped')}
                                className="btn btn-ghost text-[12px] py-[4px]"
                              >
                                {order.status === 'draft' ? 'Place Order' : 'Mark Shipped'}
                              </button>
                            )}
                            <button
                              disabled={actionLoading === order.id}
                              onClick={() => setReceiveTarget(order)}
                              className="btn btn-primary text-[12px] py-[4px]"
                            >
                              {actionLoading === order.id ? '…' : 'Receive'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr key={`${order.id}-detail`}>
                      <td colSpan={7} className="px-[14px] pb-4 bg-[var(--sand-50)]">
                        <div className="pt-3 flex flex-col gap-2">
                          <p className="text-[11px] uppercase tracking-wider font-medium text-[var(--fg-3)]">Order items</p>
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-[13px] py-1 border-b border-[var(--border-1)]">
                              <span className="text-[var(--fg-1)]">{item.item_name}</span>
                              <span className="text-[var(--fg-2)]">
                                {item.quantity} {item.unit} × EGP {item.unit_price.toFixed(2)}
                                {' = '}
                                <span className="font-semibold">EGP {(item.quantity * item.unit_price).toFixed(2)}</span>
                              </span>
                            </div>
                          ))}
                          {order.notes && <p className="text-[12px] text-[var(--fg-3)] pt-1">Note: {order.notes}</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreatePurchaseOrderModal open={createOpen} items={items} suppliers={suppliers} onClose={() => setCreateOpen(false)} onSubmit={handleCreatePO} />

      {receiveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setReceiveTarget(null); }}
        >
          <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[480px] p-6 flex flex-col gap-4">
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Confirm Receipt</p>
            <p className="text-[13px] text-[var(--fg-2)]">
              Supplier: <span className="font-medium">{supplierName(receiveTarget.supplier)}</span>
            </p>
            <div className="border border-[var(--border-1)] rounded-[var(--radius-md)] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[var(--sand-50)]">
                    <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-[var(--fg-3)] font-medium">Item</th>
                    <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-[var(--fg-3)] font-medium">Qty</th>
                    <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-[var(--fg-3)] font-medium">Unit Price</th>
                    <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-[var(--fg-3)] font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveTarget.items.map((item, i) => (
                    <tr key={i} className="border-t border-[var(--border-1)]">
                      <td className="py-2 px-3 text-[var(--fg-1)]">{item.item_name}</td>
                      <td className="py-2 px-3 text-right text-[var(--fg-2)]">{item.quantity} {item.unit}</td>
                      <td className="py-2 px-3 text-right text-[var(--fg-2)]">EGP {item.unit_price.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-medium text-[var(--fg-1)]">EGP {(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-[var(--fg-3)] bg-[var(--caution-soft-bg)] px-3 py-2 rounded-[var(--radius-md)]">
              Receiving will immediately add these quantities to stock. Ensure physical delivery matches this order before confirming.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button className="btn btn-ghost" onClick={() => setReceiveTarget(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={actionLoading === receiveTarget.id}
                onClick={() => {
                  handleReceive(receiveTarget.id);
                  setReceiveTarget(null);
                }}
              >
                {actionLoading === receiveTarget.id ? 'Receiving…' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
