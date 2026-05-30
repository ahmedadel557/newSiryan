'use client';

import { Plus } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { LowStockBanner } from '@/components/staff/inventory/LowStockBanner';
import { InventoryTable } from '@/components/staff/inventory/InventoryTable';
import { SupplyRequestsTable } from '@/components/staff/inventory/SupplyRequestsTable';
import { AddItemModal } from '@/components/staff/inventory/AddItemModal';
import { EditItemModal } from '@/components/staff/inventory/EditItemModal';
import { FulfillConfirmModal } from '@/components/staff/inventory/FulfillConfirmModal';

export default function InventoryDashboardPage() {
  const {
    items,
    supplyRequests,
    lowStock,
    rooms,
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

  const fulfillTarget = supplyRequests.find((r) => r.id === fulfillConfirmId) ?? null;
  const pendingRequests = supplyRequests.filter((r) => r.status === 'pending');

  const kpiCards = [
    { label: 'Total item types', value: stats.totalTypes },
    { label: 'Low stock', value: stats.totalLowStock, tone: stats.totalLowStock > 0 ? ('critical' as const) : undefined },
    { label: 'Pending requests', value: stats.pendingRequests, meta: 'awaiting fulfillment' },
    { label: 'Items expiring soon', value: stats.expiringSoon, tone: stats.expiringSoon > 0 ? ('caution' as const) : undefined },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Stock overview</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {stats.totalTypes} item type{stats.totalTypes !== 1 ? 's' : ''} · {stats.belowThreshold} below reorder threshold
          </p>
        </div>
        <button className="btn btn-primary text-[13px] flex items-center gap-1" onClick={() => setAddModalOpen(true)}>
          <Plus size={14} /> Add item
        </button>
      </div>

      <LowStockBanner lowStock={lowStock} />

      <DoctorKPIStrip cards={kpiCards} />

      <div className="grid gap-5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Inventory</p>
          <InventoryTable items={items} isLoading={isLoading} onEdit={setEditItem} onDelete={setDeleteConfirmId} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Supply requests</p>
          <SupplyRequestsTable requests={pendingRequests} isLoading={isLoading} onFulfill={setFulfillConfirmId} limit={5} />
        </div>
      </div>

      {deleteConfirmId &&
        (() => {
          const target = items.find((i) => i.id === deleteConfirmId);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setDeleteConfirmId(null);
              }}
            >
              <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[380px] p-6 flex flex-col gap-4">
                <p className="text-[16px] font-semibold text-[var(--fg-1)]">Delete item</p>
                <p className="text-[14px] text-[var(--fg-2)]">
                  Delete <span className="font-semibold">{target?.name}</span>? This cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <button className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ background: 'var(--critical-soft-fg)' }}
                    onClick={() => {
                      deleteItem(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      <AddItemModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={addItem} rooms={rooms} />
      <EditItemModal item={editItem} onClose={() => setEditItem(null)} onSubmit={updateItem} />
      <FulfillConfirmModal request={fulfillTarget} onClose={() => setFulfillConfirmId(null)} onConfirm={fulfillRequest} />
    </div>
  );
}
