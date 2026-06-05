'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { departmentService, type DepartmentInput } from '@/services/department.service';
import { useToast } from '@/hooks/shared';

export function useAdminDepartments() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.adminDepartments(),
    queryFn: () => departmentService.getAll(true),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.adminDepartments() });

  const createDepartment = useMutation({
    mutationFn: (data: DepartmentInput) => departmentService.create(data),
    onSuccess: () => {
      invalidate();
      showToast('Department created', 'success');
    },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to create department', 'error'),
  });

  const updateDepartment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DepartmentInput> }) =>
      departmentService.update(id, data),
    onSuccess: () => {
      invalidate();
      showToast('Department updated', 'success');
    },
    onError: (err: any) =>
      showToast(err?.response?.data?.message ?? 'Failed to update department', 'error'),
  });

  const deleteDepartment = useMutation({
    mutationFn: (id: string) => departmentService.delete(id),
    onSuccess: () => {
      invalidate();
      showToast('Department deleted', 'success');
    },
    onError: () => showToast('Failed to delete department', 'error'),
  });

  return {
    departments: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
