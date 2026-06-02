import apiClient from './api.client';
import type {
  ApiResponse,
  Appointment,
  BlockedSlot,
  DiagnosisDto,
  DoctorNote,
  DoctorQueueItem,
  DoctorScheduleRoomBooking,
  LabOrder,
  LabOrderDto,
  MedicalRecord,
  Medication,
  Profile,
  Prescription,
  PrescriptionDto,
  RadiologyOrder,
  RadiologyOrderDto,
  VideoCallToken,
  Vitals,
} from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

function normalizeRecord(r: any): MedicalRecord {
  const latestVs = Array.isArray(r.vital_signs) ? r.vital_signs[0] : undefined;
  const vitals: Vitals = latestVs
    ? {
        blood_pressure_systolic: latestVs.blood_pressure_sys,
        blood_pressure_diastolic: latestVs.blood_pressure_dia,
        temperature_c: latestVs.temperature,
        heart_rate_bpm: latestVs.heart_rate,
        oxygen_saturation: latestVs.oxygen_level,
      }
    : {};
  return {
    ...normalize<MedicalRecord>(r),
    vitals,
    diagnosis: r.diagnosis ?? '',
    notes: r.notes,
    created_at: r.createdAt ?? r.created_at ?? '',
  };
}

function normalizeAppointment(a: any): Appointment {
  return {
    ...a,
    id: a._id ?? a.id,
    patient_id: a.patient_id ?? a.patient?.id ?? a.patient?._id?.toString() ?? '',
    doctor_id: a.doctor_id ?? a.doctor?.id ?? a.doctor?._id?.toString() ?? '',
    visit_type: a.visit_type ?? a.type,
    reason: a.reason ?? a.cancel_reason ?? '',
    duration_minutes: a.duration_minutes ?? 60,
    created_at: a.createdAt ?? a.created_at ?? '',
    updated_at: a.updatedAt ?? a.updated_at ?? '',
  };
}

function normalizeProfile(p: any): Profile {
  return {
    ...p,
    // Use user's id as the profile id so the queue join works:
    // appointments have patient_id = user's id; profiles must match on that key
    id: p.user?.id ?? p.user?._id?.toString() ?? p._id?.toString() ?? p.id,
  };
}

function normalizeNote(n: any): DoctorNote {
  return {
    id: n._id ?? n.id,
    patient_id: n.patient?._id?.toString() ?? n.patient?.toString() ?? n.patient_id ?? '',
    content: n.content ?? '',
    appointment_id: n.appointment?._id?.toString() ?? n.appointment?.toString() ?? n.appointment_id,
    created_at: n.createdAt ?? n.created_at ?? '',
    updated_at: n.updatedAt ?? n.updated_at ?? '',
  };
}

function buildVitalSigns(v?: Vitals): any[] {
  if (!v) return [];
  const vs: any = {};
  if (v.blood_pressure_systolic != null) vs.blood_pressure_sys = v.blood_pressure_systolic;
  if (v.blood_pressure_diastolic != null) vs.blood_pressure_dia = v.blood_pressure_diastolic;
  if (v.temperature_c != null) vs.temperature = v.temperature_c;
  if (v.heart_rate_bpm != null) vs.heart_rate = v.heart_rate_bpm;
  if (v.oxygen_saturation != null) vs.oxygen_level = v.oxygen_saturation;
  return Object.keys(vs).length > 0 ? [vs] : [];
}

