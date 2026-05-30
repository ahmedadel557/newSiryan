import { useState } from 'react';
import { X, UserCog } from 'lucide-react';
import type { User, Role } from '@/types';

const STAFF_ROLES: { value: Role; label: string }[] = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'radiology_technician', label: 'Radiology Technician' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'admin', label: 'Admin' },
];

interface Props {
  user: User | null;
  onClose: () => void;
  onSubmit: (id: string, role: Role) => void;
}

export function EditRoleModal({ user, onClose, onSubmit }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role>(user?.role ?? 'doctor');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    try {
      onSubmit(user.id, selectedRole);
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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[400px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div className="flex items-center gap-3">
            <div className="h-[36px] w-[36px] rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--brand-soft-bg)' }}>
              <UserCog size={16} strokeWidth={1.75} style={{ color: 'var(--brand-soft-fg)' }} />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[var(--fg-1)]">Edit role</p>
              <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="field">
            <label className="field-label">New role</label>
            <select className="input" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as Role)}>
              {STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || selectedRole === user.role}>
              {submitting ? 'Saving…' : 'Save role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
