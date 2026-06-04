import apiClient from './api.client';
import type {
  ApiResponse,
  PaginatedResponse,
  Appointment,
  Profile,
  BookAppointmentDto,
  CreatePatientDto,
  CancelRequest,
  LabOrder,
  RadiologyOrder,
} from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const receptionistService = {
  async getAppointments(date?: string, status?: string): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (status) params.set('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<Appointment[]>>(`/receptionist/appointments${qs}`);
    return normalizeList<Appointment>(res.data.data);
  },

  async createAppointment(data: BookAppointmentDto): Promise<Appointment> {
    const res = await apiClient.post<ApiResponse<Appointment>>('/receptionist/appointments', data);
    return normalize<Appointment>(res.data.data);
  },

  async confirmAppointment(id: string): Promise<Appointment> {
    const res = await apiClient.patch<ApiResponse<Appointment>>(`/receptionist/appointments/${id}/confirm`);
    return normalize<Appointment>(res.data.data);
  },

  async cancelAppointment(id: string, cancel_reason?: string): Promise<void> {
    await apiClient.patch(`/receptionist/appointments/${id}/cancel`, { cancel_reason });
  },

  async rescheduleAppointment(id: string, new_date: string, new_time: string): Promise<void> {
    await apiClient.patch(`/receptionist/appointments/${id}/reschedule`, { new_date, new_time });
  },

  async getPatients(params?: { search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Profile>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const res = await apiClient.get<ApiResponse<any>>(`/receptionist/patients${qs ? `?${qs}` : ''}`);
    const d = res.data.data;
    if (Array.isArray(d)) return { items: normalizeList<Profile>(d), total: d.length, page: 1, limit: params?.limit ?? 20, totalPages: 1, hasNext: false, hasPrev: false };
    return { ...d, items: normalizeList<Profile>(d.items ?? []) };
  },

  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    const res = await apiClient.get<ApiResponse<Appointment[]>>(`/receptionist/patients/${patientId}/appointments`);
    return normalizeList<Appointment>(res.data.data);
  },

  async registerPatient(data: CreatePatientDto): Promise<Profile> {
    const res = await apiClient.post<ApiResponse<Profile>>('/receptionist/patients', data);
    return normalize<Profile>(res.data.data);
  },

  async checkInPatient(patientId: string, appointmentId?: string): Promise<void> {
    await apiClient.post(`/receptionist/checkin/${patientId}`, { appointment_id: appointmentId });
  },

  async getRequests(): Promise<CancelRequest[]> {
    const res = await apiClient.get<ApiResponse<CancelRequest[]>>('/receptionist/requests');
    return normalizeList<CancelRequest>(res.data.data);
  },

  async confirmCancelRequest(appointmentId: string, cancel_reason?: string): Promise<void> {
    await apiClient.patch(`/receptionist/appointments/${appointmentId}/cancel`, {
      patient_response: 'confirmed',
      cancel_reason,
    });
  },

  async rejectCancelRequest(appointmentId: string): Promise<void> {
    await apiClient.patch(`/receptionist/appointments/${appointmentId}/cancel`, {
      patient_response: 'rejected',
    });
  },

  async confirmRescheduleRequest(appointmentId: string, new_date: string, new_time: string): Promise<void> {
    await apiClient.patch(`/receptionist/appointments/${appointmentId}/reschedule`, {
      patient_response: 'confirmed',
      new_date,
      new_time,
    });
  },

  async rejectRescheduleRequest(appointmentId: string): Promise<void> {
    await apiClient.patch(`/receptionist/appointments/${appointmentId}/reschedule`, {
      patient_response: 'rejected',
    });
  },

  async getLabOrders(): Promise<LabOrder[]> {
    const res = await apiClient.get<ApiResponse<LabOrder[]>>('/receptionist/lab-orders');
    return normalizeList<LabOrder>(res.data.data);
  },

  async getRadiologyOrders(): Promise<RadiologyOrder[]> {
    const res = await apiClient.get<ApiResponse<RadiologyOrder[]>>('/receptionist/radiology-orders');
    return normalizeList<RadiologyOrder>(res.data.data);
  },

  async searchPatients(query: string): Promise<Profile[]> {
    const result = await receptionistService.getPatients({ search: query, limit: 200 });
    return result.items;
  },
};
