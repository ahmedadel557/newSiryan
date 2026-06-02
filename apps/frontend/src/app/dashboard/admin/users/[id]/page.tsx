'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldOff, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { useAuth } from '@/hooks/shared';
import { useToast } from '@/hooks/shared';
import { Skeleton } from '@/components/ui/Skeleton';
import type { User, Profile, Role, Department } from '@/types';

const ALL_ROLES: Role[] = [
  'patient',
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

const ROLE_LABELS: Record<Role, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  inventory_manager: 'Inventory Manager',
  lab_technician: 'Lab Technician',
  radiology_technician: 'Radiology Technician',
  cashier: 'Cashier',
  admin: 'Admin',
};

function RoleChip({ role }: { role: Role }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ background: 'var(--brand-soft-bg)', color: 'var(--brand)' }}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusChip({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={
        active
          ? { background: 'var(--positive-soft-bg)', color: 'var(--positive-soft-fg)' }
          : { background: 'var(--critical-soft-bg)', color: 'var(--critical)' }
      }
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-[var(--fg-3)] uppercase tracking-wide">{label}</span>
      <span className="text-[13px] text-[var(--fg-1)]">{value}</span>
    </div>
  );
}

function TagList({ tags }: { tags?: string[] }) {
  if (!tags?.length) return <span className="text-[13px] text-[var(--fg-3)]">None</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="px-2 py-0.5 rounded-full text-[12px] font-medium"
          style={{ background: 'var(--caution-soft-bg)', color: 'var(--caution-soft-fg)' }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const isSelf = !!currentUser && id === currentUser.id;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isRoleUpdating, setIsRoleUpdating] = useState(false);
  const [isActiveUpdating, setIsActiveUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '', last_name: '', phone: '', department: '', specialization: '', shift: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user?.role) setSelectedRole(user.role);
  }, [user?.role]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const [{ user: u, profile: p }, depts] = await Promise.all([
          adminService.getUserById(id),
          adminService.getDepartments().catch(() => []),
        ]);
        setUser(u);
        setProfile(p);
        setDepartments(depts);
        if (p) {
          setProfileForm({
            first_name:     (p as Profile).first_name    ?? '',
            last_name:      (p as Profile).last_name     ?? '',
            phone:          (p as Profile).phone         ?? '',
            department:     (p as Profile).department    ?? '',
            specialization: (p as Profile).specialization ?? '',
            shift:          (p as Profile).shift         ?? '',
          });
        }
      } catch {
        showToast('Failed to load user', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [id]);

  async function handleRoleUpdate() {
    if (!user || selectedRole === user.role) return;
    setIsRoleUpdating(true);
    try {
      const updated = await adminService.updateUserRole(user.id, selectedRole as Role);
      setUser(updated);
      showToast(`Role updated to ${ROLE_LABELS[selectedRole as Role] ?? selectedRole}`, 'success');
    } catch {
      showToast('Failed to update role', 'error');
    } finally {
      setIsRoleUpdating(false);
    }
  }

  async function handleActiveToggle() {
    if (!user) return;
    setIsActiveUpdating(true);
    try {
      const updated = await adminService.updateUserActive(user.id, !user.is_active);
      setUser(updated);
      showToast(updated.is_active ? 'Account activated' : 'Account deactivated', 'success');
    } catch {
      showToast('Failed to update account status', 'error');
    } finally {
      setIsActiveUpdating(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setIsDeleting(true);
    try {
      await adminService.deleteUser(user.id);
      showToast('User deleted', 'success');
      router.push('/dashboard/admin/users');
    } catch {
      showToast('Failed to delete user', 'error');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleProfileSave() {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const updated = await adminService.updateUserProfile(user.id, profileForm);
      setProfile(updated);
      setEditingProfile(false);
      showToast('Profile updated', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  }

  const initials = user
    ? ((profile as Profile)?.first_name?.[0] ?? user.username[0]).toUpperCase() +
      ((profile as Profile)?.last_name?.[0] ?? '').toUpperCase()
    : '?';

  const fullName = user
    ? [(profile as Profile)?.first_name, (profile as Profile)?.last_name].filter(Boolean).join(' ') || user.username
    : '';

  const patientProfile = user?.role === 'patient' ? (profile as Profile) : null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 max-w-[800px]">
        <Skeleton height="32px" width="200px" />
        <Skeleton height="96px" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="120px" />
        ))}
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-5 max-w-[800px]">
      {/* Header row */}
      <div className="flex items-start flex-wrap gap-4">
        <div className="flex-1">
          <Link
            href="/dashboard/admin/users"
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors mb-2"
          >
            <ArrowLeft size={13} /> Back to users
          </Link>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">{fullName || user.username}</h1>
          <div className="flex items-center gap-2 mt-1">
            <RoleChip role={user.role} />
            <StatusChip active={user.is_active} />
          </div>
        </div>
        <div
          className="h-[64px] w-[64px] rounded-full flex items-center justify-center text-[22px] font-bold shrink-0"
          style={{ background: 'var(--brand)', color: 'var(--fg-on-brand)' }}
        >
          {initials}
        </div>
      </div>

      {/* Card 1 — Account info */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] p-4 sm:p-6">
        <p className="text-[13px] font-semibold text-[var(--fg-2)] uppercase tracking-wide mb-4">Account</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label="Username" value={user.username} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Joined" value={user.created_at ? new Date(user.created_at).toLocaleDateString() : undefined} />
        </div>
      </div>

      {/* Card 2 — Personal info */}
      {profile && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-[var(--fg-2)] uppercase tracking-wide">Personal</p>
            {user?.role !== 'patient' && !editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="btn btn-ghost text-[12px] flex items-center gap-1"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'First name', key: 'first_name' },
                  { label: 'Last name',  key: 'last_name'  },
                  { label: 'Phone',      key: 'phone'      },
                  { label: 'Specialization', key: 'specialization' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[11px] text-[var(--fg-3)] uppercase tracking-wide">{label}</label>
                    <input
                      className="input text-[13px]"
                      value={(profileForm as any)[key]}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--fg-3)] uppercase tracking-wide">Department</label>
                  <select
                    className="input text-[13px]"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--fg-3)] uppercase tracking-wide">Shift</label>
                  <select
                    className="input text-[13px]"
                    value={profileForm.shift}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, shift: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleProfileSave}
                  disabled={isSavingProfile}
                  className="btn btn-primary text-[13px] disabled:opacity-40"
                >
                  {isSavingProfile ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="btn btn-ghost text-[13px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow label="First name" value={(profile as Profile).first_name} />
              <InfoRow label="Last name" value={(profile as Profile).last_name} />
              <InfoRow label="Phone" value={(profile as Profile).phone} />
              {user?.role !== 'patient' && (
                <>
                  <InfoRow label="Department" value={(profile as Profile).department} />
                  <InfoRow label="Specialization" value={(profile as Profile).specialization} />
                  <InfoRow label="Shift" value={(profile as Profile).shift} />
                </>
              )}
              {patientProfile && (
                <>
                  <InfoRow
                    label="Date of birth"
                    value={patientProfile.date_of_birth ? new Date(patientProfile.date_of_birth).toLocaleDateString() : undefined}
                  />
                  <InfoRow label="Gender" value={patientProfile.gender} />
                  <InfoRow label="Blood type" value={patientProfile.blood_type} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Card 3 — Medical info (patients only) */}
      {patientProfile && (patientProfile.allergies?.length || patientProfile.insurance_provider) && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] p-4 sm:p-6">
          <p className="text-[13px] font-semibold text-[var(--fg-2)] uppercase tracking-wide mb-4">Medical</p>
          <div className="flex flex-col gap-4">
            {patientProfile.allergies && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-[var(--fg-3)] uppercase tracking-wide">Allergies</span>
                <TagList tags={patientProfile.allergies} />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow label="Insurance provider" value={patientProfile.insurance_provider} />
              <InfoRow label="Insurance number" value={patientProfile.insurance_number} />
            </div>
          </div>
        </div>
      )}

      {/* Card 4 — Role assignment */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] p-4 sm:p-6">
        <p className="text-[13px] font-semibold text-[var(--fg-2)] uppercase tracking-wide mb-1">Role assignment</p>
        <p className="text-[12px] text-[var(--fg-3)] mb-4">
          {isSelf ? 'You cannot change your own role.' : 'Changing the role affects what this user can access.'}
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            className="input text-[13px]"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
            disabled={isSelf}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary text-[13px] w-full sm:w-auto shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleRoleUpdate}
            disabled={isSelf || isRoleUpdating || selectedRole === user.role}
          >
            {isRoleUpdating ? 'Updating…' : 'Update role'}
          </button>
        </div>
      </div>

      {/* Card 5 — Account actions */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] p-4 sm:p-6">
        <p className="text-[13px] font-semibold text-[var(--fg-2)] uppercase tracking-wide mb-4">Account actions</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn btn-secondary text-[13px] flex items-center gap-1.5 w-full sm:w-auto"
            onClick={handleActiveToggle}
            disabled={isActiveUpdating}
          >
            {user.is_active ? (
              <>
                <ShieldOff size={14} /> {isActiveUpdating ? 'Deactivating…' : 'Deactivate account'}
              </>
            ) : (
              <>
                <ShieldCheck size={14} /> {isActiveUpdating ? 'Activating…' : 'Activate account'}
              </>
            )}
          </button>

          {!showDeleteConfirm ? (
            <button
              className="btn text-[13px] flex items-center gap-1.5 w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--critical-soft-bg)', color: 'var(--critical)' }}
              onClick={() => !isSelf && setShowDeleteConfirm(true)}
              disabled={isSelf}
              title={isSelf ? 'Cannot delete your own account' : undefined}
            >
              <Trash2 size={14} /> Delete account
            </button>
          ) : (
            <div
              className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-[var(--radius-md)] border w-full"
              style={{ borderColor: 'var(--critical)', background: 'var(--critical-soft-bg)' }}
            >
              <AlertTriangle size={14} style={{ color: 'var(--critical)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--critical)' }}>
                Permanently delete this account?
              </span>
              <button
                className="btn text-[12px] px-3 py-1.5"
                style={{ background: 'var(--critical)', color: '#fff' }}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button className="btn btn-ghost text-[12px] px-3 py-1.5" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
