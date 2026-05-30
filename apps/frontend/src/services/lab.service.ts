import apiClient from './api.client';
import type { ApiResponse, LabOrder, LabResultsDto, LabScheduleGroup, OrderStatus } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const labService = {
  async getOrders(status?: string): Promise<LabOrder[]> {
    const url = status ? `/lab/orders?status=${status}` : '/lab/orders';
    const res = await apiClient.get<ApiResponse<LabOrder[]>>(url);
    return normalizeList<LabOrder>(res.data.data);
  },

  async getPendingOrders(): Promise<LabOrder[]> {
    return labService.getOrders('pending');
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
