import apiClient from './api.client';
import type {
  ApiResponse,
  CashierInvoice,
  CashierInvoiceStatus,
  CashierPaymentMethod,
  CreateInvoiceDto,
  DailyReport,
  Invoice,
  PaymentDto,
  PendingItem,
  PendingPatient,
} from '@/types';
import { normalizeInvoice } from './patient.service';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export type BillablePatient = {
  id: string;
  username: string;
  email: string;
  full_name: string;
};

export type UnbilledLine = {
  source: 'appointment' | 'pharmacy' | 'lab' | 'radiology' | 'room';
  source_id: string;
  description: string;
  category: 'appointment' | 'pharmacy' | 'lab' | 'radiology' | 'room';
  amount: number;
};

export type UnbilledSummary = {
  items: UnbilledLine[];
  subtotal: number;
  total_due: number;
};

export const cashierService = {
  async getInvoices(): Promise<Invoice[]> {
    const res = await apiClient.get<ApiResponse<Invoice[]>>('/cashier/invoices');
    return (res.data.data ?? []).map(normalizeInvoice);
  },

  async getInvoice(id: string): Promise<Invoice> {
    const res = await apiClient.get<ApiResponse<Invoice>>(`/cashier/invoices/${id}`);
    return normalizeInvoice(res.data.data);
  },

  async createInvoice(data: CreateInvoiceDto): Promise<Invoice> {
    const res = await apiClient.post<ApiResponse<Invoice>>('/cashier/invoices', data);
    return normalizeInvoice(res.data.data);
  },

  async processPayment(id: string, data: PaymentDto): Promise<Invoice> {
    const res = await apiClient.patch<ApiResponse<Invoice>>(`/cashier/invoices/${id}/pay`, data);
    return normalizeInvoice(res.data.data);
  },

  async getDailyStats(): Promise<{ total_collected: number; pending_amount: number }> {
    const res = await apiClient.get<ApiResponse<{ total_collected: number; pending_amount: number }>>('/cashier/stats/daily');
    return res.data.data;
  },

  // Raw daily report — NOT routed through normalizeInvoice (preserves patient_name, mixed, paid_at).
  async getDailyReport(date?: string): Promise<DailyReport> {
    const res = await apiClient.get<ApiResponse<DailyReport>>('/cashier/reports/daily', {
      params: date ? { date } : undefined,
    });
    return res.data.data;
  },

  // Raw cashier invoices — NOT routed through normalizeInvoice (keeps patient_name, amount_paid, mixed).
  async getCashierInvoices(params?: { status?: CashierInvoiceStatus; date?: string }): Promise<CashierInvoice[]> {
    const res = await apiClient.get<ApiResponse<CashierInvoice[]>>('/cashier/invoices', { params });
    return (res.data.data ?? []).map((inv) => ({ ...inv, id: (inv as { _id?: string })._id ?? inv.id }));
  },

  // Single raw cashier invoice. getInvoiceById doesn't enrich patient_name, so fall back to username.
  async getCashierInvoice(id: string): Promise<CashierInvoice> {
    const res = await apiClient.get<ApiResponse<CashierInvoice & { _id?: string; patient?: { username?: string } }>>(
      `/cashier/invoices/${id}`
    );
    const inv = res.data.data;
    return { ...inv, id: inv._id ?? inv.id, patient_name: inv.patient_name || inv.patient?.username || '' };
  },

  // Full settle — PATCH /pay (backend defaults amount_paid to total_due and marks 'paid').
  async payInvoiceFull(
    id: string,
    data: { payment_method: CashierPaymentMethod; amount_paid?: number; notes?: string }
  ): Promise<CashierInvoice> {
    const res = await apiClient.patch<ApiResponse<CashierInvoice>>(`/cashier/invoices/${id}/pay`, data);
    const inv = res.data.data;
    return { ...inv, id: (inv as { _id?: string })._id ?? inv.id };
  },

  // Incremental payment — PATCH /partial (auto-promotes to 'paid' when fully covered).
  async payInvoicePartial(
    id: string,
    data: { amount_paid: number; payment_method: CashierPaymentMethod; notes?: string }
  ): Promise<CashierInvoice> {
    const res = await apiClient.patch<ApiResponse<{ invoice: CashierInvoice; remaining_balance: number }>>(
      `/cashier/invoices/${id}/partial`,
      data
    );
    const inv = res.data.data.invoice;
    return { ...inv, id: (inv as { _id?: string })._id ?? inv.id };
  },

  async cancelInvoice(id: string): Promise<CashierInvoice> {
    const res = await apiClient.patch<ApiResponse<CashierInvoice>>(`/cashier/invoices/${id}/cancel`);
    const inv = res.data.data;
    return { ...inv, id: (inv as { _id?: string })._id ?? inv.id };
  },

  // Cross-patient pending items grouped by patient (raw shape — no normalize needed).
  async getPending(): Promise<PendingPatient[]> {
    const res = await apiClient.get<ApiResponse<PendingPatient[]>>('/cashier/pending');
    return res.data.data ?? [];
  },

  // Build a correct createInvoice body from pending items (type → source + category).
  // Backend auto-computes the insurance discount from the patient's profile.
  async generateInvoiceFromPending(patientId: string, items: PendingItem[]): Promise<Invoice> {
    const body = {
      patient_id: patientId,
      items: items.map((i) => ({
        source: i.type,
        source_id: i.source_id,
        description: i.description,
        category: i.type,
        amount: i.amount,
      })),
    };
    const res = await apiClient.post<ApiResponse<Invoice>>('/cashier/invoices', body);
    return normalizeInvoice(res.data.data);
  },

  async getBillablePatients(): Promise<BillablePatient[]> {
    const res = await apiClient.get<ApiResponse<BillablePatient[]>>('/cashier/patients');
    return res.data.data;
  },

  async getPatientUnbilled(patientId: string): Promise<UnbilledSummary> {
    const res = await apiClient.get<ApiResponse<UnbilledSummary>>(`/cashier/patients/${patientId}/unbilled`);
    return res.data.data;
  },

  async generateConsolidatedInvoice(
    patientId: string,
    opts?: { insurance_coverage?: number; insurance_provider?: string }
  ): Promise<Invoice> {
    const res = await apiClient.post<ApiResponse<Invoice>>(
      `/cashier/patients/${patientId}/generate-invoice`,
      opts ?? {}
    );
    return normalizeInvoice(res.data.data);
  },
};
