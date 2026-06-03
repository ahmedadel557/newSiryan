'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import type { Shift, ShiftType, User, Role, AssignShiftDto } from '@/types';
import { useToast } from '@/hooks/shared';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const SHIFT_TYPES: ShiftType[] = ['morning', 'evening', 'night'];

const shiftColor: Record<ShiftType, string> = {
  morning: 'var(--brand)',
  evening: 'var(--caution)',
  night: 'var(--info)',
};

const ROLES: Role[] = ['doctor', 'nurse', 'pharmacist', 'lab_technician', 'radiology_technician', 'receptionist', 'cashier', 'inventory_manager'];

function ShiftBadge({ type }: { type: ShiftType }) {
  return (
    <span
      className="badge capitalize"
      style={{
        background: `color-mix(in srgb, ${shiftColor[type]} 15%, transparent)`,
        color: shiftColor[type],
        border: `1px solid color-mix(in srgb, ${shiftColor[type]} 30%, transparent)`,
      }}
    >
      {type.replace('_', ' ')}
    </span>
  );
}

interface AssignModal {
  mode: 'create' | 'edit';
  shift?: Shift;
}

export default function ShiftsPage() {
  const { showToast } = useToast();
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  // Modal
  const [modal, setModal] = useState<AssignModal | null>(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [formData, setFormData] = useState<AssignShiftDto>({
    user_id: '', shift_type: 'morning', start_date: '', end_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [today, all, staff] = await Promise.all([
        adminService.getTodayShifts(),
        adminService.getShifts({ role: roleFilter || undefined, department: deptFilter || undefined, from: fromFilter || undefined, to: toFilter || undefined }),
        adminService.getUsers(),
      ]);
      setTodayShifts(today);
      setAllShifts(all);
      setUsers(staff.filter((u) => u.role !== 'patient' && u.role !== 'admin'));
    } catch {
      showToast('Failed to load shifts', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, deptFilter, fromFilter, toFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setFormData({ user_id: '', shift_type: 'morning', start_date: '', end_date: '' });
    setStaffSearch('');
    setModal({ mode: 'create' });
  };

  const openEdit = (shift: Shift) => {
    setFormData({
      user_id: shift.staff.id,
      shift_type: shift.shift_type,
      start_date: shift.start_date.slice(0, 10),
      end_date: shift.end_date.slice(0, 10),
      notes: shift.notes,
    });
    setStaffSearch(shift.staff.name);
    setModal({ mode: 'edit', shift });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.mode === 'create') {
        await adminService.assignShift(formData);
        showToast('Shift assigned');
      } else if (modal?.shift) {
        await adminService.updateShift(modal.shift.id, formData);
        showToast('Shift updated');
      }
      setModal(null);
      load();
    } catch {
      showToast('Failed to save shift', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteShift(confirmDelete);
      showToast('Shift deleted');
      setConfirmDelete(null);
      load();
    } catch {
      showToast('Failed to delete shift', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Group today's shifts by department
  const todayByDept = todayShifts.reduce<Record<string, Shift[]>>((acc, s) => {
    const dept = s.staff.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(s);
    return acc;
  }, {});

  const filteredStaff = users.filter((u) =>
    `${u.email} ${u.role}`.toLowerCase().includes(staffSearch.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-h2">Shifts</h1>
          <p className="t-body" style={{ color: 'var(--fg-2)' }}>Manage staff shift assignments</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Assign Shift
        </button>
      </div>

      {/* Today's Shifts */}
      <section className="space-y-3">
        <h2 className="t-h3">Today's Shifts</h2>
        {loading ? (
          <div className="card p-6 text-center" style={{ color: 'var(--fg-3)' }}>Loading...</div>
        ) : Object.keys(todayByDept).length === 0 ? (
          <div className="card p-6 text-center" style={{ color: 'var(--fg-3)' }}>No shifts scheduled for today</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(todayByDept).map(([dept, shifts]) => (
              <div key={dept} className="card p-4">
                <h3 className="t-h4 mb-3">{dept}</h3>
                <div className="flex flex-wrap gap-3">
                  {shifts.map((s) => (
                    <div key={s.id} className="card p-3 space-y-1" style={{ minWidth: 160 }}>
                      <p className="t-small font-medium">{s.staff.name}</p>
                      <span className="badge" style={{ fontSize: 11, textTransform: 'capitalize', background: 'var(--bg-surface-2)', color: 'var(--fg-2)' }}>{s.staff.role.replace('_', ' ')}</span>
                      <ShiftBadge type={s.shift_type} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* All Shifts */}
      <section className="space-y-3">
        <h2 className="t-h3">All Shifts</h2>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ width: 160 }}>
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <input className="input" placeholder="Department..." value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ width: 160 }} />
          <input type="date" className="input" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} />
          <input type="date" className="input" value={toFilter} onChange={(e) => setToFilter(e.target.value)} />
        </div>

        {loading ? (
          <div className="card p-6 text-center" style={{ color: 'var(--fg-3)' }}>Loading...</div>
        ) : allShifts.length === 0 ? (
          <div className="card p-6 text-center" style={{ color: 'var(--fg-3)' }}>No shifts found</div>
        ) : (
          <div className="card overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-1)' }}>
                  {['Staff', 'Role', 'Department', 'Type', 'Start', 'End', ''].map((h) => (
                    <th key={h} className="t-small" style={{ padding: '10px 12px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allShifts.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                    <td className="t-body" style={{ padding: '10px 12px' }}>{s.staff.name}</td>
                    <td className="t-small" style={{ padding: '10px 12px', textTransform: 'capitalize', color: 'var(--fg-2)' }}>{s.staff.role.replace('_', ' ')}</td>
                    <td className="t-small" style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{s.staff.department || '—'}</td>
                    <td style={{ padding: '10px 12px' }}><ShiftBadge type={s.shift_type} /></td>
                    <td className="t-small" style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{new Date(s.start_date).toLocaleDateString()}</td>
                    <td className="t-small" style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{new Date(s.end_date).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--critical)' }} onClick={() => setConfirmDelete(s.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Assign / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 space-y-4" style={{ width: 420 }}>
            <div className="flex items-center justify-between">
              <h3 className="t-h3">{modal.mode === 'create' ? 'Assign Shift' : 'Edit Shift'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {/* Staff search */}
              <div>
                <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Staff Member</label>
                <input
                  className="input w-full"
                  placeholder="Search by email or role..."
                  value={staffSearch}
                  onChange={(e) => { setStaffSearch(e.target.value); setFormData((f) => ({ ...f, user_id: '' })); }}
                />
                {staffSearch && !formData.user_id && filteredStaff.length > 0 && (
                  <div className="card mt-1" style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {filteredStaff.slice(0, 8).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-[var(--bg-hover)]"
                        style={{ display: 'block', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer' }}
                        onClick={() => {
                          setFormData((f) => ({ ...f, user_id: u.id }));
                          setStaffSearch(u.email);
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{u.email}</span>
                        <span className="ml-2" style={{ color: 'var(--fg-3)', textTransform: 'capitalize' }}>{u.role.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Shift Type</label>
                <select className="input w-full" value={formData.shift_type} onChange={(e) => setFormData((f) => ({ ...f, shift_type: e.target.value as ShiftType }))}>
                  {SHIFT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Start Date</label>
                  <input type="date" className="input w-full" value={formData.start_date} onChange={(e) => setFormData((f) => ({ ...f, start_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>End Date</label>
                  <input type="date" className="input w-full" value={formData.end_date} onChange={(e) => setFormData((f) => ({ ...f, end_date: e.target.value }))} required />
                </div>
              </div>

              <div>
                <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Notes (optional)</label>
                <input className="input w-full" value={formData.notes ?? ''} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !formData.user_id}>
                  {saving ? 'Saving...' : modal.mode === 'create' ? 'Assign' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Shift"
        description="Are you sure you want to delete this shift assignment?"
        confirmLabel="Delete"
        danger
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
