import apiClient from './api.client';
import type {
  ApiResponse,
  PaginatedResponse,
  Profile,
  Appointment,
  BookingResult,
  Prescription,
  LabOrder,
  RadiologyOrder,
  Medication,
  MedicalRecord,
  Invoice,
  PharmacyOrder,
  RoomBooking,
  BookAppointmentDto,
  PatientPharmacyOrderDto,
  RoomBookingDto,
  InsuranceCompany,
  VideoCallToken,
} from '@/types';
import type { MockPaymentMethod } from '@/lib/pricing';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export function normalizeInvoice(raw: any): Invoice {
  const statusMap: Record<string, Invoice['payment_status']> = {
    unpaid: 'unpaid',
    paid: 'paid',
    partially_paid: 'partial',
    cancelled: 'refunded',
  };
  const methodMap: Record<string, Invoice['payment_method']> = {
    cash: 'cash',
    card: 'card',
    insurance: 'insurance',
    mixed: 'cash',
  };
  const lineItems: Invoice['line_items'] = (raw.items ?? []).map((item: any) => ({
    description: item.description ?? '',
    category: item.category ?? 'other',
    quantity: 1,
    unit_price: item.amount ?? 0,
    total: item.amount ?? 0,
  }));
  return {
    id: raw._id ?? raw.id ?? '',
    _id: raw._id,
    patient_id: raw.patient?._id ?? raw.patient?.id ?? raw.patient ?? '',
    appointment_id: raw.appointment?._id ?? raw.appointment?.id ?? raw.appointment,
    line_items: lineItems,
    subtotal: raw.subtotal ?? 0,
    discount_amount: raw.insurance_coverage ?? 0,
    tax_amount: 0,
    total_amount: raw.total_due ?? raw.subtotal ?? 0,
    payment_status: statusMap[raw.status] ?? 'unpaid',
    payment_method: raw.payment_method ? methodMap[raw.payment_method] : undefined,
    issued_at: raw.createdAt ?? raw.issued_at ?? '',
    paid_at: raw.paid_at,
    due_date: raw.due_date ?? raw.createdAt ?? '',
    notes: raw.notes,
  };
}

