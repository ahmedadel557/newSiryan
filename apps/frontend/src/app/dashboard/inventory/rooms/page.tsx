'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useInventory } from '@/hooks/inventory';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddRoomModal } from '@/components/staff/inventory/AddRoomModal';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { getStatusVariant } from '@/lib/statusBadge';
import type { Room } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

type TypeFilter = 'all' | Room['type'];
type StatusFilter = 'all' | Room['status'];

const typeLabel: Record<Room['type'], string> = {
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

export default function InventoryRoomsPage() {
  const {
    rooms,
    isLoading,
    fetchRooms,
    updateRoomStatus,
    addRoomModalOpen,
    setAddRoomModalOpen,
    editRoom,
    setEditRoom,
    deleteRoomConfirmId,
    setDeleteRoomConfirmId,
    addRoom,
    updateRoom,
    deleteRoom,
  } = useInventory();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    fetchRooms();
  }, []);

  const filtered = rooms
    .filter((r) => typeFilter === 'all' || r.type === typeFilter)
    .filter((r) => statusFilter === 'all' || r.status === statusFilter);

  const available = rooms.filter((r) => r.status === 'available').length;
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const maintenance = rooms.filter((r) => r.status === 'maintenance').length;

  const kpiCards = [
    { label: 'Total rooms', value: rooms.length },
    { label: 'Available', value: available, tone: available > 0 ? ('positive' as const) : undefined },
    { label: 'Occupied', value: occupied },
    { label: 'Maintenance', value: maintenance, tone: maintenance > 0 ? ('caution' as const) : undefined },
  ];

  const typeOptions: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'operation', label: 'Operation' },
    { id: 'icu', label: 'ICU' },
    { id: 'radiology', label: 'Radiology' },
    { id: 'general', label: 'General' },
  ];

  const statusOptions: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'available', label: 'Available' },
    { id: 'occupied', label: 'Occupied' },
    { id: 'maintenance', label: 'Maintenance' },
  ];

  const cols = ['Name', 'Type', 'Floor', 'Capacity', 'Occupancy', 'Price/day', 'Status', 'Actions'];
  const confirmRoom = rooms.find((r) => r.id === deleteRoomConfirmId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Rooms</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} · {available} available
          </p>
        </div>
        <button onClick={() => setAddRoomModalOpen(true)} className="btn btn-primary text-[13px] flex items-center gap-1">
          <Plus size={14} /> Add room
        </button>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
          {typeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTypeFilter(opt.id)}
              className={[
                'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors',
                typeFilter === opt.id
                  ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
          {statusOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              className={[
                'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors',
                statusFilter === opt.id
                  ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {cols.map((h, i) => (
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
                  {cols.map((__, j) => (
                    <td key={j} className={tdClass}>
                      <div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="py-12">
                  <EmptyState icon={<Building2 />} title="No rooms" description="No rooms match the current filters." />
                </td>
              </tr>
            ) : (
              filtered.map((room) => {
                const occ = room.current_occupancy ?? 0;
                const occColor = occupancyColor(occ, room.capacity);
                const occPct = room.capacity > 0 ? Math.min(100, Math.round((occ / room.capacity) * 100)) : 0;
                return (
                  <tr key={room.id} className="hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)]  transition-colors">
                    <td className={`${tdClass} font-semibold`}>
                      <Link href={`/dashboard/inventory/rooms/${room.id}`} className="text-[var(--brand)] hover:underline">
                        {room.name}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      <Badge variant="neutral" className="text-black">
                        {typeLabel[room.type]}
                      </Badge>
                    </td>
                    <td className={`${tdClass} text-[var(--fg-2)]`}>Floor {room.floor}</td>
                    <td className={`${tdClass} text-[var(--fg-2)]`}>{room.capacity}</td>
                    <td className={tdClass}>
                      <div className="flex flex-col gap-1 min-w-[90px]">
                        <div className="h-[5px] rounded-full bg-[var(--sand-100)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${occPct}%`, background: occColor }} />
                        </div>
                        <span className="text-[11px]" style={{ color: occColor }}>
                          {occ}/{room.capacity}
                        </span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-[var(--fg-2)]`}>${room.price_per_day.toLocaleString()}/day</td>
                    <td className={tdClass}>
                      <Badge variant={getStatusVariant(room.status)} dot>
                        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </Badge>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <select
                          value={room.status}
                          onChange={(e) => updateRoomStatus(room.id, e.target.value as Room['status'])}
                          className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-2 py-[5px] text-[12px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
                        >
                          <option value="available">Available</option>
                          <option value="occupied">Occupied</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                        <button onClick={() => setEditRoom(room)} className="btn btn-ghost text-[12px] py-[4px] flex items-center gap-1">
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteRoomConfirmId(room.id)}
                          className="btn btn-ghost text-[12px] py-[4px] flex items-center gap-1"
                          style={{ color: 'var(--critical-soft-fg)' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AddRoomModal open={addRoomModalOpen} onClose={() => setAddRoomModalOpen(false)} onSubmit={addRoom} />

      <AddRoomModal open={!!editRoom} room={editRoom} onClose={() => setEditRoom(null)} onSubmit={(data) => updateRoom(editRoom!.id, data)} />

      {deleteRoomConfirmId && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[400px] p-6 flex flex-col gap-4">
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">Delete room</p>
            <p className="text-[13px] text-[var(--fg-2)]">
              Are you sure you want to delete <strong>{confirmRoom?.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDeleteRoomConfirmId(null)} className="btn btn-ghost flex-1">
                Cancel
              </button>
              <button
                onClick={() => deleteRoom(deleteRoomConfirmId)}
                className="btn btn-primary flex-1"
                style={{ background: 'var(--critical-soft-fg)', borderColor: 'var(--critical-soft-fg)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
