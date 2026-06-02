import apiClient from './api.client';
import type { ApiResponse, User, Profile, CreateUserDto, DashboardStats, SystemLog, Role, DoctorReportItem, StaffRequest, InsuranceCompany, Department, AdminInvoice, OccupancyReport, PharmacyReport, AdminAppointment, CreateAdminInvoiceDto, DoctorSchedule, Shift, AssignShiftDto, Announcement, CreateAnnouncementDto, PricingSettings, PricingTestItem, RadiologyScanItem, MaintenanceStatus, EmailTemplate, DeletionRequest, SystemHealth, ErrorLog } from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const adminService = {
  async getUserById(id: string): Promise<{ user: User; profile: Profile | null }> {
    const res = await apiClient.get<ApiResponse<{ user: User; profile: Profile | null }>>(`/admin/users/${id}`);
    const d = res.data.data;
    return {
      user: normalize<User>(d.user),
      profile: d.profile ? normalize<Profile>(d.profile) : null,
    };
  },

  async getUsers(): Promise<User[]> {
    const res = await apiClient.get<ApiResponse<{ users: User[] }>>('/admin/users');
    return normalizeList<User>(res.data.data.users);
  },

  async createUser(data: CreateUserDto): Promise<User> {
    const res = await apiClient.post<ApiResponse<User>>('/admin/users', data);
    return normalize<User>(res.data.data);
  },

  async updateUserRole(id: string, role: Role): Promise<User> {
    const res = await apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/role`, { role });
    return normalize<User>(res.data.data);
  },

  async updateUserActive(id: string, is_active: boolean): Promise<User> {
    const res = await apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/activate`, { is_active });
    return normalize<User>(res.data.data);
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await apiClient.get<ApiResponse<DashboardStats>>('/admin/stats');
    return res.data.data;
  },

  async getAuditLog(): Promise<SystemLog[]> {
    const res = await apiClient.get<ApiResponse<SystemLog[]>>('/admin/audit-log');
    return normalizeList<SystemLog>(res.data.data);
  },

  async getRevenueReport(params?: { from?: string; to?: string }): Promise<{
    by_day: Array<{ _id: { year: number; month: number; day: number }; total: number; count: number }>;
    by_month: Array<{ _id: { year: number; month: number }; total: number; count: number }>;
    by_category: Array<{ _id: string; total: number; count: number }>;
    by_payment_method?: Array<{ _id: string; total: number; count: number }>;
  }> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    const res = await apiClient.get<ApiResponse<any>>(`/admin/reports/revenue${qs ? `?${qs}` : ''}`);
    return res.data.data;
  },

  async getRatingsReport(): Promise<{
    avg: number | null;
    count: number;
    top_doctors: Array<{ doctor_id: string; name: string; specialization: string; avg: number; count: number }>;
  }> {
    const res = await apiClient.get<ApiResponse<any>>('/admin/reports/ratings');
    return res.data.data;
  },

  async getDoctorReport(): Promise<DoctorReportItem[]> {
    const res = await apiClient.get<ApiResponse<DoctorReportItem[]>>('/admin/reports/doctors');
    return res.data.data;
  },

  async getStaffRequests(status = 'pending'): Promise<{ requests: StaffRequest[]; total: number }> {
    const res = await apiClient.get<ApiResponse<{ requests: StaffRequest[]; total: number }>>(`/admin/staff-requests?status=${status}`);
    return res.data.data;
  },

  async approveStaff(id: string): Promise<void> {
    await apiClient.patch(`/admin/staff-requests/${id}/approve`);
  },

  async rejectStaff(id: string, reason?: string): Promise<void> {
    await apiClient.patch(`/admin/staff-requests/${id}/reject`, { reason });
  },

  async getInsuranceCompanies(): Promise<InsuranceCompany[]> {
    const res = await apiClient.get<ApiResponse<InsuranceCompany[]>>('/admin/insurance-companies');
    return res.data.data.map((c) => normalize<InsuranceCompany>(c));
  },

  async createInsuranceCompany(data: { name: string; discount_percentage: number; covered_services?: string[]; is_active?: boolean }): Promise<InsuranceCompany> {
    const res = await apiClient.post<ApiResponse<InsuranceCompany>>('/admin/insurance-companies', data);
    return normalize<InsuranceCompany>(res.data.data);
  },

  async updateInsuranceCompany(id: string, data: Partial<{ name: string; discount_percentage: number; covered_services: string[]; is_active: boolean }>): Promise<InsuranceCompany> {
    const res = await apiClient.patch<ApiResponse<InsuranceCompany>>(`/admin/insurance-companies/${id}`, data);
    return normalize<InsuranceCompany>(res.data.data);
  },

  async deleteInsuranceCompany(id: string): Promise<void> {
    await apiClient.delete(`/admin/insurance-companies/${id}`);
  },

  async getDepartments(): Promise<Department[]> {
    const res = await apiClient.get<ApiResponse<{ departments: any[] }>>('/admin/departments');
    const list = res.data.data?.departments ?? res.data.data ?? [];
    return (Array.isArray(list) ? list : []).map((d: any) => normalize<Department>(d));
  },

  async createDepartment(name: string, description?: string): Promise<Department> {
    const res = await apiClient.post<ApiResponse<any>>('/admin/departments', { name, description });
    return normalize<Department>(res.data.data);
  },

  async deleteDepartment(id: string): Promise<void> {
    await apiClient.delete(`/admin/departments/${id}`);
  },

  async getAdminInvoices(): Promise<AdminInvoice[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/admin/invoices');
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    return list.map((inv: any) => normalize<AdminInvoice>(inv));
  },

  async createAdminInvoice(data: CreateAdminInvoiceDto): Promise<AdminInvoice> {
    const res = await apiClient.post<ApiResponse<any>>('/admin/invoices', data);
    return normalize<AdminInvoice>(res.data.data);
  },

  async getPatients(): Promise<User[]> {
    const res = await apiClient.get<ApiResponse<{ users: User[] }>>('/admin/users?role=patient&limit=200');
    return normalizeList<User>(res.data.data.users ?? []);
  },

  async getAppointments(filters?: { status?: string; date?: string; search?: string }): Promise<AdminAppointment[]> {
    const query = new URLSearchParams();
    if (filters?.status) query.set('status', filters.status);
    if (filters?.date)   query.set('date', filters.date);
    if (filters?.search) query.set('search', filters.search);
    const qs = query.toString();
    const res = await apiClient.get<ApiResponse<AdminAppointment[]>>(`/admin/appointments${qs ? `?${qs}` : ''}`);
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    return list.map((a: any) => normalize<AdminAppointment>(a));
  },

  async cancelAppointment(id: string, reason: string): Promise<void> {
    await apiClient.delete(`/admin/appointments/${id}`, { data: { reason } });
  },

  async updateUserProfile(id: string, data: {
    first_name?: string; last_name?: string; phone?: string;
    department?: string; specialization?: string; shift?: string;
  }): Promise<Profile> {
    const res = await apiClient.patch<ApiResponse<Profile>>(`/admin/users/${id}/profile`, data);
    return normalize<Profile>(res.data.data);
  },

  async getOccupancyReport(): Promise<OccupancyReport> {
    const res = await apiClient.get<ApiResponse<OccupancyReport>>('/admin/reports/occupancy');
    return res.data.data;
  },

  async getPharmacyReport(): Promise<PharmacyReport> {
    const res = await apiClient.get<ApiResponse<PharmacyReport>>('/admin/reports/pharmacy');
    return res.data.data;
  },

  // --- Schedules ---
  async getAllSchedules(params?: { doctor?: string; department?: string; week?: string }): Promise<DoctorSchedule[]> {
    const query = new URLSearchParams();
    if (params?.doctor) query.set('doctor', params.doctor);
    if (params?.department) query.set('department', params.department);
    if (params?.week) query.set('week', params.week);
    const qs = query.toString();
    const res = await apiClient.get<ApiResponse<DoctorSchedule[]>>(`/admin/schedules${qs ? `?${qs}` : ''}`);
    return Array.isArray(res.data.data) ? res.data.data : [];
  },

  async getDoctorSchedule(doctorId: string, week?: string): Promise<DoctorSchedule> {
    const qs = week ? `?week=${encodeURIComponent(week)}` : '';
    const res = await apiClient.get<ApiResponse<DoctorSchedule>>(`/admin/doctors/${doctorId}/schedule${qs}`);
    return res.data.data;
  },

  async overrideDoctorSchedule(
    doctorId: string,
    data: { shift?: string; date?: string; start_hour?: number; end_hour?: number; reason?: string },
  ): Promise<DoctorSchedule> {
    const res = await apiClient.put<ApiResponse<DoctorSchedule>>(`/admin/doctors/${doctorId}/schedule`, data);
    return res.data.data;
  },

  async deleteDoctorScheduleSlot(doctorId: string, slotId: string): Promise<void> {
    await apiClient.delete(`/admin/doctors/${doctorId}/schedule/slot`, { params: { slot_id: slotId } });
  },

  // --- Shifts ---
  async getShifts(params?: { role?: string; department?: string; from?: string; to?: string }): Promise<Shift[]> {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.department) query.set('department', params.department);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    const res = await apiClient.get<ApiResponse<any>>(`/admin/shifts${qs ? `?${qs}` : ''}`);
    // BE returns { shifts: Record<dept, Shift[]>, total } — flatten to Shift[]
    const raw = res.data.data;
    const list: any[] = Array.isArray(raw) ? raw : (Object.values((raw as any)?.shifts ?? {}).flat() as any[]);
    return list.map((s: any) => normalize<Shift>(s));
  },

  async getTodayShifts(): Promise<Shift[]> {
    const res = await apiClient.get<ApiResponse<any>>('/admin/shifts/today');
    // BE returns { shifts: Record<dept, Shift[]>, total } — flatten to Shift[]
    const raw = res.data.data;
    const list: any[] = Array.isArray(raw) ? raw : (Object.values((raw as any)?.shifts ?? {}).flat() as any[]);
    return list.map((s: any) => normalize<Shift>(s));
  },

  async assignShift(data: AssignShiftDto): Promise<Shift> {
    const res = await apiClient.post<ApiResponse<Shift>>('/admin/shifts', data);
    return normalize<Shift>(res.data.data);
  },

  async updateShift(id: string, data: Partial<AssignShiftDto>): Promise<Shift> {
    const res = await apiClient.put<ApiResponse<Shift>>(`/admin/shifts/${id}`, data);
    return normalize<Shift>(res.data.data);
  },

  async deleteShift(id: string): Promise<void> {
    await apiClient.delete(`/admin/shifts/${id}`);
  },

  // --- Announcements ---
  async getAnnouncements(): Promise<Announcement[]> {
    const res = await apiClient.get<ApiResponse<Announcement[]>>('/admin/announcements');
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    return list.map((a: any) => normalize<Announcement>(a));
  },

  async createAnnouncement(data: CreateAnnouncementDto): Promise<Announcement> {
    const res = await apiClient.post<ApiResponse<Announcement>>('/admin/announcements', data);
    return normalize<Announcement>(res.data.data);
  },

  async deleteAnnouncement(id: string): Promise<void> {
    await apiClient.delete(`/admin/announcements/${id}`);
  },

  // --- Pricing ---
  async getPricing(): Promise<PricingSettings> {
    const res = await apiClient.get<ApiResponse<PricingSettings>>('/admin/settings/pricing');
    return res.data.data;
  },

  async updatePricing(data: Partial<PricingSettings>): Promise<PricingSettings> {
    const res = await apiClient.put<ApiResponse<PricingSettings>>('/admin/settings/pricing', data);
    return res.data.data;
  },

  async addLabTest(data: PricingTestItem): Promise<PricingSettings> {
    const res = await apiClient.post<ApiResponse<PricingSettings>>('/admin/settings/pricing/lab', data);
    return res.data.data;
  },

  async deleteLabTest(test_name: string): Promise<PricingSettings> {
    const res = await apiClient.delete<ApiResponse<PricingSettings>>(`/admin/settings/pricing/lab/${encodeURIComponent(test_name)}`);
    return res.data.data;
  },

  async addRadiologyScan(data: RadiologyScanItem): Promise<PricingSettings> {
    const res = await apiClient.post<ApiResponse<PricingSettings>>('/admin/settings/pricing/radiology', data);
    return res.data.data;
  },

  async deleteRadiologyScan(scan_type: string): Promise<PricingSettings> {
    const res = await apiClient.delete<ApiResponse<PricingSettings>>(`/admin/settings/pricing/radiology/${encodeURIComponent(scan_type)}`);
    return res.data.data;
  },

  // --- Maintenance ---
  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const res = await apiClient.get<ApiResponse<MaintenanceStatus>>('/admin/system/maintenance');
    return res.data.data;
  },

  async getPublicMaintenanceStatus(): Promise<MaintenanceStatus> {
    const res = await apiClient.get<ApiResponse<MaintenanceStatus>>('/settings/maintenance');
    return res.data.data;
  },

  async enableMaintenance(data: { message?: string; estimated_duration?: number }): Promise<MaintenanceStatus> {
    const res = await apiClient.post<ApiResponse<MaintenanceStatus>>('/admin/system/maintenance', data);
    return res.data.data;
  },

  async disableMaintenance(): Promise<void> {
    await apiClient.delete('/admin/system/maintenance');
  },

  // --- Email Templates ---
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const res = await apiClient.get<ApiResponse<EmailTemplate[]>>('/admin/email-templates');
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    return list.map((t: any) => normalize<EmailTemplate>(t));
  },

  async updateEmailTemplate(name: string, data: { subject: string; body: string }): Promise<EmailTemplate> {
    const res = await apiClient.put<ApiResponse<EmailTemplate>>(`/admin/email-templates/${encodeURIComponent(name)}`, data);
    return normalize<EmailTemplate>(res.data.data);
  },

  // --- Compliance ---
  async exportPatientData(patientId: string, format: 'json' | 'pdf'): Promise<Blob> {
    const res = await apiClient.post(
      `/admin/export/patient/${patientId}`,
      { format },
      { responseType: 'blob' },
    );
    return res.data as Blob;
  },

  async getDeletionRequests(): Promise<DeletionRequest[]> {
    const res = await apiClient.get<ApiResponse<DeletionRequest[]>>('/admin/deletion-requests');
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    return list.map((r: any) => normalize<DeletionRequest>(r));
  },

  async approveDeletionRequest(id: string): Promise<void> {
    await apiClient.patch(`/admin/deletion-requests/${id}/approve`);
  },

  async rejectDeletionRequest(id: string): Promise<void> {
    await apiClient.patch(`/admin/deletion-requests/${id}/reject`);
  },

  // --- Department Staff ---
  async getDepartmentStaff(id: string): Promise<User[]> {
    const res = await apiClient.get<ApiResponse<{ department: string; staff: Record<string, any[]> }>>(`/admin/departments/${id}/staff`);
    // BE returns { department, staff: Record<role, Profile[]> } — flatten to flat array
    const raw = res.data.data?.staff ?? {};
    const list: any[] = Array.isArray(raw) ? raw : (Object.values(raw).flat() as any[]);
    return list.map((u: any) => normalize<User>(u));
  },

  async assignStaffDepartment(staffId: string, departmentId: string): Promise<void> {
    await apiClient.put(`/admin/staff/${staffId}/department`, { department_id: departmentId });
  },

  // --- System ---
  async getSystemHealth(): Promise<SystemHealth> {
    const res = await apiClient.get<ApiResponse<SystemHealth>>('/admin/system/health');
    return res.data.data;
  },

  async getSystemLogs(): Promise<ErrorLog[]> {
    const res = await apiClient.get<ApiResponse<ErrorLog[]>>('/admin/system/logs');
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    return list.map((l: any) => normalize<ErrorLog>(l));
  },
};
