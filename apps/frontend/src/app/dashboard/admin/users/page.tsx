'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAdminUsers, type UserRoleFilter } from '@/hooks/admin';
import { useAuth } from '@/hooks/useAuth';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { UsersTable } from '@/components/staff/admin/UsersTable';
import { CreateStaffModal } from '@/components/staff/admin/CreateStaffModal';
import { EditRoleModal } from '@/components/staff/admin/EditRoleModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { User } from '@/types';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [userFilter, setUserFilter] = useState<UserRoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    users,
    allUsers,
    loading,
    createUser,
    updateRole,
    toggleActive,
    deleteUser,
  } = useAdminUsers({ filter: userFilter, search: searchQuery });

  const kpiCards = [
    { label: 'Total Staff', value: allUsers.filter((user) => user.role !== 'patient').length },
    { label: 'Total Patients', value: allUsers.filter((u) => u.role === 'patient').length },
    { label: 'Active accounts', value: allUsers.filter((u) => u.is_active).length },
    { label: 'Inactive', value: allUsers.filter((u) => !u.is_active).length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Users accounts</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Manage users accounts and role permissions</p>
        </div>
        <button className="btn-primary text-[13px] flex items-center gap-1 btn shrink-0" onClick={() => setCreateModalOpen(true)}>
          <Plus size={14} /> Create user
        </button>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <UsersTable
        users={users}
        isLoading={loading}
        userFilter={userFilter}
        onFilterChange={setUserFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleActive={(id, isActive) => toggleActive.mutate({ id, isActive })}
        onEditRole={setEditRoleUser}
        onDelete={setDeleteConfirmId}
        currentUserId={currentUser?.id}
      />

      <CreateStaffModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={async (data) => {
          await createUser.mutateAsync(data);
          setCreateModalOpen(false);
        }}
      />

      <EditRoleModal
        user={editRoleUser}
        onClose={() => setEditRoleUser(null)}
        onSubmit={async (id, role) => {
          await updateRole.mutateAsync({ id, role });
          setEditRoleUser(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Delete user"
        description="This will permanently remove the user account. This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteUser.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onClose={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
