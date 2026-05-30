import apiClient from './api.client';
import type { ApiResponse, Role, Profile } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });

const roleToPath: Partial<Record<Role, string>> = {
  doctor: 'doctor',
  nurse: 'nurse',
  receptionist: 'receptionist',
  pharmacist: 'pharmacy',
  inventory_manager: 'inventory',
  lab_technician: 'lab',
  radiology_technician: 'radiology',
  cashier: 'cashier',
  admin: 'admin',
};

export const staffService = {
  async getProfile(role: Role): Promise<Profile> {
    const path = roleToPath[role];
    if (!path) throw new Error('No profile endpoint for this role');
    const res = await apiClient.get<ApiResponse<Profile>>(`/${path}/profile`);
    return normalize<Profile>(res.data.data);
  },

  async updateProfile(role: Role, data: Partial<Profile>): Promise<Profile> {
    const path = roleToPath[role];
    if (!path) throw new Error('No profile endpoint for this role');
    const res = await apiClient.put<ApiResponse<Profile>>(`/${path}/profile`, data);
    return normalize<Profile>(res.data.data);
  },
};
