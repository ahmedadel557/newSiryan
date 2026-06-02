'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Plus, Trash2, Pencil } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { inventoryService } from '@/services/inventory.service';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddRoomModal } from '@/components/staff/inventory/AddRoomModal';
import { useToast } from '@/hooks/shared';
import type { RoomDetail, InventoryItem, AddRoomDto } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';
const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

const statusVariant: Record<RoomDetail['status'], 'positive' | 'caution' | 'critical'> = {
  available: 'positive',
  occupied: 'caution',
  maintenance: 'critical',
};

const typeLabel: Record<RoomDetail['type'], string> = {
  operation: 'Operation',
  icu: 'ICU',
  radiology: 'Radiology',
  general: 'General',
};

function occupancyColor(current: number, capacity: number): string {
  if (current >= capacity) return 'var(--critical-soft-fg)';
  if (current >= capacity * 0.8) return 'var(--caution-soft-fg)';
  return 'var(--positive-soft-fg)';
}

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addingItem, setAddingItem] = useState(false);

  const [removeConfirmItemId, setRemoveConfirmItemId] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);

  const loadRoom = useCallback(async () => {
    try {
      const data = await inventoryService.getRoomById(id);
      setRoomDetail(data);
    } catch {
      showToast('Failed to load room', 'error');
    }
  }, [id, showToast]);

  useEffect(() => {
    setLoadingRoom(true);
    Promise.all([inventoryService.getRoomById(id), inventoryService.getItems()])
      .then(([room, items]) => {
        setRoomDetail(room);
        setAllItems(items);
      })
      .catch(() => showToast('Failed to load room data', 'error'))
      .finally(() => setLoadingRoom(false));
  }, [id, showToast]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemId || !roomDetail) return;
    setAddingItem(true);
    try {
      await inventoryService.addItemToRoom(id, { item_id: selectedItemId, quantity: Number(addQty) });
      showToast('Item added to room', 'success');
      setAddItemOpen(false);
      setSelectedItemId('');
      setAddQty('1');
      await loadRoom();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to add item';
      showToast(msg, 'error');
    } finally {
      setAddingItem(false);
    }
  }

  async function handleRemoveItem() {
    if (!removeConfirmItemId) return;
    setRemovingItem(true);
    try {
      await inventoryService.removeItemFromRoom(id, removeConfirmItemId);
      showToast('Item removed from room', 'success');
      setRemoveConfirmItemId(null);
      await loadRoom();
    } catch {
      showToast('Failed to remove item', 'error');
    } finally {
      setRemovingItem(false);
    }
  }

  async function handleUpdateRoom(data: AddRoomDto) {
    try {
      await inventoryService.updateRoom(id, data);
      showToast('Room updated', 'success');
      setEditOpen(false);
      await loadRoom();
    } catch {
      showToast('Failed to update room', 'error');
    }
  }

  async function handleDeleteRoom() {
    setDeletingRoom(true);
    try {
      await inventoryService.deleteRoom(id);
      showToast('Room deleted', 'success');
      router.push('/dashboard/inventory/rooms');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete room';
      showToast(msg, 'error');
      setDeleteConfirmOpen(false);
    } finally {
      setDeletingRoom(false);
    }
  }

  const selectedItem = allItems.find((i) => i.id === selectedItemId);
  const isBedItem = selectedItem?.category === 'bed';

  if (loadingRoom) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-48 rounded bg-[var(--sand-100)] animate-pulse" />
        <div className="h-24 rounded bg-[var(--sand-100)] animate-pulse" />
        <div className="h-48 rounded bg-[var(--sand-100)] animate-pulse" />
      </div>
    );
  }

  if (!roomDetail) {
    return (
      <div className="card p-10">
        <EmptyState icon={<Package />} title="Room not found" description="This room does not exist or has been deleted." />
      </div>
    );
  }

  const occ = roomDetail.current_occupancy ?? 0;
  const occPct = roomDetail.capacity > 0 ? Math.min(100, Math.round((occ / roomDetail.capacity) * 100)) : 0;
  const occColor = occupancyColor(occ, roomDetail.capacity);
  const availBeds = roomDetail.available_beds ?? roomDetail.capacity - occ;
  const removeItem = roomDetail.items.find((i) => i.id === removeConfirmItemId);

  const kpiCards = [
    { label: 'Type', value: typeLabel[roomDetail.type] },
    { label: 'Floor', value: `Floor ${roomDetail.floor}` },
    { label: 'Max capacity', value: roomDetail.capacity },
    { label: 'Price/day', value: `$${roomDetail.price_per_day.toLocaleString()}` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <Link href="/dashboard/inventory/rooms" className="text-[12px] text-[var(--fg-3)] hover:text-[var(--fg-1)] flex items-center gap-1 mb-2">
            <ArrowLeft size={12} /> Rooms
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">{roomDetail.name}</h1>
            <Badge variant="neutral" className="text-black">
              {typeLabel[roomDetail.type]}
            </Badge>
            <Badge variant={statusVariant[roomDetail.status]} dot>
              {roomDetail.status.charAt(0).toUpperCase() + roomDetail.status.slice(1)}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="btn btn-ghost text-[13px] flex items-center gap-1">
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="btn btn-ghost text-[13px] flex items-center gap-1"
            style={{ color: 'var(--critical-soft-fg)' }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="card p-5 flex flex-col gap-3">
        <p className="text-[14px] font-semibold text-[var(--fg-1)]">Bed occupancy</p>
        <div className="flex flex-col gap-2">
          <div className="h-[8px] rounded-full bg-[var(--sand-100)] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${occPct}%`, background: occColor }} />
          </div>
          <span className="text-[13px]" style={{ color: occColor }}>
            {occ} of {roomDetail.capacity} beds occupied
            {availBeds > 0 && <span className="text-[var(--fg-3)]"> · {availBeds} available</span>}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-[14px] py-3 border-b border-[var(--border-1)]">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Room contents</p>
          <button onClick={() => setAddItemOpen(true)} className="btn btn-primary text-[12px] flex items-center gap-1 py-[5px]">
            <Plus size={13} /> Add item
          </button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Name', 'Category', 'Qty', 'Unit', ''].map((h, i) => (
                <th key={i} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roomDetail.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10">
                  <EmptyState icon={<Package />} title="No items" description="No items assigned to this room yet." />
                </td>
              </tr>
            ) : (
              roomDetail.items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)] transition-colors">
                  <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{item.name}</td>
                  <td className={tdClass}>
                    <Badge variant="neutral" className="text-black">
                      {item.category}
                    </Badge>
                  </td>
                  <td className={`${tdClass} text-[var(--fg-2)]`}>{item.quantity}</td>
                  <td className={`${tdClass} text-[var(--fg-2)]`}>{item.unit}</td>
                  <td className={`${tdClass} text-right`}>
                    <button
                      onClick={() => setRemoveConfirmItemId(item.id)}
                      className="btn btn-ghost text-[12px] py-[4px] flex items-center gap-1 ml-auto"
                      style={{ color: 'var(--critical-soft-fg)' }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add item to room modal */}
      <Dialog.Root open={addItemOpen} onOpenChange={(v) => !v && setAddItemOpen(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[480px] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
                <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Add item to room</Dialog.Title>
              </div>
              <form onSubmit={handleAddItem} className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Item *</label>
                  <select
                    required
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setAddQty('1');
                    }}
                    className={inputClass}
                  >
                    <option value="">— Select an item —</option>
                    {allItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category}, {item.quantity} {item.unit} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Quantity *</label>
                  <input required type="number" min="1" value={addQty} onChange={(e) => setAddQty(e.target.value)} className={inputClass} />
                </div>
                {isBedItem && (
                  <div
                    className="rounded-[var(--radius-md)] p-3 text-[12px]"
                    style={{ background: 'var(--caution-soft-bg)', color: 'var(--caution-soft-fg)' }}
                  >
                    This room holds <strong>{roomDetail.capacity}</strong> beds. <strong>{occ}</strong> currently assigned. Max{' '}
                    <strong>{availBeds}</strong> more can be added.
                    {Number(addQty) > availBeds && (
                      <p className="mt-1 font-semibold" style={{ color: 'var(--critical-soft-fg)' }}>
                        Quantity exceeds available capacity.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setAddItemOpen(false)} className="btn btn-ghost flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={addingItem || (isBedItem && Number(addQty) > availBeds)} className="btn btn-primary flex-1">
                    {addingItem ? 'Adding…' : 'Add item'}
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Remove item confirm */}
      {removeConfirmItemId && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[380px] p-6 flex flex-col gap-4">
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">Remove item</p>
            <p className="text-[13px] text-[var(--fg-2)]">
              Remove <strong>{removeItem?.name}</strong> from this room?
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setRemoveConfirmItemId(null)} className="btn btn-ghost flex-1">
                Cancel
              </button>
              <button
                onClick={handleRemoveItem}
                disabled={removingItem}
                className="btn btn-primary flex-1"
                style={{ background: 'var(--critical-soft-fg)', borderColor: 'var(--critical-soft-fg)' }}
              >
                {removingItem ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit room modal */}
      <AddRoomModal open={editOpen} room={roomDetail as any} onClose={() => setEditOpen(false)} onSubmit={handleUpdateRoom} />

      {/* Delete room confirm */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[380px] p-6 flex flex-col gap-4">
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">Delete room</p>
            <p className="text-[13px] text-[var(--fg-2)]">
              Are you sure you want to delete <strong>{roomDetail.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDeleteConfirmOpen(false)} className="btn btn-ghost flex-1">
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                disabled={deletingRoom}
                className="btn btn-primary flex-1"
                style={{ background: 'var(--critical-soft-fg)', borderColor: 'var(--critical-soft-fg)' }}
              >
                {deletingRoom ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
