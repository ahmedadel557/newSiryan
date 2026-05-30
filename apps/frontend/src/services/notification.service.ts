import apiClient from './api.client';
import type { ApiResponse, Notification } from '@/types';

const normalizeList = <T>(list: any[]): T[] => list.map((d: any) => ({ ...d, id: d._id ?? d.id }));

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const res = await apiClient.get<ApiResponse<Notification[]>>('/notifications');
    return normalizeList<Notification>(res.data.data);
  },

  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  async deleteOne(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  async clearAll(): Promise<void> {
    await apiClient.delete('/notifications');
  },
};
