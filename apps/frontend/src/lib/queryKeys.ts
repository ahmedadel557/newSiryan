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

  // Doctor
  doctorPatients: () => ['doctor', 'patients'] as const,
  doctorAppointments: () => ['doctor', 'appointments'] as const,
  doctorProfile: () => ['doctor', 'profile'] as const,
  doctorBlockedSlots: (from: string, to: string) => ['doctor', 'schedule', 'blocks', from, to] as const,
  doctorRoomBookings: (from: string, to: string) => ['doctor', 'room-bookings', from, to] as const,
  doctorQueue: () => ['doctor', 'queue', 'today'] as const,
  doctorNotes: (patientId: string) => ['doctor', 'notes', patientId] as const,
  doctorRatings: () => ['doctor', 'ratings'] as const,
  doctorPatientDetail: (patientId: string) => ['doctor', 'patients', patientId] as const,
  doctorPatientRecord: (patientId: string) => ['doctor', 'patients', patientId, 'record'] as const,
  doctorPatientMedicalRecords: (patientId: string) => ['doctor', 'patients', patientId, 'records'] as const,
  doctorPatientPrescriptions: (patientId: string) => ['doctor', 'patients', patientId, 'prescriptions'] as const,
  doctorPatientLabOrders: (patientId: string) => ['doctor', 'patients', patientId, 'lab-orders'] as const,
  doctorPatientRadiologyOrders: (patientId: string) => ['doctor', 'patients', patientId, 'radiology-orders'] as const,
  doctorMedications: () => ['doctor', 'medications'] as const,

  // Patient
  patientProfile: () => ['patient', 'profile'] as const,
  patientAppointments: () => ['patient', 'appointments'] as const,
  patientMedicalRecords: () => ['patient', 'medical-records'] as const,
  patientLabResults: () => ['patient', 'lab-results'] as const,
  patientRadiologyResults: () => ['patient', 'radiology-results'] as const,
  patientPrescriptions: () => ['patient', 'prescriptions'] as const,
  patientInvoices: () => ['patient', 'invoices'] as const,
  patientRoomBookings: () => ['patient', 'rooms', 'bookings'] as const,

  // Nurse
  nursePatients: () => ['nurse', 'patients'] as const,
  nursePatient: (patientId: string) => ['nurse', 'patients', patientId] as const,
  nurseMedicationSchedule: (patientId: string) => ['nurse', 'medication-schedule', patientId] as const,

  // Receptionist
  receptionistAppointments: (filters?: Record<string, unknown>) =>
    (filters ? ['receptionist', 'appointments', filters] : ['receptionist', 'appointments']) as readonly unknown[],
  receptionistRequests: () => ['receptionist', 'requests'] as const,
  receptionistLabOrders: () => ['receptionist', 'lab-orders'] as const,
  receptionistRadiologyOrders: () => ['receptionist', 'radiology-orders'] as const,

  // Pharmacist
  pharmacistPrescriptions: (filters?: Record<string, unknown>) =>
    (filters ? ['pharmacist', 'prescriptions', filters] : ['pharmacist', 'prescriptions']) as readonly unknown[],
  pharmacistOrders: (filters?: Record<string, unknown>) =>
    (filters ? ['pharmacist', 'orders', filters] : ['pharmacist', 'orders']) as readonly unknown[],
  pharmacistMedications: (filters?: Record<string, unknown>) =>
    (filters ? ['pharmacist', 'medications', filters] : ['pharmacist', 'medications']) as readonly unknown[],
  pharmacistRefills: () => ['pharmacist', 'refills'] as const,
  pharmacistHistory: (filters?: Record<string, unknown>) =>
    (filters ? ['pharmacist', 'history', filters] : ['pharmacist', 'history']) as readonly unknown[],
  pharmacistDailyReport: (date?: string) =>
    (date ? ['pharmacist', 'report', date] : ['pharmacist', 'report']) as readonly unknown[],
  pharmacistDashboard: () => ['pharmacist', 'dashboard'] as const,

  // Lab
  labOrders: () => ['lab', 'orders'] as const,

  // Radiology
  radiologyOrders: () => ['radiology', 'orders'] as const,

  // Inventory
  inventoryItems: (filters?: Record<string, unknown>) =>
    (filters ? ['inventory', 'items', filters] : ['inventory', 'items']) as readonly unknown[],
  inventoryLowStock: () => ['inventory', 'low-stock'] as const,
  inventorySupplyRequests: () => ['inventory', 'supply-requests'] as const,
  inventoryRooms: (filters?: Record<string, unknown>) =>
    (filters ? ['inventory', 'rooms', filters] : ['inventory', 'rooms']) as readonly unknown[],
  inventorySuppliers: () => ['inventory', 'suppliers'] as const,
  inventoryWarehouse: (filters?: Record<string, unknown>) =>
    (filters ? ['inventory', 'warehouse', filters] : ['inventory', 'warehouse']) as readonly unknown[],

  // Notifications
  notifications: () => ['notifications'] as const,

  // Chatbot (placeholder — session history future use)
  chatbotHistory: (sessionId?: string) =>
    (sessionId ? ['chatbot', 'history', sessionId] : ['chatbot', 'history']) as readonly unknown[],
} as const;
