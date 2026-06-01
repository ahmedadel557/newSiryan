'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ShoppingCart, Trash2, ArrowLeftRight, X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { LowStockBanner } from '@/components/staff/inventory/LowStockBanner';
import { InventoryTable } from '@/components/staff/inventory/InventoryTable';
import { SupplyRequestsTable } from '@/components/staff/inventory/SupplyRequestsTable';
import { AddItemModal } from '@/components/staff/inventory/AddItemModal';
import { EditItemModal } from '@/components/staff/inventory/EditItemModal';
import { FulfillConfirmModal } from '@/components/staff/inventory/FulfillConfirmModal';
import { BudgetGauge } from '@/components/staff/inventory/BudgetGauge';
import { LogWasteModal } from '@/components/staff/inventory/LogWasteModal';
import { TransferStockModal } from '@/components/staff/inventory/TransferStockModal';
import { CreatePurchaseOrderModal } from '@/components/staff/inventory/CreatePurchaseOrderModal';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/useToast';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { Badge } from '@/components/ui/Badge';
import type { BudgetSummary, InventoryItem, CreatePurchaseOrderDto } from '@/types';

export default function InventoryDashboardPage() {
  const { showToast } = useToast();
  const {
    items,
    supplyRequests,
    lowStock,
    rooms,
    suppliers,
    isLoading,
    addModalOpen,
    setAddModalOpen,
    editItem,
    setEditItem,
    deleteConfirmId,
    setDeleteConfirmId,
    fulfillConfirmId,
    setFulfillConfirmId,
    addItem,
    updateItem,
    deleteItem,
    fulfillRequest,
    stats,
  } = useInventory();

  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [expiring, setExpiring] = useState<{ urgent: InventoryItem[]; warning: InventoryItem[] }>({ urgent: [], warning: [] });
  const [activePOs, setActivePOs] = useState(0);
  const [budgetAlertDismissed, setBudgetAlertDismissed] = useState(false);
  const [logWasteOpen, setLogWasteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [createPOOpen, setCreatePOOpen] = useState(false);

  useEffect(() => {
    inventoryService.getBudget().then(setBudget).catch(() => {});
    inventoryService.getExpiringItems().then(setExpiring).catch(() => {});
    inventoryService.getPurchaseOrders().then((orders) => {
      setActivePOs(orders.filter((o) => o.status === 'ordered' || o.status === 'shipped').length);
    }).catch(() => {});
  }, []);

  useSocketEvent<{ item_name: string }>('inventory:low_stock', useCallback(() => {
    showToast('Low stock alert — check inventory items', 'info');
  }, [showToast]));

  useSocketEvent<{ items_count: number }>('inventory:supply_request:new', useCallback(() => {
    showToast('New supply request received', 'info');
  }, [showToast]));

  useSocketEvent<{ items: { name: string }[] }>('inventory:expiry_urgent', useCallback((payload) => {
    showToast(`Urgent: ${payload.items.length} item(s) expiring soon`, 'error');
  }, [showToast]));

  useSocketEvent<{ spent: number; budget: number; percentage: number; level?: string }>(
    'inventory:budget_alert',
    useCallback((payload) => {
      setBudget((prev) => prev ? { ...prev, percentage: payload.percentage, spent: payload.spent } : null);
      setBudgetAlertDismissed(false);
      const msg = payload.level === 'critical' ? 'Budget fully depleted!' : `Budget at ${payload.percentage}% — monitor spending`;
      showToast(msg, payload.level === 'critical' ? 'error' : 'info');
    }, [showToast])
  );

  useSocketEvent<{ order_id: string }>('inventory:purchase_order:received', useCallback(() => {
    setActivePOs((n) => Math.max(0, n - 1));
  }, []));

  const fulfillTarget = supplyRequests.find((r) => r.id === fulfillConfirmId) ?? null;
  const pendingRequests = supplyRequests.filter((r) => r.status === 'pending');
  const outOfStock = items.filter((i) => i.quantity === 0);

  const kpiCards = [
    { label: 'Total item types', value: stats.totalTypes },
    { label: 'Low stock', value: stats.totalLowStock, tone: stats.totalLowStock > 0 ? ('critical' as const) : undefined },
    { label: 'Expiring soon', value: stats.expiringSoon, tone: stats.expiringSoon > 0 ? ('caution' as const) : undefined },
    { label: 'Pending requests', value: stats.pendingRequests, meta: 'awaiting fulfillment' },
    { label: 'Active POs', value: activePOs },
  ];

  async function handleLogWaste(data: Parameters<typeof inventoryService.logWaste>[0]) {
    try {
      await inventoryService.logWaste(data);
      showToast('Waste logged', 'success');
    } catch {
      showToast('Failed to log waste', 'error');
      throw new Error('failed');
    }
  }

  async function handleTransfer(data: Parameters<typeof inventoryService.transferStock>[0]) {
    try {
      await inventoryService.transferStock(data);
      showToast('Stock transferred', 'success');
    } catch {
      showToast('Failed to transfer stock', 'error');
      throw new Error('failed');
    }
  }

  async function handleCreatePO(data: CreatePurchaseOrderDto) {
    try {
      const result = await inventoryService.createPurchaseOrder(data);
      showToast('Purchase order created', 'success');
      setActivePOs((n) => n + 1);
      return result;
    } catch {
      showToast('Failed to create purchase order', 'error');
      throw new Error('failed');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Stock Overview</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {stats.totalTypes} item type{stats.totalTypes !== 1 ? 's' : ''} · {stats.belowThreshold} below reorder threshold
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost text-[13px] flex items-center gap-1" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight size={14} /> Transfer
          </button>
          <button className="btn btn-ghost text-[13px] flex items-center gap-1" onClick={() => setLogWasteOpen(true)}>
            <Trash2 size={14} /> Log Waste
          </button>
          <button className="btn btn-secondary text-[13px] flex items-center gap-1" onClick={() => setCreatePOOpen(true)}>
            <ShoppingCart size={14} /> Create PO
          </button>
          <button className="btn btn-primary text-[13px] flex items-center gap-1" onClick={() => setAddModalOpen(true)}>
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      <LowStockBanner lowStock={lowStock} />

      {budget && budget.percentage >= 80 && !budgetAlertDismissed && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-md)] border text-[13px]"
          style={{
            background: budget.percentage >= 100 ? 'var(--critical-soft-bg)' : 'var(--caution-soft-bg)',
            borderColor: budget.percentage >= 100 ? 'var(--critical-soft-fg)' : 'var(--caution-soft-fg)',
            color: budget.percentage >= 100 ? 'var(--critical-soft-fg)' : 'var(--caution-soft-fg)',
          }}
        >
          <span className="font-medium">
            {budget.percentage >= 100
              ? `Budget depleted — ${budget.spent.toLocaleString('en-EG')} EGP spent of ${budget.budget.toLocaleString('en-EG')} EGP budget`
              : `Budget at ${budget.percentage}% — ${budget.spent.toLocaleString('en-EG')} EGP of ${budget.budget.toLocaleString('en-EG')} EGP`}
          </span>
          <button onClick={() => setBudgetAlertDismissed(true)} className="shrink-0 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <DoctorKPIStrip cards={kpiCards} />

      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        <div className="card flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">Urgent Alerts</p>
          {expiring.urgent.length === 0 && outOfStock.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)] py-4 text-center">No urgent alerts</p>
          ) : (
            <div className="flex flex-col gap-1">
              {outOfStock.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--border-1)]">
                  <span className="text-[13px] text-[var(--fg-1)] truncate">{item.name}</span>
                  <Badge variant="critical" dot>Out of stock</Badge>
                </div>
              ))}
              {expiring.urgent.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--border-1)]">
                  <span className="text-[13px] text-[var(--fg-1)] truncate">{item.name}</span>
                  <Badge variant="caution" dot>Expires {item.expiry_date?.slice(0, 10)}</Badge>
                </div>
              ))}
              {(outOfStock.length + expiring.urgent.length) > 6 && (
                <p className="text-[12px] text-[var(--fg-3)] text-center pt-1">
                  +{outOfStock.length + expiring.urgent.length - 6} more alerts
                </p>
              )}
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">Monthly Budget</p>
          {budget ? (
            <BudgetGauge budget={budget.budget} spent={budget.spent} percentage={budget.percentage} />
          ) : (
            <p className="text-[13px] text-[var(--fg-3)] py-4 text-center">No budget set for this month</p>
          )}
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Inventory</p>
          <InventoryTable items={items.slice(0, 8)} isLoading={isLoading} onEdit={setEditItem} onDelete={setDeleteConfirmId} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Pending requests</p>
          <SupplyRequestsTable requests={pendingRequests} isLoading={isLoading} onFulfill={setFulfillConfirmId} limit={5} />
        </div>
      </div>

      {deleteConfirmId && (() => {
        const target = items.find((i) => i.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[380px] p-6 flex flex-col gap-4">
              <p className="text-[16px] font-semibold text-[var(--fg-1)]">Delete item</p>
              <p className="text-[14px] text-[var(--fg-2)]">Delete <span className="font-semibold">{target?.name}</span>? This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ background: 'var(--critical-soft-fg)' }}
                  onClick={() => { deleteItem(deleteConfirmId); setDeleteConfirmId(null); }}>Delete</button>
              </div>
            </div>
          </div>
        );
      })()}

      <AddItemModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={addItem} rooms={rooms} />
      <EditItemModal item={editItem} onClose={() => setEditItem(null)} onSubmit={updateItem} />
      <FulfillConfirmModal request={fulfillTarget} onClose={() => setFulfillConfirmId(null)} onConfirm={fulfillRequest} items={items} />
      <LogWasteModal open={logWasteOpen} items={items} onClose={() => setLogWasteOpen(false)} onSubmit={handleLogWaste} />
      <TransferStockModal open={transferOpen} items={items} onClose={() => setTransferOpen(false)} onSubmit={handleTransfer} />
      <CreatePurchaseOrderModal open={createPOOpen} items={items} suppliers={suppliers} onClose={() => setCreatePOOpen(false)} onSubmit={handleCreatePO} />
    </div>
  );
}
