import apiClient from './api.client';
import type { ApiResponse, Department } from '@/types';

const normalize = (d: any): Department => ({ ...d, id: d._id ?? d.id });

// Backend may return a bare array or { departments: [...] } — handle both.
const toList = (data: any): Department[] => {
  const list = Array.isArray(data) ? data : (data?.departments ?? []);
  return (Array.isArray(list) ? list : []).map(normalize);
};

export interface DepartmentInput {
  name: string;
  assigned_roles: string[];
  description?: string;
  is_active?: boolean;
}

export const departmentService = {
  // Admin — all departments (active by default; pass true to include inactive).
  async getAll(includeInactive = false): Promise<Department[]> {
    const res = await apiClient.get<ApiResponse<any>>('/admin/departments', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });
    return toList(res.data.data);
  },

  // Public — departments that accept the given role (used by the register form).
  async getByRole(role: string): Promise<Department[]> {
    const res = await apiClient.get<ApiResponse<any>>('/departments/by-role', {
      params: { role },
    });
    return toList(res.data.data);
  },

  async create(data: DepartmentInput): Promise<Department> {
    const res = await apiClient.post<ApiResponse<any>>('/admin/departments', data);
    return normalize(res.data.data);
  },

  async update(id: string, data: Partial<DepartmentInput>): Promise<Department> {
    const res = await apiClient.put<ApiResponse<any>>(`/admin/departments/${id}`, data);
    return normalize(res.data.data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/admin/departments/${id}`);
  },
};
