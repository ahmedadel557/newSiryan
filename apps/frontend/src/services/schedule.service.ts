import apiClient from './api.client';
import type {
  ApiResponse,
  ShiftDefinition,
  DepartmentScheduleRecord,
  DoctorScheduleRecord,
  StaffScheduleRecord,
  BlockedDateRecord,
  MyScheduleResponse,
} from '@/types';

const norm = <T>(d: any): T => ({ ...d, id: d._id ?? d.id });
const normArr = <T>(arr: any[]): T[] => (arr ?? []).map((d) => norm<T>(d));

export interface ShiftInput {
  name: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface ScheduleEntryInput {
  day_of_week: number;
  shift: string;
  is_active?: boolean;
}

export const scheduleService = {
  // ── My Schedule (authenticated self-view) ───────────────────────
  async getMySchedule(): Promise<MyScheduleResponse> {
    const res = await apiClient.get<ApiResponse<MyScheduleResponse>>('/schedule/me');
    return res.data.data;
  },

  // ── Shift Definitions ───────────────────────────────────────────
  async getShifts(): Promise<ShiftDefinition[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/admin/schedule/shifts');
    return normArr<ShiftDefinition>(res.data.data);
  },

  async createShift(data: ShiftInput): Promise<ShiftDefinition> {
    const res = await apiClient.post<ApiResponse<any>>('/admin/schedule/shifts', data);
    return norm<ShiftDefinition>(res.data.data);
  },

  async updateShift(id: string, data: Partial<ShiftInput>): Promise<ShiftDefinition> {
    const res = await apiClient.put<ApiResponse<any>>(`/admin/schedule/shifts/${id}`, data);
    return norm<ShiftDefinition>(res.data.data);
  },

  async deleteShift(id: string): Promise<void> {
    await apiClient.delete(`/admin/schedule/shifts/${id}`);
  },

  // ── Department Schedules ─────────────────────────────────────────
  async getDepartmentSchedule(department: string): Promise<DepartmentScheduleRecord> {
    const res = await apiClient.get<ApiResponse<any>>(
      `/admin/department-schedules/${encodeURIComponent(department)}`,
    );
    return norm<DepartmentScheduleRecord>(res.data.data);
  },

  async upsertDepartmentSchedule(
    department: string,
    data: { entries: ScheduleEntryInput[] },
  ): Promise<DepartmentScheduleRecord> {
    const res = await apiClient.put<ApiResponse<any>>(
      `/admin/department-schedules/${encodeURIComponent(department)}`,
      data,
    );
    return norm<DepartmentScheduleRecord>(res.data.data);
  },

  // ── Doctor Schedules ─────────────────────────────────────────────
  async getDoctorSchedules(): Promise<DoctorScheduleRecord[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/admin/doctor-schedules');
    return normArr<DoctorScheduleRecord>(res.data.data);
  },

  async getDoctorSchedule(doctorId: string): Promise<DoctorScheduleRecord> {
    const res = await apiClient.get<ApiResponse<any>>(`/admin/doctor-schedules/${doctorId}`);
    return norm<DoctorScheduleRecord>(res.data.data);
  },

  async upsertDoctorSchedule(
    doctorId: string,
    data: { entries?: ScheduleEntryInput[]; admin_controlled?: boolean },
  ): Promise<DoctorScheduleRecord> {
    const res = await apiClient.put<ApiResponse<any>>(
      `/admin/doctor-schedules/${doctorId}`,
      data,
    );
    return norm<DoctorScheduleRecord>(res.data.data);
  },

  // ── Staff Schedules ──────────────────────────────────────────────
  async getStaffSchedules(filters?: {
    department?: string;
    role?: string;
  }): Promise<StaffScheduleRecord[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/admin/staff-schedules', {
      params: filters,
    });
    return normArr<StaffScheduleRecord>(res.data.data);
  },

  async upsertStaffSchedule(
    userId: string,
    data: { entries?: ScheduleEntryInput[] },
  ): Promise<StaffScheduleRecord> {
    const res = await apiClient.put<ApiResponse<any>>(
      `/admin/staff-schedules/${userId}`,
      data,
    );
    return norm<StaffScheduleRecord>(res.data.data);
  },

  async applyDepartmentTemplate(department: string): Promise<{ updated: number }> {
    const res = await apiClient.post<ApiResponse<{ updated: number }>>(
      '/admin/staff-schedules/department-template',
      { department },
    );
    return res.data.data;
  },

  // ── Blocked Dates ────────────────────────────────────────────────
  async getBlockedDates(filters?: {
    scope?: 'department' | 'user';
    department?: string;
    user?: string;
  }): Promise<BlockedDateRecord[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/admin/blocked-dates', {
      params: filters,
    });
    return normArr<BlockedDateRecord>(res.data.data);
  },

  async createBlockedDate(data: {
    scope: 'department' | 'user';
    department?: string;
    user?: string;
    date: string;
    reason?: string;
  }): Promise<BlockedDateRecord> {
    const res = await apiClient.post<ApiResponse<any>>('/admin/blocked-dates', data);
    return norm<BlockedDateRecord>(res.data.data);
  },

  async deleteBlockedDate(id: string): Promise<void> {
    await apiClient.delete(`/admin/blocked-dates/${id}`);
  },
};
