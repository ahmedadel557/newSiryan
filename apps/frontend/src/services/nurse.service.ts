import apiClient from './api.client';
import type { ApiResponse, NursePatient, Vitals, VitalsEntry, Prescription, RecordVitalsDto, EmergencyFlagDto, EmergencyFlag, EmergencyFlagKPIs } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const nurseService = {
  async getPatients(): Promise<NursePatient[]> {
    const res = await apiClient.get<ApiResponse<NursePatient[]>>('/nurse/patients');
    return normalizeList<NursePatient>(res.data.data);
  },

  async getPatientVitalsHistory(patientId: string): Promise<VitalsEntry[]> {
    const res = await apiClient.get<ApiResponse<VitalsEntry | VitalsEntry[]>>(`/nurse/patients/${patientId}/vitals`);
    const data = res.data.data;
    return Array.isArray(data) ? data : [data];
  },

  async recordVitals(patientId: string, data: RecordVitalsDto): Promise<Vitals> {
    const res = await apiClient.post<ApiResponse<Vitals>>(`/nurse/patients/${patientId}/vitals`, data);
    return res.data.data;
  },

  async getPatientMedications(patientId: string): Promise<Prescription[]> {
    const res = await apiClient.get<ApiResponse<Prescription[]>>(`/nurse/patients/${patientId}/medication-schedule`);
    return normalizeList<Prescription>(res.data.data);
  },

  async administerMedication(patientId: string, medId: string): Promise<void> {
    await apiClient.patch(`/nurse/patients/${patientId}/medication/${medId}/given`);
  },

  async sendEmergencyFlag(patientId: string, data: EmergencyFlagDto): Promise<void> {
    await apiClient.post(`/nurse/patients/${patientId}/emergency-flag`, data);
  },

  async getEmergencyFlags(status?: string): Promise<{ flags: EmergencyFlag[]; kpis: EmergencyFlagKPIs }> {
    const res = await apiClient.get<ApiResponse<{ flags: any[]; kpis: EmergencyFlagKPIs }>>(
      `/nurse/emergency-flags${status ? `?status=${status}` : ''}`,
    );
    const { flags, kpis } = res.data.data;
    return {
      flags: (flags ?? []).map((f) => ({ ...f, id: f._id ?? f.id, created_at: f.createdAt ?? f.created_at })),
      kpis,
    };
  },
};
