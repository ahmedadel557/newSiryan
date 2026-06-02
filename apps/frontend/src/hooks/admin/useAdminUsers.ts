'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { adminService } from '@/services/admin.service';
import { useToast } from '@/hooks/useToast';
import type { CreateUserDto, Role, User } from '@/types';

export type UserRoleFilter = 'all' | 'doctor' | 'nurse' | 'support' | 'patient';

export interface UseAdminUsersOptions {
  filter?: UserRoleFilter;
  search?: string;
}

export function useAdminUsers(options: UseAdminUsersOptions = {}) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { filter = 'all', search = '' } = options;

  const query = useQuery({
    queryKey: queryKeys.adminUsers(),
    queryFn: () => adminService.getUsers(),
  });

  const allUsers = query.data ?? [];

  const users = useMemo(() => {
    let list = allUsers;
    if (filter === 'doctor') list = list.filter((u) => u.role === 'doctor');
    else if (filter === 'nurse') list = list.filter((u) => u.role === 'nurse');
    else if (filter === 'support')
      list = list.filter((u) => !['doctor', 'nurse', 'patient'].includes(u.role));
    else if (filter === 'patient') list = list.filter((u) => u.role === 'patient');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allUsers, filter, search]);

  const createUser = useMutation({
    mutationFn: (data: CreateUserDto) => adminService.createUser(data),
    onSuccess: (created: User) => {
      qc.setQueryData<User[] | undefined>(queryKeys.adminUsers(), (prev) =>
        prev ? [created, ...prev] : [created],
      );
      showToast('User created', 'success');
    },
    onError: () => showToast('Failed to create user', 'error'),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      adminService.updateUserRole(id, role),
    onSuccess: (updated: User) => {
      qc.setQueryData<User[] | undefined>(queryKeys.adminUsers(), (prev) =>
        prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev,
      );
      showToast('Role updated', 'success');
    },
    onError: () => showToast('Failed to update role', 'error'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminService.updateUserActive(id, isActive),
    onSuccess: (updated: User, vars) => {
      qc.setQueryData<User[] | undefined>(queryKeys.adminUsers(), (prev) =>
        prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev,
      );
      showToast(vars.isActive ? 'User activated' : 'User deactivated', 'success');
    },
    onError: () => showToast('Failed to update user', 'error'),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: (_, id) => {
      qc.setQueryData<User[] | undefined>(queryKeys.adminUsers(), (prev) =>
        prev ? prev.filter((u) => u.id !== id) : prev,
      );
      showToast('User deleted', 'success');
    },
    onError: () => showToast('Failed to delete user', 'error'),
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminService.updateUserProfile>[1] }) =>
      adminService.updateUserProfile(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUser(id) });
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers() });
      showToast('Profile updated', 'success');
    },
    onError: () => showToast('Failed to update profile', 'error'),
  });

  return {
    users,
    allUsers,
    loading: query.isLoading,
    error: query.error,
    createUser,
    updateRole,
    toggleActive,
    deleteUser,
    updateProfile,
  };
}