export const patientService = {
  async getProfile(): Promise<Profile> {
    const res = await apiClient.get<ApiResponse<Profile>>('/patient/profile');
    return normalize<Profile>(res.data.data);
  },

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    const res = await apiClient.put<ApiResponse<Profile>>('/patient/profile', data);
    return normalize<Profile>(res.data.data);
  },

  async getAppointments(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Appointment>> {
    const res = await apiClient.get<ApiResponse<any>>('/patient/appointments', { params });
    const d = res.data.data;
    const normalizeAppt = (a: any): Appointment => {
      const base = { ...a, id: a._id ?? a.id };
      const doc = a.doctor;
      const doctorName = doc?.first_name ? `${doc.first_name} ${doc.last_name ?? ''}`.trim() : doc?.username ?? undefined;
      return { ...base, visit_type: a.type ?? a.visit_type, doctor_name: doctorName };
    };
    if (Array.isArray(d)) return { items: d.map(normalizeAppt), total: d.length, page: 1, limit: params?.limit ?? 20, totalPages: 1, hasNext: false, hasPrev: false };
    return { ...d, items: (d.items ?? []).map(normalizeAppt) };
  },

  async getAppointment(id: string): Promise<Appointment> {
    const res = await apiClient.get<ApiResponse<any>>(`/patient/appointments/${id}`);
    const raw = res.data.data;
    return { ...normalize<Appointment>(raw), visit_type: raw.type ?? raw.visit_type, doctor_name: raw.doctor_name };
  },

  async bookAppointment(data: BookAppointmentDto): Promise<BookingResult> {
    const res = await apiClient.post<ApiResponse<any>>('/patient/appointments', data);
    const raw = res.data.data ?? {};
    const a = raw.appointment ?? raw;
    const inv = raw.invoice;
    const appointment = {
      ...normalize<Appointment>(a),
      fee: a.fee,
      invoice_id: inv?._id ?? inv?.id,
    } as Appointment;
    return {
      appointment,
      invoice: {
        id: inv?._id ?? inv?.id ?? '',
        total_due: inv?.total_due ?? a.fee ?? 0,
        status: inv?.status ?? 'unpaid',
      },
    };
  },

  async payAppointmentMock(appointmentId: string, method: MockPaymentMethod): Promise<void> {
    await apiClient.post(`/patient/appointments/${appointmentId}/pay-mock`, { method });
  },

  async scheduleLabOrder(orderId: string, scheduledAt: string): Promise<void> {
    await apiClient.post(`/patient/lab-orders/${orderId}/schedule`, { scheduled_at: scheduledAt });
  },

  async scheduleRadiologyOrder(orderId: string, scheduledAt: string): Promise<void> {
    await apiClient.post(`/patient/radiology-orders/${orderId}/schedule`, { scheduled_at: scheduledAt });
  },

  async confirmRoomBooking(bookingId: string, data: { check_in: string; check_out?: string }): Promise<void> {
    await apiClient.post(`/patient/rooms/bookings/${bookingId}/confirm`, data);
  },

  async cancelAppointment(id: string): Promise<void> {
    await apiClient.delete(`/patient/appointments/${id}`);
  },

  async rateAppointment(id: string, data: { stars: number; feedback?: string }): Promise<void> {
    await apiClient.post(`/patient/appointments/${id}/rate`, data);
  },

  async getAppointmentRating(id: string): Promise<{ stars: number; feedback?: string } | null> {
    const res = await apiClient.get<ApiResponse<any>>(`/patient/appointments/${id}/rating`);
    return res.data.data ?? null;
  },

  async shareMedicalRecord(recordId: string, data: { doctor_id: string; message?: string; expires_in_days?: number }): Promise<void> {
    await apiClient.post(`/patient/medical-records/${recordId}/share`, data);
  },

  async getMyShares(): Promise<Array<{
    id: string;
    record: string;
    shared_with_doctor: string;
    doctor_name: string;
    doctor_specialization: string | null;
    message?: string;
    expires_at?: string | null;
    created_at: string;
    record_summary?: { diagnosis: string; chief_complaint?: string; created_at: string } | null;
  }>> {
    const res = await apiClient.get<ApiResponse<any[]>>('/patient/medical-record-shares');
    return res.data.data;
  },

  async revokeShare(id: string): Promise<void> {
    await apiClient.delete(`/patient/medical-record-shares/${id}`);
  },

  async getAppointmentWaitingEstimate(id: string): Promise<{
    patients_ahead: number;
    avg_minutes: number;
    estimated_minutes: number;
    status: string;
  }> {
    const res = await apiClient.get<ApiResponse<any>>(`/patient/appointments/${id}/waiting-estimate`);
    return res.data.data;
  },

  async getPrescriptions(): Promise<Prescription[]> {
    const res = await apiClient.get<ApiResponse<Prescription[]>>('/patient/prescriptions');
    return normalizeList<Prescription>(res.data.data);
  },

  async getLabResults(): Promise<LabOrder[]> {
    const res = await apiClient.get<ApiResponse<LabOrder[]>>('/patient/lab-results');
    return normalizeList<LabOrder>(res.data.data);
  },

  async getRadiologyResults(): Promise<RadiologyOrder[]> {
    const res = await apiClient.get<ApiResponse<RadiologyOrder[]>>('/patient/radiology-results');
    return normalizeList<RadiologyOrder>(res.data.data);
  },

  async sendChatMessage(data: { message: string; file_url?: string }): Promise<{ message: string }> {
    const res = await apiClient.post<ApiResponse<{ message: string }>>('/patient/chatbot', data);
    return res.data.data;
  },

  async orderMedication(data: PatientPharmacyOrderDto): Promise<PharmacyOrder> {
    const res = await apiClient.post<ApiResponse<any>>('/patient/pharmacy/order', data);
    const payload = res.data.data ?? {};
    const order = payload.order ?? payload;
    return normalize<PharmacyOrder>(order);
  },

  async getPharmacyOrders(): Promise<PharmacyOrder[]> {
    const res = await apiClient.get<ApiResponse<PharmacyOrder[]>>('/patient/pharmacy/orders');
    return normalizeList<PharmacyOrder>(res.data.data);
  },

  async getRoomBookings(): Promise<RoomBooking[]> {
    const res = await apiClient.get<ApiResponse<RoomBooking[]>>('/patient/rooms/bookings');
    return normalizeList<RoomBooking>(res.data.data);
  },

  async bookRoom(data: RoomBookingDto): Promise<RoomBooking> {
    const res = await apiClient.post<ApiResponse<RoomBooking>>('/patient/rooms/book', data);
    return normalize<RoomBooking>(res.data.data);
  },

  async cancelRoomBooking(id: string): Promise<void> {
    await apiClient.delete(`/patient/rooms/bookings/${id}`);
  },

  async getMedications(): Promise<Medication[]> {
    const res = await apiClient.get<ApiResponse<Medication[]>>('/pharmacy/medications');
    return normalizeList<Medication>(res.data.data);
  },

  async getMedicalRecords(): Promise<MedicalRecord[]> {
    const res = await apiClient.get<ApiResponse<MedicalRecord[]>>('/patient/medical-record');
    return normalizeList<MedicalRecord>(res.data.data);
  },

  async getInvoices(): Promise<Invoice[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/patient/invoices');
    return (res.data.data ?? []).map(normalizeInvoice);
  },

  async getInsuranceCompanies(): Promise<InsuranceCompany[]> {
    const res = await apiClient.get<ApiResponse<InsuranceCompany[]>>('/patient/insurance-companies');
    return res.data.data.map((c) => ({ ...c, id: (c as any)._id ?? c.id })) as InsuranceCompany[];
  },

  async getDepartments(): Promise<{ id: string; name: string }[]> {
    const res = await apiClient.get<ApiResponse<any>>('/patient/departments');
    const raw: any[] = Array.isArray(res.data.data)
      ? res.data.data
      : (res.data.data?.departments ?? []);
    return raw.map((d) => ({ id: d._id ?? d.id ?? d.name, name: d.name ?? String(d) }));
  },

  // Video token for an online appointment — backend GET /doctor/video/token/:id authorizes patients too.
  async getVideoCallToken(appointmentId: string): Promise<VideoCallToken> {
    const res = await apiClient.get<ApiResponse<VideoCallToken>>(`/doctor/video/token/${appointmentId}`);
    return res.data.data;
  },
};
