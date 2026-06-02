export const queryKeys = {
  // Admin — Users & Staff
  adminUsers: () => ['admin', 'users'] as const,
  adminUser: (id: string) => ['admin', 'users', id] as const,
  adminStaffRequests: (status?: string) =>
    (status ? ['admin', 'staff-requests', status] : ['admin', 'staff-requests']) as readonly unknown[],

  // Admin — Dashboard fan-out
  adminDashboardStats: () => ['admin', 'dashboard', 'stats'] as const,
  adminAuditLog: () => ['admin', 'audit-log'] as const,
  adminLowStock: () => ['admin', 'low-stock'] as const,

  // Admin — Appointments
  adminAppointments: (filters?: Record<string, unknown>) =>
    (filters ? ['admin', 'appointments', filters] : ['admin', 'appointments']) as readonly unknown[],

  // Admin — Invoices
  adminInvoices: () => ['admin', 'invoices'] as const,

  // Admin — Reports
  adminRevenueReport: (params?: Record<string, unknown>) =>
    (params ? ['admin', 'reports', 'revenue', params] : ['admin', 'reports', 'revenue']) as readonly unknown[],
  adminRatingsReport: () => ['admin', 'reports', 'ratings'] as const,
  adminOccupancyReport: () => ['admin', 'reports', 'occupancy'] as const,
  adminPharmacyReport: () => ['admin', 'reports', 'pharmacy'] as const,
  adminDoctorReport: () => ['admin', 'reports', 'doctors'] as const,

  // Cashier
  cashierInvoices: (filters?: Record<string, unknown>) =>
    (filters ? ['cashier', 'invoices', filters] : ['cashier', 'invoices']) as readonly unknown[],
  cashierInvoice: (id: string) => ['cashier', 'invoices', id] as const,
  cashierPending: () => ['cashier', 'pending'] as const,
  cashierDailyReport: (date?: string) =>
    (date ? ['cashier', 'report', date] : ['cashier', 'report']) as readonly unknown[],
  cashierAllInvoices: () => ['cashier', 'all-invoices'] as const,
} as const;
