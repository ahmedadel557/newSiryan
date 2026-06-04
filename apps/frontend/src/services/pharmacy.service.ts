import apiClient from './api.client';
import type {
  ApiResponse,
  PaginatedResponse,
  PharmacyOrder,
  Medication,
  PharmacistRx,
  PharmacistPatientOrder,
  PharmacyOrderFull,
  PharmaMedication,
  PharmaMedicationBatch,
  PharmaPrescription,
  PharmaDispensingRecord,
  PharmaRefillRequest,
  PharmaDrugInteraction,
  PharmaDailyReport,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePatientOrder(raw: any): PharmacistPatientOrder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (raw.items ?? []).map((it: any) => ({
    name: it.medication?.name ?? 'Medication',
    quantity: it.quantity,
    price: it.price,
    requires_prescription: !!it.medication?.requires_prescription,
  }));
  return {
    id: raw._id ?? raw.id,
    patient_id: raw.patient?._id ?? raw.patient?.id ?? raw.patient ?? '',
    patient_name: raw.patient_name ?? raw.patient?.username,
    status: raw.status,
    total_amount: raw.total_amount,
    delivery_type: raw.delivery_type,
    has_prescription: !!raw.prescription,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requires_prescription: items.some((i: any) => i.requires_prescription),
    items,
    created_at: raw.createdAt ?? raw.created_at ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOrderFull(raw: any): PharmacyOrderFull {
  return {
    ...raw,
    id: raw._id ?? raw.id,
    patient_name: raw.patient_name ?? raw.patient?.username ?? raw.patient?.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (raw.items ?? []).map((it: any) => ({
      medication: it.medication?._id ?? it.medication ?? it.medication_id ?? '',
      medication_name: it.medication?.name ?? it.medication_name,
      quantity: it.quantity,
      price: it.price,
      requires_prescription: !!it.medication?.requires_prescription,
    })),
    order_type: raw.prescription ? 'prescription' : 'otc',
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    updatedAt: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMedication(raw: any): PharmaMedication {
  return {
    ...raw,
    id: raw._id ?? raw.id,
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    updatedAt: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePrescription(raw: any): PharmaPrescription {
  return {
    ...raw,
    id: raw._id ?? raw.id,
    patient_name: raw.patient?.username ?? raw.patient?.name ?? raw.patient_name,
    doctor_name: raw.doctor?.username ?? raw.doctor?.name ?? raw.doctor_name,
    doctor_specialization: raw.doctor?.specialization ?? raw.doctor_specialization,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (raw.items ?? []).map((it: any) => ({
      medication: it.medication?._id ?? it.medication ?? '',
      medication_name: it.medication?.name ?? it.medication_name,
      dosage: it.dosage,
      frequency: it.frequency,
      duration_days: it.duration_days,
      instructions: it.instructions,
    })),
    createdAt: raw.createdAt ?? raw.created_at ?? '',
    updatedAt: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

export const pharmacyService = {
  // ── Legacy methods (kept for backward compatibility) ──────────────────────

  async getPendingOrders(): Promise<PharmacyOrder[]> {
    const res = await apiClient.get<ApiResponse<PharmacyOrder[]>>('/pharmacy/orders?status=pending');
    return normalizeList<PharmacyOrder>(res.data.data);
  },

  async listPatientOrders(status?: string): Promise<PharmacistPatientOrder[]> {
    const params = status ? `?status=${status}` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any[]>>(`/pharmacy/orders${params}`);
    return (res.data.data ?? []).map(normalizePatientOrder);
  },

  async approvePatientOrder(id: string): Promise<void> {
    await apiClient.patch(`/pharmacy/orders/${id}/approve`);
  },

  async rejectPatientOrder(id: string): Promise<void> {
    await apiClient.patch(`/pharmacy/orders/${id}/reject`);
  },

  async getOrder(id: string): Promise<PharmacyOrder> {
    const res = await apiClient.get<ApiResponse<PharmacyOrder>>(`/pharmacy/orders/${id}`);
    return normalize<PharmacyOrder>(res.data.data);
  },

  async dispenseOrder(id: string): Promise<PharmacyOrder> {
    const res = await apiClient.patch<ApiResponse<PharmacyOrder>>(`/pharmacy/orders/${id}/approve`);
    return normalize<PharmacyOrder>(res.data.data);
  },

  async cancelOrder(id: string): Promise<void> {
    await apiClient.patch(`/pharmacy/orders/${id}/reject`);
  },

  async searchMedications(query: string): Promise<Medication[]> {
    const res = await apiClient.get<ApiResponse<Medication[]>>(`/pharmacy/medications?q=${encodeURIComponent(query)}`);
    return normalizeList<Medication>(res.data.data);
  },

  async getPrescriptionQueue(filter?: string): Promise<PharmacistRx[]> {
    const params = filter ? `?filter=${filter}` : '';
    const res = await apiClient.get<ApiResponse<PharmacistRx[]>>(`/pharmacy/prescriptions${params}`);
    return normalizeList<PharmacistRx>(res.data.data);
  },

  async verifyPrescription(id: string): Promise<PharmacistRx> {
    const res = await apiClient.post<ApiResponse<PharmacistRx>>(`/pharmacy/prescriptions/${id}/verify`);
    return normalize<PharmacistRx>(res.data.data);
  },

  async rejectPrescription(id: string): Promise<void> {
    await apiClient.post(`/pharmacy/prescriptions/${id}/reject`);
  },

  async getDispensedHistory(): Promise<PharmacistRx[]> {
    const res = await apiClient.get<ApiResponse<PharmacistRx[]>>('/pharmacy/prescriptions?state=dispensed');
    return normalizeList<PharmacistRx>(res.data.data);
  },

  // ── Orders ────────────────────────────────────────────────────────────────

  async listOrders(filters?: { status?: string; type?: string; page?: number; limit?: number }): Promise<PaginatedResponse<PharmacyOrderFull>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any>>(`/pharmacy/orders${qs}`);
    const d = res.data.data;
    if (Array.isArray(d)) return { items: d.map(normalizeOrderFull), total: d.length, page: 1, limit: filters?.limit ?? 20, totalPages: 1, hasNext: false, hasPrev: false };
    return { ...d, items: (d.items ?? []).map(normalizeOrderFull) };
  },

  async getOrderById(id: string): Promise<PharmacyOrderFull> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any>>(`/pharmacy/orders/${id}`);
    return normalizeOrderFull(res.data.data);
  },

  async approveOtcOrder(id: string): Promise<PharmacyOrderFull> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.patch<ApiResponse<any>>(`/pharmacy/orders/${id}/approve`);
    return normalizeOrderFull(res.data.data);
  },

  async approvePrescriptionOrder(id: string): Promise<PharmacyOrderFull> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.patch<ApiResponse<any>>(`/pharmacy/orders/${id}/approve-prescription`);
    return normalizeOrderFull(res.data.data);
  },

  async rejectOrder(id: string, reason: string): Promise<void> {
    await apiClient.patch(`/pharmacy/orders/${id}/reject`, { rejection_reason: reason });
  },

  async updateDeliveryStatus(
    id: string,
    data: { status: 'preparing' | 'dispatched' | 'delivered'; estimated_delivery_time?: string; tracking_notes?: string }
  ): Promise<PharmacyOrderFull> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.patch<ApiResponse<any>>(`/pharmacy/orders/${id}/delivery-status`, data);
    return normalizeOrderFull(res.data.data);
  },

  async checkDrugInteractions(medication_ids: string[]): Promise<{ interactions: PharmaDrugInteraction[]; has_severe: boolean }> {
    const res = await apiClient.post<ApiResponse<{ interactions: PharmaDrugInteraction[]; has_severe: boolean }>>(
      '/pharmacy/check-interactions',
      { medication_ids }
    );
    return res.data.data;
  },

  async getMedicationSubstitutes(id: string): Promise<PharmaMedication[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any[]>>(`/pharmacy/medications/${id}/substitutes`);
    return (res.data.data ?? []).map(normalizeMedication);
  },

  // ── Prescriptions ─────────────────────────────────────────────────────────

  async getPrescriptions(filters?: { status?: string; doctor?: string; specialization?: string; page?: number; limit?: number }): Promise<PaginatedResponse<PharmaPrescription>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.doctor) params.set('doctor', filters.doctor);
    if (filters?.specialization) params.set('specialization', filters.specialization);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any>>(`/pharmacy/prescriptions${qs}`);
    const d = res.data.data;
    if (Array.isArray(d)) return { items: d.map(normalizePrescription), total: d.length, page: 1, limit: filters?.limit ?? 20, totalPages: 1, hasNext: false, hasPrev: false };
    return { ...d, items: (d.items ?? []).map(normalizePrescription) };
  },

  async getPrescriptionById(id: string): Promise<PharmaPrescription> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any>>(`/pharmacy/prescriptions/${id}`);
    return normalizePrescription(res.data.data);
  },

  // ── Medications ───────────────────────────────────────────────────────────

  async getMedications(filters?: { low_stock?: boolean; expiring_soon?: boolean }): Promise<PharmaMedication[]> {
    const params = new URLSearchParams();
    if (filters?.low_stock) params.set('low_stock', 'true');
    if (filters?.expiring_soon) params.set('expiring_soon', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any[]>>(`/pharmacy/medications${qs}`);
    return (res.data.data ?? []).map(normalizeMedication);
  },

  async getMedicationBatches(id: string): Promise<PharmaMedicationBatch[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any[]>>(`/pharmacy/medications/${id}/batches`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data.data ?? []).map((b: any) => ({ ...b, id: b._id ?? b.id }));
  },

  async addMedicationBatch(
    id: string,
    data: { batch_number: string; quantity: number; expiry_date: string }
  ): Promise<PharmaMedicationBatch> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.post<ApiResponse<any>>(`/pharmacy/medications/${id}/batch`, data);
    return { ...res.data.data, id: res.data.data._id ?? res.data.data.id };
  },

  async createSupplyRequest(data: { medication_id: string; quantity_requested: number; notes?: string }): Promise<void> {
    await apiClient.post('/pharmacy/supply-request', data);
  },

  // ── Dispensing History ────────────────────────────────────────────────────

  async getDispensingHistory(filters?: { date?: string; medication_id?: string; patient_name?: string; page?: number; limit?: number }): Promise<PaginatedResponse<PharmaDispensingRecord>> {
    const params = new URLSearchParams();
    if (filters?.date) params.set('date', filters.date);
    if (filters?.medication_id) params.set('medication_id', filters.medication_id);
    if (filters?.patient_name) params.set('patient_name', filters.patient_name);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any>>(`/pharmacy/history${qs}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizeRecord = (r: any): PharmaDispensingRecord => ({
      ...r,
      id: r._id ?? r.id,
      patient_name: r.patient?.username ?? r.patient?.name ?? r.patient_name,
      pharmacist_name: r.pharmacist?.username ?? r.pharmacist?.name ?? r.pharmacist_name,
      medication_name: r.medication?.name ?? r.medication_name ?? '',
      dispensed_at: r.dispensed_at ?? r.createdAt ?? '',
    });
    const d = res.data.data;
    if (Array.isArray(d)) return { items: d.map(normalizeRecord), total: d.length, page: 1, limit: filters?.limit ?? 20, totalPages: 1, hasNext: false, hasPrev: false };
    return { ...d, items: (d.items ?? []).map(normalizeRecord) };
  },

  // ── Daily Report ──────────────────────────────────────────────────────────

  async getDailyReport(date?: string): Promise<PharmaDailyReport> {
    const qs = date ? `?date=${date}` : '';
    const res = await apiClient.get<ApiResponse<PharmaDailyReport>>(`/pharmacy/reports/daily${qs}`);
    return res.data.data;
  },

  // ── Refill Requests ───────────────────────────────────────────────────────

  async listRefillRequests(): Promise<PharmaRefillRequest[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any[]>>('/pharmacy/refill-requests');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data.data ?? []).map((r: any) => ({
      ...r,
      id: r._id ?? r.id,
      patient_name: r.patient?.username ?? r.patient?.name ?? r.patient_name,
      createdAt: r.createdAt ?? r.created_at ?? '',
      updatedAt: r.updatedAt ?? r.updated_at ?? '',
    }));
  },

  async approveRefillRequest(id: string): Promise<void> {
    await apiClient.patch(`/pharmacy/refill-requests/${id}/approve`);
  },

  async rejectRefillRequest(id: string, reason: string): Promise<void> {
    await apiClient.patch(`/pharmacy/refill-requests/${id}/reject`, { rejection_reason: reason });
  },

  // ── PDF ───────────────────────────────────────────────────────────────────

  async getMedicationInstructionsPdf(orderId: string): Promise<Blob> {
    const res = await apiClient.get(`/pharmacy/orders/${orderId}/instructions-pdf`, { responseType: 'blob' });
    return res.data as Blob;
  },
};
