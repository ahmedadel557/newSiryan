import apiClient from './api.client';
import type { ApiResponse, PaginatedResponse, LabOrder, LabResultsDto, LabScheduleGroup, OrderStatus } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const labService = {
  async getOrders(params?: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<LabOrder>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const res = await apiClient.get<ApiResponse<any>>(`/lab/orders${qs ? `?${qs}` : ''}`);
    const d = res.data.data;
    if (Array.isArray(d)) return { items: normalizeList<LabOrder>(d), total: d.length, page: 1, limit: params?.limit ?? 20, totalPages: 1, hasNext: false, hasPrev: false };
    return { ...d, items: normalizeList<LabOrder>(d.items ?? []) };
  },

  async getPendingOrders(): Promise<LabOrder[]> {
    const result = await labService.getOrders({ status: 'pending', limit: 200 });
    return result.items;
  },

  async getOrder(id: string): Promise<LabOrder> {
    const res = await apiClient.get<ApiResponse<LabOrder>>(`/lab/orders/${id}`);
    return normalize<LabOrder>(res.data.data);
  },

  async submitResults(id: string, data: LabResultsDto): Promise<LabOrder> {
    const res = await apiClient.patch<ApiResponse<LabOrder>>(`/lab/orders/${id}/results`, data);
    return normalize<LabOrder>(res.data.data);
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<LabOrder> {
    const res = await apiClient.patch<ApiResponse<LabOrder>>(`/lab/orders/${id}/status`, { status });
    return normalize<LabOrder>(res.data.data);
  },

  async getSchedule(): Promise<LabScheduleGroup[]> {
    const res = await apiClient.get<ApiResponse<LabScheduleGroup[]>>('/lab/schedule');
    return (res.data.data ?? []).map((group) => ({
      ...group,
      orders: normalizeList<LabOrder>(group.orders),
    }));
  },
};
