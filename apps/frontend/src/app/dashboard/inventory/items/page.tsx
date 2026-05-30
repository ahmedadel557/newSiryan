'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { InventoryTable } from '@/components/staff/inventory/InventoryTable';
import { AddItemModal } from '@/components/staff/inventory/AddItemModal';
import { EditItemModal } from '@/components/staff/inventory/EditItemModal';
import type { InventoryItem } from '@/types';

const CATEGORIES: (InventoryItem['category'] | 'all')[] = ['all', 'equipment', 'supply', 'bed', 'oxygen', 'other'];

export default function InventoryItemsPage() {
  const {
    items,
    rooms,
    isLoading,
    addModalOpen,
    setAddModalOpen,
    editItem,
    setEditItem,
    deleteConfirmId,
    setDeleteConfirmId,
    addItem,
    updateItem,
    deleteItem,
    stats,
  } = useInventory();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryItem['category'] | 'all'>('all');

  const filtered = items
    .filter((i) => categoryFilter === 'all' || i.category === categoryFilter)
    .filter((i) => !search.trim() || i.name.toLowerCase().includes(search.toLowerCase()));

  const kpiCards = [
    { label: 'Total items', value: stats.totalTypes },
    { label: 'Low stock', value: stats.belowThreshold, tone: stats.belowThreshold > 0 ? ('critical' as const) : undefined },
    { label: 'Expiring within 30d', value: stats.expiringSoon, tone: stats.expiringSoon > 0 ? ('caution' as const) : undefined },
    { label: 'Showing', value: filtered.length },
  ];

  const deleteTarget = items.find((i) => i.id === deleteConfirmId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Inventory Items</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Manage inventory items, update stock levels, and track expiry dates</p>
        </div>
        <button className="btn btn-primary text-[13px] flex items-center gap-1" onClick={() => setAddModalOpen(true)}>
          <Plus size={14} /> Add item
        </button>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 max-w-[320px] border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-[7px] text-[13px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
        />
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={[
                'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors capitalize',
                categoryFilter === cat
                  ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]'
                  : 'text-[var(--fg-3)] hover:text-black/80',
              ].join(' ')}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      <InventoryTable items={filtered} isLoading={isLoading} onEdit={setEditItem} onDelete={setDeleteConfirmId} />

      {deleteConfirmId && deleteTarget && (
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
              Delete <span className="font-semibold">{deleteTarget.name}</span>? This cannot be undone.
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
      )}

      <AddItemModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={addItem} rooms={rooms} />
      <EditItemModal item={editItem} onClose={() => setEditItem(null)} onSubmit={updateItem} rooms={rooms} />
    </div>
  );
}
