'use client';

import { useEffect, useState } from 'react';
import { Warehouse, Trash2 } from 'lucide-react';
import { useInventory } from '@/hooks/inventory';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LogWasteModal } from '@/components/staff/inventory/LogWasteModal';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/shared';
import type { WarehouseEntry, Room, WasteEntry } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';
const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

const statusVariant: Record<WarehouseEntry['status'], 'caution' | 'neutral' | 'positive'> = {
  unassigned: 'caution',
  partial: 'neutral',
  assigned: 'positive',
};

const statusLabel: Record<WarehouseEntry['status'], string> = {
  unassigned: 'Unassigned',
  partial: 'Partial',
  assigned: 'Assigned',
};

type StatusFilter = 'all' | WarehouseEntry['status'];

// ── Assign Modal ──────────────────────────────────────────────────────────────

interface AssignModalProps {
  entry: WarehouseEntry | null;
  rooms: Room[];
  onClose: () => void;
  onSubmit: (entryId: string, data: { quantity: number; target_type: 'stock' | 'room'; room_id?: string }) => Promise<void>;
}

function AssignModal({ entry, rooms, onClose, onSubmit }: AssignModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [targetType, setTargetType] = useState<'stock' | 'room'>('stock');
  const [roomId, setRoomId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (entry) {
      setQuantity(entry.quantity_remaining > 0 ? entry.quantity_remaining : 1);
      setTargetType('stock');
      setRoomId('');
    }
  }, [entry]);

  if (!entry) return null;

  const isBed = entry.item_name?.toLowerCase().includes('bed');
  const selectedRoom = rooms.find((r) => r.id === roomId);
  const bedCapacityWarning =
    isBed && selectedRoom && targetType === 'room'
      ? `Room capacity: ${selectedRoom.capacity}, current occupancy: ${selectedRoom.current_occupancy}. Max additional beds: ${selectedRoom.capacity - selectedRoom.current_occupancy}.`
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity < 1 || quantity > entry!.quantity_remaining) return;
    if (targetType === 'room' && !roomId) return;
    setSubmitting(true);
    try {
      await onSubmit(entry!.id, {
        quantity,
        target_type: targetType,
        room_id: targetType === 'room' ? roomId : undefined,
      });
      onClose();
    } catch {
      /* handled by hook */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[420px] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Assign Item</p>
            <p className="text-[12px] text-[var(--fg-3)] mt-[2px]">{entry.item_name}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost text-[12px]">
            Cancel
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-[6px] p-3 rounded-[var(--radius-md)] bg-[var(--sand-50)] border border-[var(--border-1)]">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--fg-3)]">Available</span>
              <span className="font-semibold text-[var(--fg-1)]">
                {entry.quantity_remaining} {entry.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--fg-3)]">Total received</span>
              <span className="text-[var(--fg-2)]">
                {entry.quantity_total} {entry.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--fg-3)]">Already assigned</span>
              <span className="text-[var(--fg-2)]">
                {entry.quantity_assigned} {entry.unit}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Quantity to assign *</label>
            <input
              type="number"
              min={1}
              max={entry.quantity_remaining}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Assign to</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[var(--fg-1)]">
                <input
                  type="radio"
                  name="target_type"
                  value="stock"
                  checked={targetType === 'stock'}
                  onChange={() => setTargetType('stock')}
                  className="accent-[var(--brand)]"
                />
                Add to stock
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[var(--fg-1)]">
                <input
                  type="radio"
                  name="target_type"
                  value="room"
                  checked={targetType === 'room'}
                  onChange={() => setTargetType('room')}
                  className="accent-[var(--brand)]"
                />
                Assign to room
              </label>
            </div>
          </div>

          {targetType === 'room' && (
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Room *</label>
              <select required value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass}>
                <option value="">— Select room —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type}) — floor {r.floor}
                  </option>
                ))}
              </select>
              {bedCapacityWarning && <p className="text-[11px] text-[var(--caution-soft-fg)] mt-1">{bedCapacityWarning}</p>}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting || quantity < 1 || quantity > entry.quantity_remaining} className="btn btn-primary flex-1">
              {submitting ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PageTab = 'entries' | 'waste';
const COLS = ['Item', 'Type', 'Received', 'Assigned', 'Remaining', 'Unit', 'Status', 'Date', 'Actions'];
const WASTE_COLS = ['Item', 'Quantity', 'Reason', 'Department', 'Logged By', 'Date'];

export default function WarehousePage() {
  const { showToast } = useToast();
  const { warehouseEntries, items, rooms, isLoading, fetchWarehouseEntries, assignWarehouseEntry } = useInventory();

  const [pageTab, setPageTab] = useState<PageTab>('entries');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [assignEntry, setAssignEntry] = useState<WarehouseEntry | null>(null);
  const [logWasteOpen, setLogWasteOpen] = useState(false);
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [wasteLoading, setWasteLoading] = useState(false);

  useEffect(() => {
    fetchWarehouseEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pageTab === 'waste' && wasteEntries.length === 0) {
      setWasteLoading(true);
      inventoryService.getWasteEntries()
        .then(setWasteEntries)
        .catch(() => showToast('Failed to load waste entries', 'error'))
        .finally(() => setWasteLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTab]);

  async function handleLogWaste(data: Parameters<typeof inventoryService.logWaste>[0]) {
    try {
      const entry = await inventoryService.logWaste(data);
      setWasteEntries((prev) => [entry, ...prev]);
      showToast('Waste logged', 'success');
    } catch {
      showToast('Failed to log waste', 'error');
      throw new Error('failed');
    }
  }

  const filtered = statusFilter === 'all' ? warehouseEntries : warehouseEntries.filter((e) => e.status === statusFilter);

  const counts = {
    unassigned: warehouseEntries.filter((e) => e.status === 'unassigned').length,
    partial: warehouseEntries.filter((e) => e.status === 'partial').length,
    assigned: warehouseEntries.filter((e) => e.status === 'assigned').length,
  };

  const kpiCards = [
    { label: 'Unassigned', value: counts.unassigned, tone: counts.unassigned > 0 ? ('caution' as const) : undefined },
    { label: 'Partial', value: counts.partial },
    { label: 'Fully assigned', value: counts.assigned, tone: counts.assigned > 0 ? ('positive' as const) : undefined },
    { label: 'Total entries', value: warehouseEntries.length },
  ];

  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unassigned', label: 'Unassigned' },
    { id: 'partial', label: 'Partial' },
    { id: 'assigned', label: 'Assigned' },
  ];

  async function handleAssign(entryId: string, data: { quantity: number; target_type: 'stock' | 'room'; room_id?: string }) {
    await assignWarehouseEntry(entryId, data);
    fetchWarehouseEntries();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Warehouse</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Items received from shipments, pending assignment to stock or rooms</p>
        </div>
        <button className="btn btn-ghost text-[13px] flex items-center gap-1" onClick={() => setLogWasteOpen(true)}>
          <Trash2 size={14} /> Log Waste
        </button>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px] w-fit">
        {(['entries', 'waste'] as PageTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setPageTab(t)}
            className={[
              'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors capitalize',
              pageTab === t ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]' : 'text-[var(--fg-3)] hover:text-black/80',
            ].join(' ')}
          >
            {t === 'entries' ? 'Warehouse Entries' : 'Waste Log'}
          </button>
        ))}
      </div>

      {pageTab === 'waste' ? (
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>{WASTE_COLS.map((h) => <th key={h} className={thClass}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {wasteLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{WASTE_COLS.map((__, j) => <td key={j} className={tdClass}><div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" /></td>)}</tr>
                ))
              ) : wasteEntries.length === 0 ? (
                <tr><td colSpan={WASTE_COLS.length} className="py-12">
                  <EmptyState icon={<Trash2 />} title="No waste entries" description="Waste logged from inventory will appear here." />
                </td></tr>
              ) : wasteEntries.map((w) => (
                <tr key={w.id} className="hover:bg-[var(--sand-50)] transition-colors">
                  <td className={`${tdClass} font-medium text-[var(--fg-1)]`}>{w.item_name}</td>
                  <td className={tdClass}>{w.quantity}</td>
                  <td className={tdClass}>
                    <Badge variant={w.reason === 'expired' ? 'critical' : w.reason === 'damaged' ? 'caution' : 'neutral'} dot>{w.reason}</Badge>
                  </td>
                  <td className={`${tdClass} text-[var(--fg-3)]`}>{w.department ?? '—'}</td>
                  <td className={`${tdClass} text-[var(--fg-3)]`}>{typeof w.logged_by === 'object' ? w.logged_by.username : '—'}</td>
                  <td className={`${tdClass} text-[var(--fg-3)]`}>{w.createdAt?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <>
      <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px] w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={[
              'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors',
              statusFilter === tab.id
                ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]'
                : 'text-[var(--fg-3)] hover:text-black/80',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {COLS.map((h, i) => (
                <th key={i} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {COLS.map((__, j) => (
                    <td key={j} className={tdClass}>
                      <div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="py-12">
                  <EmptyState
                    icon={<Warehouse />}
                    title="No warehouse entries"
                    description={
                      statusFilter === 'all' ? 'Receive a shipment to add items to the warehouse.' : `No items with status "${statusFilter}".`
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)] transition-colors">
                  <td className={`${tdClass} font-medium text-[var(--fg-1)] max-w-[180px] truncate`}>{entry.item_name}</td>
                  <td className={tdClass}>
                    <Badge variant="neutral" className="text-black">
                      {entry.item_type === 'medication' ? 'Medication' : 'Inventory'}
                    </Badge>
                  </td>
                  <td className={`${tdClass} text-[var(--fg-2)]`}>{entry.quantity_total}</td>
                  <td className={`${tdClass} text-[var(--fg-2)]`}>{entry.quantity_assigned}</td>
                  <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{entry.quantity_remaining}</td>
                  <td className={`${tdClass} text-[var(--fg-3)]`}>{entry.unit}</td>
                  <td className={tdClass}>
                    <Badge variant={statusVariant[entry.status]} dot>
                      {statusLabel[entry.status]}
                    </Badge>
                  </td>
                  <td className={`${tdClass} text-[var(--fg-3)]`}>{entry.createdAt ? entry.createdAt.slice(0, 10) : '—'}</td>
                  <td className={`${tdClass} text-right`}>
                    <button
                      disabled={entry.status === 'assigned'}
                      onClick={() => setAssignEntry(entry)}
                      className="btn btn-ghost text-[12px] py-[4px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AssignModal entry={assignEntry} rooms={rooms} onClose={() => setAssignEntry(null)} onSubmit={handleAssign} />
      </>
      )}

      <LogWasteModal open={logWasteOpen} items={items} onClose={() => setLogWasteOpen(false)} onSubmit={handleLogWaste} />
    </div>
  );
}