export const doctorService = {
  async getPatients(filter?: string): Promise<Profile[]> {
    const params = filter ? `?filter=${filter}` : '';
    const res = await apiClient.get<ApiResponse<any[]>>(`/doctor/patients${params}`);
    return (res.data.data ?? []).map(normalizeProfile);
  },

  async getPatient(patientId: string): Promise<Profile> {
    const res = await apiClient.get<ApiResponse<any>>(`/doctor/patients/${patientId}`);
    return normalizeProfile(res.data.data);
  },

  async getPatientRecord(patientId: string): Promise<MedicalRecord | null> {
    const res = await apiClient.get<ApiResponse<any>>(`/doctor/patients/${patientId}/record`);
    const data = res.data.data;
    if (!data) return null;
    const raw = Array.isArray(data) ? data[0] : data;
    if (!raw) return null;
    return normalizeRecord(raw);
  },

  async getPatientMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(`/doctor/patients/${patientId}/records`);
    return (res.data.data ?? []).map(normalizeRecord);
  },

  async getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(`/doctor/patients/${patientId}/prescriptions`);
    return normalizeList<Prescription>(res.data.data ?? []);
  },

  async getPatientLabOrders(patientId: string): Promise<LabOrder[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(`/doctor/patients/${patientId}/lab-orders`);
    return normalizeList<LabOrder>(res.data.data ?? []);
  },

  async getPatientRadiologyOrders(patientId: string): Promise<RadiologyOrder[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(`/doctor/patients/${patientId}/radiology-orders`);
    return normalizeList<RadiologyOrder>(res.data.data ?? []);
  },

  async writeDiagnosis(patientId: string, data: DiagnosisDto): Promise<MedicalRecord> {
    const diagText = [data.chief_complaint, data.diagnosis].filter(Boolean).join(' — ');
    const noteParts = [
      data.treatment_plan ? `Treatment: ${data.treatment_plan}` : null,
      data.icd_code ? `ICD: ${data.icd_code}` : null,
      data.notes ?? null,
    ].filter(Boolean);

    const payload = {
      diagnosis: diagText || data.diagnosis,
      notes: noteParts.length > 0 ? noteParts.join('\n') : undefined,
      appointment_id: data.appointment_id,
      vital_signs: buildVitalSigns(data.vitals),
    };

    const res = await apiClient.post<ApiResponse<any>>(`/doctor/patients/${patientId}/diagnosis`, payload);
    return normalizeRecord(res.data.data);
  },

  async writePrescription(patientId: string, data: PrescriptionDto): Promise<Prescription> {
    const payload = {
      medical_record_id: data.medical_record_id,
      items: (data.items as any[]).map((item) => ({
        medication_id: item.medication_id,
        dosage: item.dose ?? item.dosage,
        frequency: item.frequency,
        duration_days: item.duration_days,
        instructions: item.instructions,
      })),
    };
    const res = await apiClient.post<ApiResponse<Prescription>>(`/doctor/patients/${patientId}/prescription`, payload);
    return normalize<Prescription>(res.data.data);
  },

  async orderLab(patientId: string, data: LabOrderDto): Promise<LabOrder> {
    const payload = {
      medical_record_id: data.medical_record_id,
      test_name: Array.isArray(data.tests_requested) ? data.tests_requested.join(', ') : (data as any).test_name ?? '',
    };
    const res = await apiClient.post<ApiResponse<LabOrder>>(`/doctor/patients/${patientId}/lab-order`, payload);
    return normalize<LabOrder>(res.data.data);
  },

  async orderRadiology(patientId: string, data: RadiologyOrderDto): Promise<RadiologyOrder> {
    const payload = {
      medical_record_id: data.medical_record_id,
      scan_type: data.modality ?? (data as any).scan_type,
    };
    const res = await apiClient.post<ApiResponse<RadiologyOrder>>(`/doctor/patients/${patientId}/radiology-order`, payload);
    return normalize<RadiologyOrder>(res.data.data);
  },

  async getSchedule(): Promise<Appointment[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/doctor/schedule');
    return (res.data.data ?? []).map(normalizeAppointment);
  },

  async requestReschedule(appointmentId: string, data: { reason: string; suggested_time?: string }): Promise<void> {
    await apiClient.post(`/doctor/appointments/${appointmentId}/reschedule-request`, {
      reason: data.reason,
      suggested_time: data.suggested_time,
    });
  },

  async requestCancel(appointmentId: string, data: { reason: string }): Promise<void> {
    await apiClient.post(`/doctor/appointments/${appointmentId}/cancel-request`, {
      cancel_reason: data.reason,
    });
  },

  async getMedications(): Promise<Medication[]> {
    const res = await apiClient.get<ApiResponse<Medication[]>>('/pharmacy/medications');
    return normalizeList<Medication>(res.data.data ?? []);
  },

  async blockTimeSlot(data: { date: string; start_time: string; end_time: string; reason?: string }): Promise<BlockedSlot> {
    const res = await apiClient.post<ApiResponse<any>>('/doctor/schedule/block', data);
    return normalize<BlockedSlot>(res.data.data);
  },

  async getBlockedSlots(params?: { from?: string; to?: string }): Promise<BlockedSlot[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/doctor/schedule/blocks', { params });
    return (res.data.data ?? []).map((b) => normalize<BlockedSlot>(b));
  },

  async unblockSlot(id: string): Promise<void> {
    await apiClient.delete(`/doctor/schedule/blocks/${id}`);
  },

  async scheduleFollowUp(
    patientId: string,
    data: { scheduled_at: string; reason?: string; parent_appointment_id?: string; type?: 'physical' | 'online' },
  ): Promise<Appointment> {
    const res = await apiClient.post<ApiResponse<Appointment>>(`/doctor/patients/${patientId}/follow-up`, data);
    return res.data.data;
  },

  async requestRoom(patientId: string, data: { room_type: 'operation' | 'icu' | 'radiology' | 'general'; doctor_notes?: string }): Promise<void> {
    await apiClient.post(`/doctor/patients/${patientId}/room-request`, data);
  },

  async getRoomBookings(params?: { from?: string; to?: string }): Promise<DoctorScheduleRoomBooking[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/doctor/room-bookings', { params });
    return (res.data.data ?? []).map((rb: any) => ({
      id: rb._id ?? rb.id,
      patient_id: rb.patient?._id ?? rb.patient?.id ?? rb.patient ?? '',
      patient_name: rb.patient?.username,
      room_name: rb.room?.name,
      room_type: rb.room?.type,
      check_in: rb.check_in,
      check_out: rb.check_out,
      status: rb.status,
    }));
  },

  async getProfile() {
    const res = await apiClient.get('/doctor/profile');
    return res.data.data;
  },

  async updateProfile(data: Partial<{ first_name: string; last_name: string; phone: string; bio: string; avatar_url: string; shift: 'morning' | 'evening' | 'night' | '' }>) {
    const res = await apiClient.put('/doctor/profile', data);
    return res.data.data;
  },

  async getMyRatings(): Promise<{
    avg: number | null;
    count: number;
    recent: Array<{ stars: number; feedback: string | null; created_at: string; patient_name?: string }>;
  }> {
    const res = await apiClient.get<ApiResponse<any>>('/doctor/me/ratings');
    return res.data.data;
  },

  async listSharedRecords(): Promise<Array<{
    id: string;
    record_id: string;
    patient_id: string;
    patient_name: string;
    patient_avatar: string | null;
    message: string | null;
    created_at: string;
    expires_at: string | null;
    record_summary: {
      diagnosis: string | null;
      chief_complaint: string | null;
      created_at: string;
      ref_doctor_name: string | null;
      ref_doctor_specialization: string | null;
    } | null;
  }>> {
    const res = await apiClient.get<ApiResponse<any[]>>('/doctor/shared-records');
    return res.data.data;
  },

  async getSharedRecord(id: string): Promise<{
    share: { id: string; message: string | null; created_at: string; expires_at: string | null };
    patient: {
      id: string;
      name: string;
      date_of_birth?: string | null;
      gender?: string | null;
      blood_type?: string | null;
      allergies?: string[];
      chronic_conditions?: string[];
    };
    record: any;
  }> {
    const res = await apiClient.get<ApiResponse<any>>(`/doctor/shared-records/${id}`);
    return res.data.data;
  },

  async getDoctorRatings(doctorId: string): Promise<{
    avg: number | null;
    count: number;
    recent: Array<{ stars: number; feedback: string | null; created_at: string }>;
  }> {
    const res = await apiClient.get<ApiResponse<any>>(`/doctor/${doctorId}/ratings`);
    return res.data.data;
  },

  // --- Today's queue (Part 1 backend: GET /doctor/queue/today) ---
  async getTodayQueue(): Promise<DoctorQueueItem[]> {
    const res = await apiClient.get<ApiResponse<DoctorQueueItem[]>>('/doctor/queue/today');
    return res.data.data ?? [];
  },

  // --- Private doctor notes (Part 1 backend: /doctor/notes) ---
  async getNotes(patientId: string): Promise<DoctorNote[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(`/doctor/notes/${patientId}`);
    return (res.data.data ?? []).map(normalizeNote);
  },

  async createNote(data: { patient_id: string; content: string; appointment_id?: string }): Promise<DoctorNote> {
    const res = await apiClient.post<ApiResponse<any>>('/doctor/notes', data);
    return normalizeNote(res.data.data);
  },

  async updateNote(noteId: string, data: { content: string }): Promise<DoctorNote> {
    const res = await apiClient.put<ApiResponse<any>>(`/doctor/notes/${noteId}`, data);
    return normalizeNote(res.data.data);
  },

  async deleteNote(noteId: string): Promise<void> {
    await apiClient.delete(`/doctor/notes/${noteId}`);
  },

  // --- Video call token (Part 1 backend: GET /doctor/video/token/:appointmentId) ---
  async getVideoCallToken(appointmentId: string): Promise<VideoCallToken> {
    const res = await apiClient.get<ApiResponse<VideoCallToken>>(`/doctor/video/token/${appointmentId}`);
    return res.data.data;
  },

  // --- Doctor opens the call (Part 1 backend: POST /doctor/video/call/:appointmentId) ---
  // Creates the Stream call server-side and returns token + the appointment (carries patient id for chat).
  async createVideoCall(
    appointmentId: string,
  ): Promise<{ callId: string; token: string; apiKey: string; status?: string; appointment: any }> {
    const res = await apiClient.post<ApiResponse<any>>(`/doctor/video/call/${appointmentId}`);
    return res.data.data;
  },

  // --- Doctor ends the call for both participants (POST /doctor/video/call/:callId/end) ---
  async endVideoCall(callId: string): Promise<void> {
    await apiClient.post(`/doctor/video/call/${callId}/end`);
  },
};
