'use client';

import { Plus } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { UsersTable } from '@/components/staff/admin/UsersTable';
import { CreateStaffModal } from '@/components/staff/admin/CreateStaffModal';
import { EditRoleModal } from '@/components/staff/admin/EditRoleModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const {
    users,
    allUsers,
    isLoading,
    createModalOpen,
    setCreateModalOpen,
    editRoleUser,
    setEditRoleUser,
    deleteConfirmId,
    setDeleteConfirmId,
    userFilter,
    setUserFilter,
    searchQuery,
    setSearchQuery,
    createUser,
    toggleUserActive,
    updateUserRole,
    deleteUser,
  } = useAdmin();

  const kpiCards = [
    {
      label: 'Total Staff',
      value: allUsers.filter((user) => user.role !== 'patient').length,
    },
    {
      label: 'Total Patients',
      value: allUsers.filter((u) => u.role === 'patient').length,
    },
    {
      label: 'Active accounts',
      value: allUsers.filter((u) => u.is_active).length,
    },
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
        isLoading={isLoading}
        userFilter={userFilter}
        onFilterChange={setUserFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleActive={toggleUserActive}
        onEditRole={setEditRoleUser}
        onDelete={setDeleteConfirmId}
        currentUserId={currentUser?.id}
      />

      <CreateStaffModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSubmit={createUser} />

      <EditRoleModal user={editRoleUser} onClose={() => setEditRoleUser(null)} onSubmit={updateUserRole} />

      <ConfirmDialog
        open={!!deleteConfirmId}
        title="Delete user"
        description="This will permanently remove the user account. This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteConfirmId) deleteUser(deleteConfirmId);
        }}
        onClose={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
