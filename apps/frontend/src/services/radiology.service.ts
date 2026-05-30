import apiClient from './api.client';
import type { ApiResponse, RadiologyOrder, RadiologyFindingsDto, RadiologyScheduleGroup, OrderStatus } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const radiologyService = {
  async getOrders(status?: string): Promise<RadiologyOrder[]> {
    const url = status ? `/radiology/orders?status=${status}` : '/radiology/orders';
    const res = await apiClient.get<ApiResponse<RadiologyOrder[]>>(url);
    return normalizeList<RadiologyOrder>(res.data.data);
  },

  async getPendingOrders(): Promise<RadiologyOrder[]> {
    return radiologyService.getOrders('pending');
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
