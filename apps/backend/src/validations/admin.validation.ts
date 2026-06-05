import { z } from 'zod';

const roleEnum = z.enum([
  'patient',
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'inventory_manager',
  'lab_technician',
  'radiology_technician',
  'cashier',
  'admin',
]);

const staffRoleEnum = z.enum([
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'inventory_manager',
  'lab_technician',
  'radiology_technician',
  'cashier',
  'admin',
]);

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(500).default(20),
    role: roleEnum.optional(),
  }),
});

export const createStaffSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    role: staffRoleEnum,
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    phone: z.string().optional(),
    specialization: z.string().optional(),
    department: z.string().optional(),
    shift: z.enum(['morning', 'evening', 'night']).optional(),
  }),
});

export const changeRoleSchema = z.object({
  body: z.object({
    role: roleEnum,
  }),
});

export const setActiveSchema = z.object({
  body: z.object({
    is_active: z.boolean(),
  }),
});

export const revenueReportSchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const createInsuranceCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    discount_percentage: z.number().min(0).max(100),
    covered_services: z.array(z.string()).optional().default([]),
    benefits: z.string().optional(),
    is_active: z.boolean().optional().default(true),
  }),
});

export const updateInsuranceCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    discount_percentage: z.number().min(0).max(100).optional(),
    covered_services: z.array(z.string()).optional(),
    benefits: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

// Staff roles a department can be assigned to (all non-patient, non-admin roles).
const departmentRoleEnum = z.enum([
  'doctor', 'nurse', 'receptionist', 'pharmacist',
  'inventory_manager', 'lab_technician', 'radiology_technician', 'cashier',
]);

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    assigned_roles: z.array(departmentRoleEnum).optional(),
    is_active: z.boolean().optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    assigned_roles: z.array(departmentRoleEnum).optional(),
    is_active: z.boolean().optional(),
  }),
});

const invoiceItemCategoryEnum = z.enum(['appointment', 'pharmacy', 'room', 'lab', 'radiology', 'other']);

export const cancelAdminAppointmentSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Reason is required'),
  }),
});

export const updateUserProfileAdminSchema = z.object({
  body: z.object({
    first_name:     z.string().min(1).optional(),
    last_name:      z.string().min(1).optional(),
    phone:          z.string().regex(/^(010|011|012|015)\d{8}$/, 'Must be a valid Egyptian number').optional(),
    department:     z.string().optional(),
    specialization: z.string().optional(),
    shift:          z.enum(['morning', 'evening', 'night']).optional(),
  }),
});

export const createAdminInvoiceSchema = z.object({
  body: z.object({
    patient_id: z.string().min(1),
    items: z.array(
      z.object({
        description: z.string().min(1),
        category: invoiceItemCategoryEnum,
        amount: z.number().min(0),
      }),
    ).min(1),
    insurance_coverage: z.number().min(0).optional().default(0),
    notes: z.string().optional(),
  }),
});

// ─── Section 4: Department Assignments ────────────────────────────────────────

export const assignDepartmentSchema = z.object({
  body: z.object({
    department: z.string().min(1),
  }),
});

// ─── Section 5: Doctor Schedule ───────────────────────────────────────────────

export const overrideDoctorScheduleSchema = z.object({
  body: z.object({
    shift: z.enum(['morning', 'evening', 'night']).optional(),
    // Add a single blocked slot (the admin "Block Slot" action).
    date: z.string().min(1).optional(),
    start_hour: z.number().int().min(0).max(23).optional(),
    end_hour: z.number().int().min(1).max(24).optional(),
    reason: z.string().optional(),
    // Legacy full-replace path.
    blocked_slots: z.array(z.object({
      date: z.string().min(1),
      start_hour: z.number().int().min(0).max(23),
      end_hour: z.number().int().min(1).max(24),
      reason: z.string().optional(),
    })).optional(),
  }),
});

// ─── Section 6: Shift Management ──────────────────────────────────────────────

export const assignShiftSchema = z.object({
  body: z.object({
    user_id: z.string().min(1),
    shift_type: z.enum(['morning', 'evening', 'night']),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    department: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateShiftSchema = z.object({
  body: z.object({
    shift_type: z.enum(['morning', 'evening', 'night']).optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    department: z.string().optional(),
    notes: z.string().optional(),
  }),
});

// ─── Section 7: Pricing Management ────────────────────────────────────────────

const priceField = z.number().positive('Price must be a positive number');

export const updatePricingSchema = z.object({
  body: z.object({
    appointments: z.object({
      online_fee: priceField.optional(),
      physical_fee: priceField.optional(),
    }).optional(),
    rooms: z.object({
      general_per_day: priceField.optional(),
      icu_per_day: priceField.optional(),
      operation_per_day: priceField.optional(),
      radiology_per_day: priceField.optional(),
    }).optional(),
    pharmacy: z.object({
      delivery_fee: priceField.optional(),
    }).optional(),
  }),
});

export const addLabTestSchema = z.object({
  body: z.object({
    test_name: z.string().min(1),
    price: priceField,
  }),
});

export const updateLabTestPriceSchema = z.object({
  body: z.object({
    price: priceField,
  }),
});

export const addRadiologyScanSchema = z.object({
  body: z.object({
    scan_type: z.string().min(1),
    price: priceField,
  }),
});

export const updateRadiologyScanPriceSchema = z.object({
  body: z.object({
    price: priceField,
  }),
});

// ─── Section 8: Announcements ─────────────────────────────────────────────────

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    message: z.string().min(1),
    target_roles: z.array(z.string()).optional().default([]),
    priority: z.enum(['normal', 'urgent']).optional().default('normal'),
  }),
});

// ─── Section 9: Maintenance Mode ──────────────────────────────────────────────

export const enableMaintenanceSchema = z.object({
  body: z.object({
    message: z.string().min(1),
    estimated_duration: z.number().int().positive().optional(),
  }),
});

// ─── Section 10: Email Templates ──────────────────────────────────────────────

export const updateEmailTemplateSchema = z.object({
  body: z.object({
    subject: z.string().min(1).optional(),
    html_body: z.string().min(1).optional(),
  }).refine((d) => d.subject !== undefined || d.html_body !== undefined, {
    message: 'At least one of subject or html_body must be provided',
  }),
});

// ─── Section 11: GDPR Export / Deletion ───────────────────────────────────────

export const exportPatientDataSchema = z.object({
  query: z.object({
    format: z.enum(['json', 'pdf']).default('json'),
  }),
});

export const rejectDeletionSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});
