import apiClient from './api.client';
import type { ApiResponse, PaginatedResponse, RadiologyOrder, RadiologyFindingsDto, RadiologyScheduleGroup, OrderStatus } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const radiologyService = {
  async getOrders(params?: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<RadiologyOrder>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const res = await apiClient.get<ApiResponse<any>>(`/radiology/orders${qs ? `?${qs}` : ''}`);
    const d = res.data.data;
    if (Array.isArray(d)) return { items: normalizeList<RadiologyOrder>(d), total: d.length, page: 1, limit: params?.limit ?? 20, totalPages: 1, hasNext: false, hasPrev: false };
    return { ...d, items: normalizeList<RadiologyOrder>(d.items ?? []) };
  },

  async getPendingOrders(): Promise<RadiologyOrder[]> {
    const result = await radiologyService.getOrders({ status: 'pending', limit: 200 });
    return result.items;
  },

  async getOrder(id: string): Promise<RadiologyOrder> {
    const res = await apiClient.get<ApiResponse<RadiologyOrder>>(`/radiology/orders/${id}`);
    return normalize<RadiologyOrder>(res.data.data);
  },

  async submitResults(id: string, data: RadiologyFindingsDto): Promise<RadiologyOrder> {
    const res = await apiClient.patch<ApiResponse<RadiologyOrder>>(`/radiology/orders/${id}/results`, data);
    return normalize<RadiologyOrder>(res.data.data);
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<RadiologyOrder> {
    const res = await apiClient.patch<ApiResponse<RadiologyOrder>>(`/radiology/orders/${id}/status`, { status });
    return normalize<RadiologyOrder>(res.data.data);
  },

  async getSchedule(): Promise<RadiologyScheduleGroup[]> {
    const res = await apiClient.get<ApiResponse<RadiologyScheduleGroup[]>>('/radiology/schedule');
    return (res.data.data ?? []).map((group) => ({
      ...group,
      orders: normalizeList<RadiologyOrder>(group.orders),
    }));
  },
};
