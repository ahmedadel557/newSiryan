'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, X, Save, Pencil, Trash2, Clock, CalendarDays, Search,
  Building2, Stethoscope, CalendarX, LayoutTemplate, Users,
} from 'lucide-react';
import {
  useAdminShifts,
  useAdminDepartments,
  useAdminDepartmentSchedule,
  useAdminDoctorSchedules,
  useAdminStaffSchedules,
  useAdminBlockedDates,
} from '@/hooks/admin';
import { adminService } from '@/services/admin.service';
import { departmentService } from '@/services/department.service';
import { patientService } from '@/services/patient.service';
import { queryKeys } from '@/lib/queryKeys';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ScheduleGrid, type GridState, type GridPerson, SCHEDULE_DAYS } from '@/components/admin/ScheduleGrid';
import type {
  ShiftDefinition,
  ScheduleEntry,
  DoctorScheduleRecord,
  StaffScheduleRecord,
  BlockedDateRecord,
  DoctorAvailability,
} from '@/types';

// ── Shared helpers ────────────────────────────────────────────────────────────

const DAYS_CHECKBOX: { label: string; value: number }[] = [
  { label: 'Saturday',  value: 6 },
  { label: 'Sunday',    value: 0 },
  { label: 'Monday',    value: 1 },
  { label: 'Tuesday',   value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday',  value: 4 },
  { label: 'Friday',    value: 5 },
];

const ROLE_LABELS: Record<string, string> = {
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Tech',
  radiology_technician: 'Radiology',
  inventory_manager: 'Inventory',
  cashier: 'Cashier',
};

function getShiftId(s: ShiftDefinition | string): string {
  return typeof s === 'string' ? s : s.id ?? (s as any)._id ?? '';
}

function nameInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function getDoctorId(rec: DoctorScheduleRecord): string {
  if (typeof rec.user === 'string') return rec.user;
  return rec.user?.id ?? (rec.user as any)?._id ?? '';
}

function getStaffId(rec: StaffScheduleRecord): string {
  if (typeof rec.user === 'string') return rec.user;
  return rec.user?.id ?? (rec.user as any)?._id ?? '';
}

function blockedUserId(rec: BlockedDateRecord): string {
  if (!rec.user) return '';
  if (typeof rec.user === 'string') return rec.user;
  return rec.user.id ?? (rec.user as any)._id ?? '';
}

function blockedUserLabel(rec: BlockedDateRecord): string {
  if (!rec.user) return '—';
  if (typeof rec.user === 'string') return rec.user;
  return rec.user.username ?? rec.user.email ?? '—';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'shifts',  label: 'Shift Definitions' },
  { id: 'dept',    label: 'Dept Schedules' },
  { id: 'doctor',  label: 'Doctor Schedules' },
  { id: 'staff',   label: 'Staff Schedules' },
  { id: 'blocked', label: 'Blocked Dates' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Shift Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface ShiftModalState {
  open: boolean;
  editing: ShiftDefinition | null;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const SHIFT_MODAL_EMPTY: ShiftModalState = {
  open: false, editing: null, name: '', start_time: '', end_time: '', is_active: true,
};

function ShiftDefsTab() {
  const { shifts, loading, createMutation, updateMutation, deleteMutation } = useAdminShifts();
  const [modal, setModal] = useState<ShiftModalState>(SHIFT_MODAL_EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const saving = createMutation.isPending || updateMutation.isPending;
  const activeCount = shifts.filter((s) => s.is_active).length;

  const openCreate = () => setModal({ ...SHIFT_MODAL_EMPTY, open: true });
  const openEdit = (s: ShiftDefinition) =>
    setModal({ open: true, editing: s, name: s.name, start_time: s.start_time, end_time: s.end_time, is_active: s.is_active });
  const closeModal = () => { if (!saving) setModal(SHIFT_MODAL_EMPTY); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.name.trim() || !modal.start_time || !modal.end_time) return;
    const payload = { name: modal.name.trim(), start_time: modal.start_time, end_time: modal.end_time, is_active: modal.is_active };
    const onDone = { onSuccess: () => setModal(SHIFT_MODAL_EMPTY) };
    if (modal.editing) {
      updateMutation.mutate({ id: modal.editing.id, data: payload }, onDone);
    } else {
      createMutation.mutate(payload, onDone);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* KPI strip + action */}
      <div className="flex items-center gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          {[
            { label: 'Total shifts', value: shifts.length },
            { label: 'Active', value: activeCount },
            { label: 'Inactive', value: shifts.length - activeCount },
          ].map((c) => (
            <div key={c.label} className="card px-4 py-3 flex flex-col gap-1">
              <p className="text-[12px] text-[var(--fg-3)]">{c.label}</p>
              <p className="text-[22px] font-semibold text-[var(--fg-1)]">{c.value}</p>
            </div>
          ))}
        </div>
        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2 text-[13px] shrink-0">
          <Plus size={14} /> Add Shift
        </button>
      </div>

      {loading ? (
        <div className="card p-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="44px" width="100%" className="rounded" />)}
        </div>
      ) : shifts.length === 0 ? (
        <div className="card p-10">
          <EmptyState icon={<Clock size={28} strokeWidth={1.5} />} title="No shift definitions yet" description="Add shift templates (Morning, Evening, Night…) to build department schedules." />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-1)]">
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Name</th>
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Start</th>
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">End</th>
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Status</th>
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id} className="border-b border-[var(--border-1)] last:border-0">
                  <td className="px-4 py-3 text-[14px] font-medium text-[var(--fg-1)]">{s.name}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--fg-2)] font-mono">{s.start_time}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--fg-2)] font-mono">{s.end_time}</td>
                  <td className="px-4 py-3">
                    <span className="badge" style={s.is_active
                      ? { fontSize: 11, background: 'color-mix(in srgb, var(--positive) 15%, transparent)', color: 'var(--positive)' }
                      : { fontSize: 11, background: 'var(--bg-surface-2)', color: 'var(--fg-3)' }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="btn btn-ghost p-1.5 text-[var(--fg-3)] hover:text-[var(--fg-1)]" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteId(s.id)} className="btn btn-ghost p-1.5 text-[var(--fg-4)] hover:text-[var(--critical)]" title="Deactivate"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="card p-6 w-full max-w-[400px] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">{modal.editing ? 'Edit Shift' : 'Add Shift'}</h2>
              <button onClick={closeModal} className="btn btn-ghost p-1" disabled={saving}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Shift name *</label>
                <input value={modal.name} onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))} required className="input h-9 w-full" placeholder="e.g. Morning, Evening, Night" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[var(--fg-2)]">Start time *</label>
                  <input type="time" value={modal.start_time} onChange={(e) => setModal((m) => ({ ...m, start_time: e.target.value }))} required className="input h-9 w-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[var(--fg-2)]">End time *</label>
                  <input type="time" value={modal.end_time} onChange={(e) => setModal((m) => ({ ...m, end_time: e.target.value }))} required className="input h-9 w-full" />
                </div>
              </div>
              <label className="flex items-center justify-between gap-2 text-[13px] text-[var(--fg-2)] cursor-pointer">
                <span className="font-medium">Active</span>
                <input type="checkbox" checked={modal.is_active} onChange={(e) => setModal((m) => ({ ...m, is_active: e.target.checked }))} />
              </label>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeModal} className="btn btn-ghost flex-1" disabled={saving}>Cancel</button>
                <button type="submit" disabled={saving || !modal.name.trim() || !modal.start_time || !modal.end_time} className="btn btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'Saving…' : modal.editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Deactivate shift"
        description="This will mark the shift as inactive. Existing schedule entries referencing it will not be affected."
        confirmLabel="Deactivate"
        danger
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Dept Schedules (checkbox grid)
// ─────────────────────────────────────────────────────────────────────────────

