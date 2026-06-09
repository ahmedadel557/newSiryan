'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { CreateUserDto, Role } from '@/types';
import { departmentService } from '@/services/department.service';
import { DEPARTMENT_SPECIALIZATIONS } from '@/components/auth/register/registerTypes';
import { queryKeys } from '@/lib/queryKeys';

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';
const fieldClass = 'flex flex-col gap-1';

const ROLES: Role[] = [
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'inventory_manager',
  'lab_technician',
  'radiology_technician',
  'cashier',
  'admin',
];

interface CreateStaffModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserDto) => void;
}

export function CreateStaffModal({ open, onClose, onSubmit }: CreateStaffModalProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('nurse');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: allDepts = [] } = useQuery({
    queryKey: queryKeys.adminDepartments(),
    queryFn: () => departmentService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const depts = allDepts.filter((d) => d.assigned_roles?.includes(role) ?? false);
  const specs = role === 'doctor' && department ? (DEPARTMENT_SPECIALIZATIONS[department] ?? []) : [];

  const showDeptField = role !== 'admin';
  const showSpecField = role === 'doctor';

  function reset() {
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('nurse');
    setFirstName('');
    setLastName('');
    setPhone('');
    setDepartment('');
    setSpecialization('');
    setNationalId('');
  }

  function handleRoleChange(newRole: Role) {
    setRole(newRole);
    setDepartment('');
    setSpecialization('');
  }

  function handleDeptChange(dept: string) {
    setDepartment(dept);
    setSpecialization('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        username,
        email,
        password,
        role,
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        department: department || undefined,
        specialization: specialization || undefined,
        national_id: nationalId || undefined,
      });
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[520px] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)] shrink-0">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Create staff account</Dialog.Title>
              <button onClick={onClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name row */}
                <div className={fieldClass}>
                  <label className={labelClass}>First name</label>
                  <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="Sara" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Last name</label>
                  <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Hassan" />
                </div>

                {/* Username */}
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Username</label>
                  <input required value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="sara.hassan" />
                </div>

                {/* Email */}
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="sara@siryan.health"
                  />
                </div>

                {/* Password */}
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Password</label>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>

                {/* Role + Phone */}
                <div className={fieldClass}>
                  <label className={labelClass}>Role</label>
                  <select value={role} onChange={(e) => handleRoleChange(e.target.value as Role)} className={inputClass}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="01xxxxxxxxx"
                    maxLength={11}
                  />
                </div>

                {/* National ID */}
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>National ID</label>
                    <span style={{ fontSize: 11, color: nationalId.length === 14 ? 'var(--positive)' : 'var(--fg-3)' }}>
                      {nationalId.length}/14
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    className={inputClass}
                    placeholder="14-digit national ID"
                    maxLength={14}
                  />
                </div>

                {/* Department — hidden for admin role */}
                {showDeptField && (
                  <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                    <label className={labelClass}>Department</label>
                    <select
                      value={department}
                      onChange={(e) => handleDeptChange(e.target.value)}
                      className={inputClass}
                      disabled={depts.length === 0}
                    >
                      <option value="">
                        {depts.length === 0 ? 'No departments for this role' : 'Select department…'}
                      </option>
                      {depts.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Specialization — only for doctor */}
                {showSpecField && (
                  <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                    <label className={labelClass}>Specialization</label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className={inputClass}
                      disabled={!department}
                    >
                      <option value="">
                        {!department ? 'Select department first' : specs.length === 0 ? 'No specializations for this department' : 'Select specialization…'}
                      </option>
                      {specs.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
