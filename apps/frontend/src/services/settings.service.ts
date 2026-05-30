import apiClient from './api.client';
import type { ApiResponse, UserSettings } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });

export const settingsService = {
  async getSettings(): Promise<UserSettings> {
    const res = await apiClient.get<ApiResponse<UserSettings>>('/settings');
    return normalize<UserSettings>(res.data.data);
  },

  async changePassword(data: { current_password: string; new_password: string; confirm_password: string }): Promise<void> {
    await apiClient.put('/settings/password', data);
  },

  async updateNotifications(data: Partial<UserSettings['notifications']>): Promise<UserSettings> {
    const res = await apiClient.put<ApiResponse<UserSettings>>('/settings/notifications', data);
    return normalize<UserSettings>(res.data.data);
  },

  async updateAppearance(data: Partial<UserSettings['appearance']>): Promise<UserSettings> {
    const res = await apiClient.put<ApiResponse<UserSettings>>('/settings/appearance', data);
    return normalize<UserSettings>(res.data.data);
  },

  async deleteAccount(data: { password: string }): Promise<void> {
    await apiClient.delete('/settings/account', { data });
  },
};