function buildDeptGrid(
  entries: ScheduleEntry[],
  shifts: ShiftDefinition[],
): Record<string, Record<string, boolean>> {
  const grid: Record<string, Record<string, boolean>> = {};
  for (const day of DAYS_CHECKBOX) {
    grid[day.value] = {};
    for (const shift of shifts) grid[day.value][shift.id] = false;
  }
  for (const e of entries) {
    const sid = getShiftId(e.shift);
    if (grid[e.day_of_week] && sid in grid[e.day_of_week]) {
      grid[e.day_of_week][sid] = e.is_active;
    }
  }
  return grid;
}

function DeptScheduleTab() {
  const { departments } = useAdminDepartments();
  const { shifts, loading: shiftsLoading } = useAdminShifts();
  const [selectedDept, setSelectedDept] = useState('');
  const { schedule, loading: schedLoading, upsertMutation } = useAdminDepartmentSchedule(selectedDept);
  const activeShifts = useMemo(() => shifts.filter((s) => s.is_active), [shifts]);

  const [grid, setGrid] = useState<Record<string, Record<string, boolean>>>({});
  const [gridInit, setGridInit] = useState<string>('');

  const scheduleKey = `${selectedDept}:${JSON.stringify(schedule?.entries ?? [])}`;
  if (scheduleKey !== gridInit && !schedLoading && !!selectedDept) {
    const built = buildDeptGrid(schedule?.entries ?? [], activeShifts);
    setGrid(built);
    setGridInit(scheduleKey);
  }

  const toggle = (dayValue: number, sId: string) => {
    setGrid((prev) => ({
      ...prev,
      [dayValue]: { ...(prev[dayValue] ?? {}), [sId]: !(prev[dayValue]?.[sId] ?? false) },
    }));
  };

  const handleSave = () => {
    const entries: { day_of_week: number; shift: string; is_active: boolean }[] = [];
    for (const day of DAYS_CHECKBOX) {
      for (const shift of activeShifts) {
        if (grid[day.value]?.[shift.id]) {
          entries.push({ day_of_week: day.value, shift: shift.id, is_active: true });
        }
      }
    }
    if (entries.length === 0) return;
    upsertMutation.mutate({ entries });
  };

  const loading = shiftsLoading || schedLoading;
  const hasSelection = !!selectedDept;
  const activeCellCount = Object.values(grid).reduce((sum, row) => sum + Object.values(row).filter(Boolean).length, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-4 flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Select department</label>
          <select
            className="input h-9 max-w-xs"
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setGridInit(''); }}
          >
            <option value="">— Choose a department —</option>
            {departments.filter((d) => d.is_active !== false).map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        {hasSelection && (
          <button
            onClick={handleSave}
            disabled={upsertMutation.isPending || activeCellCount === 0}
            className="btn btn-primary flex items-center gap-2 text-[13px] disabled:opacity-50 shrink-0"
          >
            <Save size={14} />
            {upsertMutation.isPending ? 'Saving…' : 'Save Schedule'}
          </button>
        )}
      </div>

      {!hasSelection ? (
        <div className="card p-10">
          <EmptyState icon={<CalendarDays size={28} strokeWidth={1.5} />} title="Select a department" description="Choose a department above to view and edit its weekly schedule." />
        </div>
      ) : loading ? (
        <div className="card p-4 flex flex-col gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} height="40px" width="100%" className="rounded" />)}
        </div>
      ) : activeShifts.length === 0 ? (
        <div className="card p-8">
          <p className="text-center text-[14px] text-[var(--fg-3)]">
            No active shift definitions found. Create shifts first in the <strong>Shift Definitions</strong> tab.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b border-[var(--border-1)]">
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)] w-[140px]">Day</th>
                {activeShifts.map((s) => (
                  <th key={s.id} className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)] text-center">
                    <div>{s.name}</div>
                    <div className="text-[10px] font-normal text-[var(--fg-4)] font-mono mt-0.5">{s.start_time}–{s.end_time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS_CHECKBOX.map((day) => (
                <tr key={day.value} className="border-b border-[var(--border-1)] last:border-0">
                  <td className="px-4 py-3 text-[13px] font-medium text-[var(--fg-2)]">{day.label}</td>
                  {activeShifts.map((shift) => {
                    const active = grid[day.value]?.[shift.id] ?? false;
                    return (
                      <td key={shift.id} className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(day.value, shift.id)}
                          className="w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors"
                          style={active
                            ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: 'white' }
                            : { background: 'transparent', borderColor: 'var(--border-1)' }}
                          title={active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                        >
                          {active && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-[var(--border-1)]">
            <p className="text-[12px] text-[var(--fg-4)]">{activeCellCount} slot{activeCellCount !== 1 ? 's' : ''} selected</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — Doctor Schedules (chip-style grid)
// ─────────────────────────────────────────────────────────────────────────────

interface DoctorModalCell {
  dayValue: number;
  dayLabel: string;
  shiftId: string;
  shiftName: string;
}

function buildDoctorGrid(
  schedules: DoctorScheduleRecord[],
  activeShifts: ShiftDefinition[],
  dept: string,
): GridState {
  const g: GridState = {};
  for (const day of SCHEDULE_DAYS) {
    g[day.value] = {};
    for (const s of activeShifts) g[day.value][s.id] = [];
  }
  const relevant = dept ? schedules.filter((r) => r.department === dept) : schedules;
  for (const rec of relevant) {
    const person: GridPerson = { id: getDoctorId(rec), name: rec.doctor_name ?? 'Doctor' };
    for (const entry of rec.entries ?? []) {
      if (!entry.is_active) continue;
      const sid = getShiftId(entry.shift);
      if (g[entry.day_of_week]?.[sid] !== undefined) {
        g[entry.day_of_week][sid].push(person);
      }
    }
  }
  return g;
}

interface AddDoctorModalProps {
  cell: DoctorModalCell;
  dept: string;
  assignedIds: Set<string>;
  onAssign: (doctor: DoctorAvailability) => void;
  onClose: () => void;
  saving: boolean;
}

function AddDoctorModal({ cell, dept, assignedIds, onAssign, onClose, saving }: AddDoctorModalProps) {
  const [search, setSearch] = useState('');

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['admin', 'grid-modal-doctors', dept],
    queryFn: () => patientService.getDoctors(dept || undefined),
    enabled: !!dept,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(
    () => search ? doctors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) : doctors,
    [doctors, search],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="card flex flex-col gap-0 w-full overflow-hidden" style={{ maxWidth: 460, maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">Assign Doctor</p>
            <p className="text-[12px] text-[var(--fg-3)] mt-0.5">{cell.dayLabel} · {cell.shiftName}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5" disabled={saving}><X size={16} /></button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-4)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" className="input h-8 pl-8 w-full text-[13px]" autoFocus />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-3 pb-3">
          {isLoading ? (
            <div className="flex flex-col gap-2 mt-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="52px" width="100%" className="rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[13px] text-[var(--fg-4)] py-8">
              {doctors.length === 0 ? 'No doctors in this department' : 'No doctors match your search'}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5 mt-1">
              {filtered.map((doc) => {
                const already = assignedIds.has(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => !already && !saving && onAssign(doc)}
                    disabled={already || saving}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left w-full transition-colors"
                    style={{ cursor: already ? 'default' : 'pointer', opacity: already ? 0.55 : 1, background: 'transparent' }}
                    onMouseEnter={(e) => { if (!already) (e.currentTarget as HTMLElement).style.background = 'var(--bg-sunken)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                      {nameInitials(doc.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--fg-1)] truncate">{doc.name}</p>
                      <p className="text-[11px] text-[var(--fg-3)] truncate">{(doc as any).specialization ?? (doc as any).specialty ?? dept}</p>
                    </div>
                    {already ? (
                      <span className="text-[11px] font-medium flex-shrink-0" style={{ color: 'var(--positive)' }}>✓ Assigned</span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>Assign</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DoctorScheduleTab() {
  const { schedules, loading: schedulesLoading, upsertMutation } = useAdminDoctorSchedules();
  const { shifts, loading: shiftsLoading } = useAdminShifts();
  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: queryKeys.departmentsByRole('doctor'),
    queryFn: () => departmentService.getByRole('doctor'),
    staleTime: 5 * 60 * 1000,
  });

  const [selectedDept, setSelectedDept] = useState('');
  const [modalCell, setModalCell] = useState<DoctorModalCell | null>(null);

  const activeShifts = useMemo(() => shifts.filter((s) => s.is_active), [shifts]);
  const grid = useMemo(() => buildDoctorGrid(schedules, activeShifts, selectedDept), [schedules, activeShifts, selectedDept]);

  const assignedIds = useMemo<Set<string>>(() => {
    if (!modalCell) return new Set();
    return new Set((grid[modalCell.dayValue]?.[modalCell.shiftId] ?? []).map((d) => d.id));
  }, [modalCell, grid]);

  const isLoading = schedulesLoading || shiftsLoading;
  const scheduledCount = selectedDept ? schedules.filter((s) => s.department === selectedDept).length : 0;

  const handleRemove = useCallback(
    (dayValue: number, sId: string, doctorId: string) => {
      const rec = schedules.find((s) => getDoctorId(s) === doctorId);
      if (!rec) return;
      const newEntries = (rec.entries ?? [])
        .filter((e) => !(e.day_of_week === dayValue && getShiftId(e.shift) === sId))
        .map((e) => ({ day_of_week: e.day_of_week, shift: getShiftId(e.shift), is_active: e.is_active }));
      upsertMutation.mutate({ doctorId, data: { entries: newEntries } });
    },
    [schedules, upsertMutation],
  );

  const handleAssign = useCallback(
    (doctor: DoctorAvailability) => {
      if (!modalCell) return;
      const { dayValue, shiftId } = modalCell;
      const rec = schedules.find((s) => getDoctorId(s) === doctor.id);
      const existing = (rec?.entries ?? []).map((e) => ({ day_of_week: e.day_of_week, shift: getShiftId(e.shift), is_active: e.is_active }));
      if (existing.some((e) => e.day_of_week === dayValue && e.shift === shiftId && e.is_active)) return;
      upsertMutation.mutate(
        { doctorId: doctor.id, data: { entries: [...existing, { day_of_week: dayValue, shift: shiftId, is_active: true }] } },
        { onSuccess: () => setModalCell(null) },
      );
    },
    [modalCell, schedules, upsertMutation],
  );

  const handleOpenModal = useCallback(
    (dayValue: number, shiftId: string) => {
      const day = SCHEDULE_DAYS.find((d) => d.value === dayValue);
      const shift = activeShifts.find((s) => s.id === shiftId);
      if (day && shift) setModalCell({ dayValue: day.value, dayLabel: day.label, shiftId: shift.id, shiftName: shift.name });
    },
    [activeShifts],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-[var(--fg-3)]" />
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="input h-9 w-[220px]" disabled={deptsLoading}>
            <option value="">Select department…</option>
            {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        {selectedDept && !isLoading && (
          <span className="text-[13px] text-[var(--fg-3)]">{scheduledCount} doctor{scheduledCount !== 1 ? 's' : ''} with schedules</span>
        )}
      </div>

      {!selectedDept ? (
        <div className="card p-10">
          <EmptyState icon={<Stethoscope size={28} strokeWidth={1.5} />} title="Select a department" description="Choose a department above to view and edit the doctor shift timetable." />
        </div>
      ) : activeShifts.length === 0 && !isLoading ? (
        <div className="card p-10">
          <EmptyState icon={<Stethoscope size={28} strokeWidth={1.5} />} title="No shift definitions" description="Create shift time templates in the Shift Definitions tab before building schedules." />
        </div>
      ) : (
        <ScheduleGrid
          shifts={activeShifts}
          assignments={grid}
          onAdd={handleOpenModal}
          onRemove={handleRemove}
          isLoading={isLoading}
          isMutating={upsertMutation.isPending}
        />
      )}

      {modalCell && (
        <AddDoctorModal
          cell={modalCell}
          dept={selectedDept}
          assignedIds={assignedIds}
          onAssign={handleAssign}
          onClose={() => setModalCell(null)}
          saving={upsertMutation.isPending}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4 — Staff Schedules (chip-style grid)
// ─────────────────────────────────────────────────────────────────────────────

function buildStaffGrid(
  schedules: StaffScheduleRecord[],
  activeShifts: ShiftDefinition[],
): GridState {
  const g: GridState = {};
  for (const day of SCHEDULE_DAYS) {
    g[day.value] = {};
    for (const s of activeShifts) g[day.value][s.id] = [];
  }
  for (const rec of schedules) {
    const person: GridPerson = { id: getStaffId(rec), name: rec.staff_name ?? 'Staff' };
    for (const entry of rec.entries ?? []) {
      if (!entry.is_active) continue;
      const sid = getShiftId(entry.shift);
      if (g[entry.day_of_week]?.[sid] !== undefined) {
        g[entry.day_of_week][sid].push(person);
      }
    }
  }
  return g;
}

interface StaffModalCell {
  dayValue: number;
  dayLabel: string;
  shiftId: string;
  shiftName: string;
}

interface AddStaffModalProps {
  cell: StaffModalCell;
  selectedRole: string;
  assignedIds: Set<string>;
  onAssign: (user: { id: string; username: string }) => void;
  onClose: () => void;
  saving: boolean;
}

function AddStaffModal({ cell, selectedRole, assignedIds, onAssign, onClose, saving }: AddStaffModalProps) {
  const [search, setSearch] = useState('');

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['admin', 'modal-staff', selectedRole],
    queryFn: async () => {
      const users = await adminService.getUsers();
      return users.filter((u) => u.role === selectedRole && u.is_active);
    },
    enabled: !!selectedRole,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(
    () => search ? allUsers.filter((u) => u.username.toLowerCase().includes(search.toLowerCase())) : allUsers,
    [allUsers, search],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="card flex flex-col gap-0 w-full overflow-hidden" style={{ maxWidth: 460, maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">Assign {ROLE_LABELS[selectedRole] ?? selectedRole}</p>
            <p className="text-[12px] text-[var(--fg-3)] mt-0.5">{cell.dayLabel} · {cell.shiftName}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5" disabled={saving}><X size={16} /></button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-4)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" className="input h-8 pl-8 w-full text-[13px]" autoFocus />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-3 pb-3">
          {isLoading ? (
            <div className="flex flex-col gap-2 mt-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="52px" width="100%" className="rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[13px] text-[var(--fg-4)] py-8">
              {allUsers.length === 0
                ? `No active ${ROLE_LABELS[selectedRole] ?? selectedRole} staff found`
                : 'No staff match your search'}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5 mt-1">
              {filtered.map((user) => {
                const already = assignedIds.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => !already && !saving && onAssign(user)}
                    disabled={already || saving}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left w-full transition-colors"
                    style={{ cursor: already ? 'default' : 'pointer', opacity: already ? 0.55 : 1, background: 'transparent' }}
                    onMouseEnter={(e) => { if (!already) (e.currentTarget as HTMLElement).style.background = 'var(--bg-sunken)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                      {nameInitials(user.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--fg-1)] truncate">{user.username}</p>
                      <p className="text-[11px] text-[var(--fg-3)] truncate">{user.email}</p>
                    </div>
                    {already ? (
                      <span className="text-[11px] font-medium flex-shrink-0" style={{ color: 'var(--positive)' }}>✓ Assigned</span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>Assign</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffScheduleTab() {
  const { departments } = useAdminDepartments();
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [staffModalCell, setStaffModalCell] = useState<StaffModalCell | null>(null);
  const [applyDept, setApplyDept] = useState<string | null>(null);

  const filters = useMemo(() => ({
    department: selectedDept || undefined,
    role: selectedRole || undefined,
  }), [selectedDept, selectedRole]);

  const { schedules, loading, upsertMutation, applyTemplateMutation } = useAdminStaffSchedules(filters);
  const { shifts, loading: shiftsLoading } = useAdminShifts();
  const activeShifts = useMemo(() => shifts.filter((s) => s.is_active), [shifts]);
  const activeDepts = useMemo(() => departments.filter((d) => d.is_active !== false), [departments]);

  const staffGrid = useMemo(() => buildStaffGrid(schedules, activeShifts), [schedules, activeShifts]);

  const assignedIds = useMemo<Set<string>>(() => {
    if (!staffModalCell) return new Set();
    return new Set((staffGrid[staffModalCell.dayValue]?.[staffModalCell.shiftId] ?? []).map((p) => p.id));
  }, [staffModalCell, staffGrid]);

  const isLoading = loading || shiftsLoading;
  const hasSelection = !!selectedRole && !!selectedDept;

  const handleRemove = useCallback(
    (dayValue: number, shiftId: string, staffId: string) => {
      const rec = schedules.find((s) => getStaffId(s) === staffId);
      if (!rec) return;
      const newEntries = (rec.entries ?? [])
        .filter((e) => !(e.day_of_week === dayValue && getShiftId(e.shift) === shiftId))
        .map((e) => ({ day_of_week: e.day_of_week, shift: getShiftId(e.shift), is_active: e.is_active }));
      upsertMutation.mutate({ userId: staffId, data: { entries: newEntries } });
    },
    [schedules, upsertMutation],
  );

  const handleAssign = useCallback(
    (user: { id: string; username: string }) => {
      if (!staffModalCell) return;
      const { dayValue, shiftId } = staffModalCell;
      const rec = schedules.find((s) => getStaffId(s) === user.id);
      const existing = (rec?.entries ?? []).map((e) => ({ day_of_week: e.day_of_week, shift: getShiftId(e.shift), is_active: e.is_active }));
      if (existing.some((e) => e.day_of_week === dayValue && e.shift === shiftId && e.is_active)) return;
      upsertMutation.mutate(
        { userId: user.id, data: { entries: [...existing, { day_of_week: dayValue, shift: shiftId, is_active: true }] } },
        { onSuccess: () => setStaffModalCell(null) },
      );
    },
    [staffModalCell, schedules, upsertMutation],
  );

  const handleOpenModal = useCallback(
    (dayValue: number, shiftId: string) => {
      const day = SCHEDULE_DAYS.find((d) => d.value === dayValue);
      const shift = activeShifts.find((s) => s.id === shiftId);
      if (day && shift) setStaffModalCell({ dayValue: day.value, dayLabel: day.label, shiftId: shift.id, shiftName: shift.name });
    },
    [activeShifts],
  );

  const handleApplyTemplate = () => {
    if (!applyDept) return;
    applyTemplateMutation.mutate(applyDept, { onSettled: () => setApplyDept(null) });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Selectors + apply template */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Role</label>
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="input h-9 w-[180px]">
            <option value="">Select role…</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Department</label>
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="input h-9 w-[200px]">
            <option value="">Select department…</option>
            {activeDepts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        {hasSelection && (
          <button
            onClick={() => setApplyDept(selectedDept)}
            className="btn btn-ghost flex items-center gap-1.5 text-[13px] shrink-0 ml-auto"
            disabled={applyTemplateMutation.isPending}
          >
            <LayoutTemplate size={14} />
            Apply Dept Template
          </button>
        )}
      </div>

      {!hasSelection ? (
        <div className="card p-10">
          <EmptyState icon={<Users size={28} strokeWidth={1.5} />} title="Select role and department" description="Choose a role and department above to view and edit the staff shift grid." />
        </div>
      ) : activeShifts.length === 0 && !isLoading ? (
        <div className="card p-10">
          <EmptyState icon={<Users size={28} strokeWidth={1.5} />} title="No shift definitions" description="Create shift time templates in the Shift Definitions tab before building schedules." />
        </div>
      ) : (
        <ScheduleGrid
          shifts={activeShifts}
          assignments={staffGrid}
          onAdd={handleOpenModal}
          onRemove={handleRemove}
          isLoading={isLoading}
          isMutating={upsertMutation.isPending}
        />
      )}

      {staffModalCell && (
        <AddStaffModal
          cell={staffModalCell}
          selectedRole={selectedRole}
          assignedIds={assignedIds}
          onAssign={handleAssign}
          onClose={() => setStaffModalCell(null)}
          saving={upsertMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!applyDept}
        title="Apply department template"
        description={`This will overwrite the weekly schedule entries for all active staff in "${applyDept}". Their individual overrides (blocked days) are not affected.`}
        confirmLabel="Apply Template"
        danger={false}
        isLoading={applyTemplateMutation.isPending}
        onConfirm={handleApplyTemplate}
        onClose={() => setApplyDept(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 5 — Blocked Dates
// ─────────────────────────────────────────────────────────────────────────────

type BlockedInnerTab = 'department' | 'user';

function BlockedDatesTab() {
  const [innerTab, setInnerTab] = useState<BlockedInnerTab>('department');
  const { departments } = useAdminDepartments();
  const activeDepts = departments.filter((d) => d.is_active !== false);
  const { blocks, loading, createMutation, deleteMutation } = useAdminBlockedDates();

  const deptBlocks = blocks.filter((b) => b.scope === 'department');
  const userBlocks = blocks.filter((b) => b.scope === 'user');

  const [deptForm, setDeptForm] = useState({ department: '', date: '', reason: '' });
  const [userForm, setUserForm] = useState({ userId: '', date: '', reason: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.department || !deptForm.date) return;
    createMutation.mutate(
      { scope: 'department', department: deptForm.department, date: deptForm.date, reason: deptForm.reason || undefined },
      { onSuccess: () => setDeptForm({ department: '', date: '', reason: '' }) },
    );
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.userId || !userForm.date) return;
    createMutation.mutate(
      { scope: 'user', user: userForm.userId, date: userForm.date, reason: userForm.reason || undefined },
      { onSuccess: () => setUserForm({ userId: '', date: '', reason: '' }) },
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
  };

  const innerTabBtn = (t: BlockedInnerTab, label: string) => (
    <button
      key={t}
      onClick={() => setInnerTab(t)}
      className="px-4 py-2 text-[13px] font-medium rounded-[6px] transition-colors"
      style={innerTab === t
        ? { background: 'var(--brand)', color: '#fff' }
        : { background: 'transparent', color: 'var(--fg-3)' }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 p-1 rounded-[8px] self-start" style={{ background: 'var(--bg-surface-2)' }}>
        {innerTabBtn('department', 'Department')}
        {innerTabBtn('user', 'Individual')}
      </div>

      {innerTab === 'department' && (
        <>
          <div className="card p-5">
            <p className="text-[14px] font-semibold text-[var(--fg-1)] mb-4">Block department date</p>
            <form onSubmit={handleDeptSubmit} className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Department *</label>
                <select className="input h-9 w-[200px]" value={deptForm.department} onChange={(e) => setDeptForm((f) => ({ ...f, department: e.target.value }))} required>
                  <option value="">— Select —</option>
                  {activeDepts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Date *</label>
                <input type="date" className="input h-9 w-[160px]" value={deptForm.date} onChange={(e) => setDeptForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Reason (optional)</label>
                <input className="input h-9 w-full" value={deptForm.reason} onChange={(e) => setDeptForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. National holiday" />
              </div>
              <button type="submit" disabled={createMutation.isPending || !deptForm.department || !deptForm.date} className="btn btn-primary flex items-center gap-1.5 h-9 text-[13px] disabled:opacity-50 shrink-0">
                <Plus size={13} />
                {createMutation.isPending ? 'Blocking…' : 'Block date'}
              </button>
            </form>
          </div>

          {loading ? (
            <div className="card p-4 flex flex-col gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="40px" width="100%" className="rounded" />)}</div>
          ) : deptBlocks.length === 0 ? (
            <div className="card p-8">
              <EmptyState icon={<CalendarX size={26} strokeWidth={1.5} />} title="No department blocks" description="Blocked department dates will appear here." />
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-1)]">
                    <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Department</th>
                    <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Date</th>
                    <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Reason</th>
                    <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deptBlocks.map((b) => (
                    <tr key={b.id} className="border-b border-[var(--border-1)] last:border-0">
                      <td className="px-4 py-3 text-[14px] font-medium text-[var(--fg-1)]">{b.department ?? '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--fg-2)]">{formatDate(b.date)}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--fg-3)] italic">{b.reason ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDeleteId(b.id)} className="btn btn-ghost p-1.5 text-[var(--fg-4)] hover:text-[var(--critical)]" title="Remove block"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {innerTab === 'user' && (
        <>
          <div className="card p-5">
            <p className="text-[14px] font-semibold text-[var(--fg-1)] mb-4">Block individual date</p>
            <form onSubmit={handleUserSubmit} className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">User ID *</label>
                <input className="input h-9 w-full" value={userForm.userId} onChange={(e) => setUserForm((f) => ({ ...f, userId: e.target.value }))} placeholder="Paste staff user ID" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Date *</label>
                <input type="date" className="input h-9 w-[160px]" value={userForm.date} onChange={(e) => setUserForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Reason (optional)</label>
                <input className="input h-9 w-full" value={userForm.reason} onChange={(e) => setUserForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Annual leave" />
              </div>
              <button type="submit" disabled={createMutation.isPending || !userForm.userId || !userForm.date} className="btn btn-primary flex items-center gap-1.5 h-9 text-[13px] disabled:opacity-50 shrink-0">
                <Plus size={13} />
                {createMutation.isPending ? 'Blocking…' : 'Block date'}
              </button>
            </form>
          </div>

          {loading ? (
            <div className="card p-4 flex flex-col gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="40px" width="100%" className="rounded" />)}</div>
          ) : userBlocks.length === 0 ? (
            <div className="card p-8">
              <EmptyState icon={<CalendarX size={26} strokeWidth={1.5} />} title="No individual blocks" description="Blocked dates for individual staff members will appear here." />
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-1)]">
                    <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Staff</th>
                    <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Date</th>
                    <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Reason</th>
                    <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userBlocks.map((b) => (
                    <tr key={b.id} className="border-b border-[var(--border-1)] last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-[14px] font-medium text-[var(--fg-1)]">{blockedUserLabel(b)}</p>
                        <p className="text-[11px] text-[var(--fg-4)]">{blockedUserId(b)}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--fg-2)]">{formatDate(b.date)}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--fg-3)] italic">{b.reason ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDeleteId(b.id)} className="btn btn-ghost p-1.5 text-[var(--fg-4)] hover:text-[var(--critical)]" title="Remove block"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Remove blocked date"
        description="This will remove the block, making the date available again."
        confirmLabel="Remove"
        danger
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminSchedulesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('doctor');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">
          Schedules
        </h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
          Manage shift definitions, department templates, and staff assignments
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[var(--border-1)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors"
            style={{
              color: activeTab === tab.id ? 'var(--brand)' : 'var(--fg-3)',
              borderBottom: activeTab === tab.id ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: -1,
              background: 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {activeTab === 'shifts'  && <ShiftDefsTab />}
      {activeTab === 'dept'    && <DeptScheduleTab />}
      {activeTab === 'doctor'  && <DoctorScheduleTab />}
      {activeTab === 'staff'   && <StaffScheduleTab />}
      {activeTab === 'blocked' && <BlockedDatesTab />}
    </div>
  );
}
