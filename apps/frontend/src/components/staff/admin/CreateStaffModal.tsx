'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { CreateUserDto, Role } from '@/types';

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
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ username, email, password, role, first_name: firstName, last_name: lastName });
    setSubmitting(false);
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('nurse');
    setFirstName('');
    setLastName('');
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[500px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Create staff account</Dialog.Title>
              <button onClick={onClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={fieldClass}>
                  <label className={labelClass}>First name</label>
                  <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="Sara" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Last name</label>
                  <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Hassan" />
                </div>
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Username</label>
                  <input required value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="sara.hassan" />
                </div>
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
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Password</label>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                </div>
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
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
