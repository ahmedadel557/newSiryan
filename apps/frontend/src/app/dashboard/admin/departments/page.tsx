'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Building2 } from 'lucide-react';
import { useAdminDepartments } from '@/hooks/admin';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Department } from '@/types';

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'radiology_technician', label: 'Radiology Technician' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'cashier', label: 'Cashier' },
];

const roleLabel = (value: string) => ROLE_OPTIONS.find((r) => r.value === value)?.label ?? value;

interface ModalState {
  open: boolean;
  editing: Department | null;
  name: string;
  description: string;
  assigned_roles: string[];
  is_active: boolean;
}

const emptyModal: ModalState = {
  open: false,
  editing: null,
  name: '',
  description: '',
  assigned_roles: [],
  is_active: true,
};

export default function AdminDepartmentsPage() {
  const { departments, loading, createDepartment, updateDepartment, deleteDepartment } = useAdminDepartments();
  const [modal, setModal] = useState<ModalState>(emptyModal);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const saving = createDepartment.isPending || updateDepartment.isPending;

  const openCreate = () => setModal({ ...emptyModal, open: true });
  const openEdit = (d: Department) =>
    setModal({
      open: true,
      editing: d,
      name: d.name,
      description: d.description ?? '',
      assigned_roles: d.assigned_roles ?? [],
      is_active: d.is_active ?? true,
    });
  const closeModal = () => { if (!saving) setModal(emptyModal); };

  const toggleRole = (role: string) =>
    setModal((m) => ({
      ...m,
      assigned_roles: m.assigned_roles.includes(role)
        ? m.assigned_roles.filter((r) => r !== role)
        : [...m.assigned_roles, role],
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.name.trim()) return;
    const payload = {
      name: modal.name.trim(),
      description: modal.description.trim() || undefined,
      assigned_roles: modal.assigned_roles,
      is_active: modal.is_active,
    };
    const onDone = { onSuccess: () => setModal(emptyModal) };
    if (modal.editing) {
      updateDepartment.mutate({ id: modal.editing.id, data: payload }, onDone);
    } else {
      createDepartment.mutate(payload, onDone);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDepartment.mutate(deleteId, { onSettled: () => setDeleteId(null) });
  };

  const activeCount = departments.filter((d) => d.is_active !== false).length;
  const totalDoctors = departments.reduce((s, d) => s + (d.doctor_count ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Departments</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Manage departments and the roles allowed to join them</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2 text-[13px] shrink-0">
          <Plus size={14} /> Add Department
        </button>
      </div>

      <DoctorKPIStrip
        cards={[
          { label: 'Total Departments', value: departments.length },
          { label: 'Active', value: activeCount },
          { label: 'Assigned Doctors', value: totalDoctors },
        ]}
      />

      {loading ? (
        <div className="card p-4 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="44px" width="100%" className="rounded" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="card p-10">
          <EmptyState
            icon={<Building2 size={28} strokeWidth={1.5} />}
            title="No departments yet"
            description="Add departments to organize your hospital's clinical structure."
          />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-1)]">
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Department</th>
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Assigned roles</th>
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Doctors</th>
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)]">Status</th>
                <th className="px-4 py-3 text-[12px] font-medium text-[var(--fg-3)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b border-[var(--border-1)] last:border-0">
                  <td className="px-4 py-3 align-top">
                    <p className="text-[14px] font-medium text-[var(--fg-1)]">{dept.name}</p>
                    {dept.description && (
                      <p className="text-[12px] text-[var(--fg-3)] mt-0.5 line-clamp-1">{dept.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5 max-w-[360px]">
                      {(dept.assigned_roles ?? []).length === 0 ? (
                        <span className="text-[12px] text-[var(--fg-4)]">—</span>
                      ) : (
                        (dept.assigned_roles ?? []).map((r) => (
                          <span key={r} className="badge" style={{ fontSize: 11, background: 'var(--bg-surface-2)', color: 'var(--fg-2)' }}>{roleLabel(r)}</span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-[13px] text-[var(--fg-2)]">{dept.doctor_count ?? 0}</td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className="badge"
                      style={dept.is_active === false
                        ? { fontSize: 11, background: 'var(--bg-surface-2)', color: 'var(--fg-3)' }
                        : { fontSize: 11, background: 'color-mix(in srgb, var(--positive) 15%, transparent)', color: 'var(--positive)' }}
                    >
                      {dept.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(dept)} className="btn btn-ghost p-1.5 text-[var(--fg-3)] hover:text-[var(--fg-1)]" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(dept.id)} className="btn btn-ghost p-1.5 text-[var(--fg-4)] hover:text-[var(--critical)]" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="card p-6 w-full max-w-[480px] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">
                {modal.editing ? 'Edit Department' : 'Add Department'}
              </h2>
              <button onClick={closeModal} className="btn btn-ghost p-1" disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Department name *</label>
                <input
                  value={modal.name}
                  onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))}
                  required
                  className="input h-9 w-full"
                  placeholder="e.g. Cardiology, Pharmacy"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Description (optional)</label>
                <textarea
                  value={modal.description}
                  onChange={(e) => setModal((m) => ({ ...m, description: e.target.value }))}
                  rows={2}
                  className="input w-full"
                  style={{ resize: 'none', paddingTop: 8, paddingBottom: 8 }}
                  placeholder="Brief description of this department's focus…"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Assigned roles</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 text-[13px] text-[var(--fg-2)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modal.assigned_roles.includes(r.value)}
                        onChange={() => toggleRole(r.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between gap-2 text-[13px] text-[var(--fg-2)] cursor-pointer">
                <span className="font-medium">Active</span>
                <input
                  type="checkbox"
                  checked={modal.is_active}
                  onChange={(e) => setModal((m) => ({ ...m, is_active: e.target.checked }))}
                />
              </label>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeModal} className="btn btn-ghost flex-1" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || !modal.name.trim()} className="btn btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'Saving…' : modal.editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete department"
        description="This deactivates the department. Existing staff profiles referencing it are not affected."
        confirmLabel="Delete"
        danger
        isLoading={deleteDepartment.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
