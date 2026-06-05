export const queryKeys = {
  // Admin — Users & Staff
  adminUsers: () => ['admin', 'users'] as const,
  adminUser: (id: string) => ['admin', 'users', id] as const,
  adminStaffRequests: (status?: string) =>
    (status ? ['admin', 'staff-requests', status] : ['admin', 'staff-requests']) as readonly unknown[],

  // Admin — Dashboard fan-out
  adminDashboardStats: () => ['admin', 'dashboard', 'stats'] as const,
  adminAuditLog: (params?: Record<string, unknown>) =>
    (params ? ['admin', 'audit-log', params] : ['admin', 'audit-log']) as readonly unknown[],
  adminLowStock: () => ['admin', 'low-stock'] as const,

  // Admin — Appointments
  adminAppointments: (filters?: Record<string, unknown>) =>
    (filters ? ['admin', 'appointments', filters] : ['admin', 'appointments']) as readonly unknown[],

  // Admin — Departments
  adminDepartments: () => ['admin', 'departments'] as const,

  // Departments — public role filter (register form)
  departmentsByRole: (role: string) => ['departments', 'by-role', role] as const,

  // Admin — Invoices
  adminInvoices: (params?: Record<string, unknown>) =>
    (params ? ['admin', 'invoices', params] : ['admin', 'invoices']) as readonly unknown[],

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
  doctorEmergencyFlags: () => ['doctor', 'emergency-flags'] as const,

  // Patient
  patientProfile: () => ['patient', 'profile'] as const,
  patientAppointments: (params?: Record<string, unknown>) =>
    (params ? ['patient', 'appointments', params] : ['patient', 'appointments']) as readonly unknown[],
  patientAppointment: (id: string) => ['patient', 'appointments', id] as const,
  patientMedicalRecords: () => ['patient', 'medical-records'] as const,
  patientLabResults: () => ['patient', 'lab-results'] as const,
  patientRadiologyResults: () => ['patient', 'radiology-results'] as const,
  patientPrescriptions: () => ['patient', 'prescriptions'] as const,
  patientInvoices: () => ['patient', 'invoices'] as const,
  patientRoomBookings: () => ['patient', 'rooms', 'bookings'] as const,
  patientPharmacyMedications: () => ['patient', 'pharmacy', 'medications'] as const,
  patientPharmacyOrders: () => ['patient', 'pharmacy', 'orders'] as const,
  patientInsuranceCompanies: () => ['patient', 'insurance-companies'] as const,
  patientPharmacyCart: () => ['patient', 'pharmacy', 'cart'] as const,

  // Nurse
  nursePatients: () => ['nurse', 'patients'] as const,
  nursePatient: (patientId: string) => ['nurse', 'patients', patientId] as const,
  nurseMedicationSchedule: (patientId: string) => ['nurse', 'medication-schedule', patientId] as const,
  nurseEmergencyFlags: (status?: string) =>
    (status ? ['nurse', 'emergency-flags', status] : ['nurse', 'emergency-flags']) as readonly unknown[],

  // Receptionist
  receptionistPatients: (params?: Record<string, unknown>) =>
    (params ? ['receptionist', 'patients', params] : ['receptionist', 'patients']) as readonly unknown[],
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
  labOrders: (params?: Record<string, unknown>) =>
    (params ? ['lab', 'orders', params] : ['lab', 'orders']) as readonly unknown[],

  // Radiology
  radiologyOrders: (params?: Record<string, unknown>) =>
    (params ? ['radiology', 'orders', params] : ['radiology', 'orders']) as readonly unknown[],

  // Inventory
  inventoryItems: (filters?: Record<string, unknown>) =>
    (filters ? ['inventory', 'items', filters] : ['inventory', 'items']) as readonly unknown[],
  inventoryLowStock: () => ['inventory', 'low-stock'] as const,
  inventorySupplyRequests: (params?: Record<string, unknown>) =>
    (params ? ['inventory', 'supply-requests', params] : ['inventory', 'supply-requests']) as readonly unknown[],
  inventoryRooms: (filters?: Record<string, unknown>) =>
    (filters ? ['inventory', 'rooms', filters] : ['inventory', 'rooms']) as readonly unknown[],
  inventorySuppliers: () => ['inventory', 'suppliers'] as const,
  inventoryWarehouse: (filters?: Record<string, unknown>) =>
    (filters ? ['inventory', 'warehouse', filters] : ['inventory', 'warehouse']) as readonly unknown[],

  // Booking (shared across patient booking flow)
  bookingDepartments: () => ['booking', 'departments'] as const,
  bookingDoctors: (department: string) => ['booking', 'doctors', department] as const,

  // Notifications
  notifications: () => ['notifications'] as const,

  // Chatbot (placeholder — session history future use)
  chatbotHistory: (sessionId?: string) =>
    (sessionId ? ['chatbot', 'history', sessionId] : ['chatbot', 'history']) as readonly unknown[],
} as const;
