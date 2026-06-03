/* ----------------------------------------------------------------
   Primitives
---------------------------------------------------------------- */

export type Role =
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'inventory_manager'
  | 'lab_technician'
  | 'radiology_technician'
  | 'cashier'
  | 'admin';

export type AppointmentStatus = 'pending' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show' | 'checked_in';
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

/* ----------------------------------------------------------------
   Generic API wrapper
---------------------------------------------------------------- */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

/* ----------------------------------------------------------------
   User & Profiles
---------------------------------------------------------------- */

export interface User {
  id: string;
  _id?: string;
  username: string;
  email: string;
  role: Role;
  is_active: boolean;
  is_email_verified?: boolean;
  password_changed?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

export interface AdminAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  type: 'physical' | 'online';
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'checked_in';
  reason?: string;
  cancel_reason?: string;
  fee?: number;
  createdAt: string;
}

export interface CreateAdminInvoiceDto {
  patient_id: string;
  items: Array<{ description: string; category: string; amount: number }>;
  insurance_coverage?: number;
  notes?: string;
}

export interface StaffRequest {
  id: string;
  username: string;
  email: string;
  role: Role;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  createdAt: string;
  profile?: Profile;
}

export interface Profile {
  id: string;
  _id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | '';
  blood_type?: BloodType | '';
  national_id?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  specialization?: string;
  department?: string;
  shift?: 'morning' | 'evening' | 'night' | '';
  hired_at?: string;
  bio?: string;
  created_at?: string;
}

/* ----------------------------------------------------------------
   Appointments
---------------------------------------------------------------- */

export interface Appointment {
  id: string;
  _id?: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  reason?: string;
  cancel_reason?: string;
  notes?: string;
  visit_type?: 'physical' | 'online';
  doctor_name?: string;
  patient_name?: string;
  fee?: number;
  invoice_id?: string;
  payment_status?: 'unpaid' | 'paid' | 'partially_paid' | 'cancelled';
  my_rating?: number | null;
  follow_up_of?: string;
  checked_in_at?: string;
  initiated_by?: 'doctor' | 'receptionist';
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  appointment: string;
  doctor: string;
  patient: string;
  stars: number;
  feedback?: string;
  created_at: string;
}

export interface DoctorRatingSummary {
  avg: number | null;
  count: number;
  recent: Array<{ stars: number; feedback: string | null; created_at: string; patient_name?: string }>;
}

export interface BookingResult {
  appointment: Appointment;
  invoice: {
    id: string;
    total_due: number;
    status: 'unpaid' | 'paid' | 'partially_paid' | 'cancelled';
  };
}

/* ----------------------------------------------------------------
   Medical Records
---------------------------------------------------------------- */

export interface Vitals {
  temperature_c?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate_bpm?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight_kg?: number;
  height_cm?: number;
}

export interface MedicalRecord {
  id: string;
  _id?: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  chief_complaint: string;
  diagnosis: string;
  icd_code?: string;
  treatment_plan: string;
  vitals: Vitals;
  notes?: string;
  created_at: string;
}

/* ----------------------------------------------------------------
   Prescriptions
---------------------------------------------------------------- */

export interface PrescribedItem {
  medication_id: string;
  medication_name: string;
  dose: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  _id?: string;
  medical_record_id: string;
  patient_id: string;
  doctor_id: string;
  items: PrescribedItem[];
  notes?: string;
  created_at: string;
}

/* ----------------------------------------------------------------
   Lab & Radiology Orders
---------------------------------------------------------------- */

export interface LabResult {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  is_abnormal: boolean;
}

export interface LabOrder {
  id: string;
  _id?: string;
  patient_id: string;
  doctor_id: string;
  medical_record_id: string;
  test_name?: string;
  tests_requested: string[];
  status: OrderStatus;
  priority: 'routine' | 'urgent' | 'stat';
  results?: string;
  file_url?: string;
  technician_id?: string;
  ordered_at?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  patient_name?: string;
  doctor_name?: string;
}

export interface RadiologyOrder {
  id: string;
  _id?: string;
  patient_id: string;
  doctor_id: string;
  medical_record_id: string;
  scan_type?: string;
  modality?: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'PET' | 'Mammography' | 'Fluoroscopy';
  body_part?: string;
  clinical_indication?: string;
  status: OrderStatus;
  priority: 'routine' | 'urgent' | 'stat';
  findings?: string;
  file_url?: string;
  notes?: string;
  technician_id?: string;
  ordered_at?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  patient_name?: string;
  doctor_name?: string;
}

export interface LabScheduleGroup {
  date: string;
  orders: LabOrder[];
}

export interface RadiologyScheduleGroup {
  date: string;
  orders: RadiologyOrder[];
}

/* ----------------------------------------------------------------
   Medications & Pharmacy
---------------------------------------------------------------- */

export interface Medication {
  id: string;
  _id?: string;
  name: string;
  generic_name?: string;
  category: string;
  form?: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'inhaler' | 'patch';
  strength?: string;
  manufacturer?: string;
  unit?: string;
  requires_prescription: boolean;
  is_active?: boolean;
  price?: number;
  stock_quantity?: number;
}

export interface PharmacyOrderItem {
  prescription_item_id: string;
  medication_id: string;
  medication_name: string;
  quantity_dispensed: number;
  unit_price: number;
}

export interface PharmacyOrder {
  id: string;
  _id?: string;
  prescription_id: string;
  patient_id: string;
  pharmacist_id: string;
  items: PharmacyOrderItem[];
  status: 'pending' | 'processing' | 'dispensed' | 'cancelled';
  total_amount: number;
  dispensed_at?: string;
  notes?: string;
  created_at: string;
  delivery_status?: 'preparing' | 'dispatched' | 'delivered';
  tracking_notes?: string;
  estimated_delivery_time?: string;
}

export interface PharmacistPatientOrder {
  id: string;
  patient_id: string;
  patient_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'dispensed';
  total_amount: number;
  delivery_type: 'pickup' | 'delivery';
  has_prescription: boolean;
  requires_prescription: boolean;
  items: Array<{ name: string; quantity: number; price: number; requires_prescription: boolean }>;
  created_at: string;
}

/* ----------------------------------------------------------------
   Inventory
---------------------------------------------------------------- */

export interface ItemLocation {
  department: string;
  quantity: number;
}

export interface InventoryItem {
  id: string;
  _id?: string;
  name: string;
  category: 'equipment' | 'supply' | 'bed' | 'oxygen' | 'other';
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  expiry_date?: string;
  is_low_stock?: boolean;
  room?: Room | string | null;
  max_per_room?: number | null;
  locations?: ItemLocation[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDetail extends InventoryItem {
  history: WarehouseEntry[];
}

/* ----------------------------------------------------------------
   Billing
---------------------------------------------------------------- */

export interface InvoiceLineItem {
  description: string;
  category: 'consultation' | 'procedure' | 'medication' | 'lab' | 'radiology' | 'room' | 'other';
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  _id?: string;
  patient_id: string;
  appointment_id?: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method?: 'cash' | 'card' | 'insurance' | 'bank_transfer';
  insurance_claim_id?: string;
  issued_at: string;
  paid_at?: string;
  due_date: string;
  notes?: string;
}

/* Raw cashier daily-report shapes (GET /cashier/reports/daily) — kept un-normalized
   so the dashboard can show patient_name, real payment_method (incl. 'mixed'), and paid_at,
   all of which normalizeInvoice() drops. */
export interface DailyTransaction {
  _id: string;
  patient_name: string;
  subtotal: number;
  insurance_coverage: number;
  total_due: number;
  amount_paid: number;
  status: 'unpaid' | 'paid' | 'partially_paid' | 'cancelled';
  payment_method?: 'cash' | 'card' | 'insurance' | 'mixed';
  paid_at?: string;
  createdAt: string;
}

export interface DailyReport {
  date: string;
  total_collected: number;
  by_payment_method: { method: string; total: number }[];
  by_category: { category: string; subtotal: number }[];
  transactions: DailyTransaction[];
}

/* Cashier pending-payments shapes (GET /cashier/pending). `type` doubles as both the
   createInvoice `source` and `category` when generating an invoice from these items. */
export type PendingItemType = 'appointment' | 'pharmacy' | 'room' | 'lab' | 'radiology';

export interface PendingItem {
  type: PendingItemType;
  source_id: string;
  description: string;
  amount: number;
}

export interface PendingPatient {
  patient_id: string;
  patient_name: string;
  insurance_discount_pct: number;
  items: PendingItem[];
  subtotal: number;
  insurance_discount: number;
  total_due: number;
}

/* Raw cashier invoice (GET /cashier/invoices) — kept un-normalized so cashier views can show
   patient_name, amount_paid, partially_paid status, and the 'mixed' method (all lost by
   normalizeInvoice, which targets the patient-facing billing view). */
export type CashierInvoiceStatus = 'unpaid' | 'paid' | 'partially_paid' | 'cancelled';
export type CashierPaymentMethod = 'cash' | 'card' | 'insurance' | 'mixed';

export interface CashierInvoiceItem {
  description: string;
  category: 'appointment' | 'pharmacy' | 'room' | 'lab' | 'radiology' | 'other';
  amount: number;
}

export interface CashierInvoice {
  id: string;
  patient_name: string;
  items: CashierInvoiceItem[];
  subtotal: number;
  insurance_coverage: number;
  total_due: number;
  amount_paid: number;
  status: CashierInvoiceStatus;
  payment_method?: CashierPaymentMethod;
  insurance_provider?: string;
  paid_at?: string;
  notes?: string;
  createdAt: string;
}

/** Payment submitted from the cashier payment modal. mode 'full' → PATCH /pay, 'partial' → PATCH /partial. */
export interface CashierPaymentInput {
  mode: 'full' | 'partial';
  payment_method: CashierPaymentMethod;
  amount: number;
  notes?: string;
}

/** Body for POST /cashier/invoices. `source: 'manual'` lines are free-form (no source_id). */
export interface CreateInvoiceItemDto {
  source: 'appointment' | 'pharmacy' | 'lab' | 'radiology' | 'room' | 'manual';
  source_id?: string;
  description: string;
  category: CashierInvoiceItem['category'];
  amount: number;
}

export interface CreateInvoiceDto {
  patient_id: string;
  items: CreateInvoiceItemDto[];
  insurance_provider?: string;
  payment_method?: CashierPaymentMethod;
}

/* ----------------------------------------------------------------
   Insurance
---------------------------------------------------------------- */
export interface InsuranceCompany {
  id: string;
  name: string;
  discount_percentage: number;
  covered_services: string[];
  benefits?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ----------------------------------------------------------------
   Departments
---------------------------------------------------------------- */
export interface Department {
  id: string;
  name: string;
  description?: string;
  doctor_count: number;
}

/* ----------------------------------------------------------------
   Admin Reports
---------------------------------------------------------------- */
export interface OccupancyRoomDetail {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'occupied' | 'maintenance';
  floor: number;
  capacity: number;
  current_occupancy: number;
  available: number;
}

export interface OccupancyReport {
  overall: {
    total_capacity: number;
    occupied: number;
    available: number;
    occupancy_pct: number;
  };
  by_type: Record<string, { total_capacity: number; occupied: number; available: number; room_count: number }>;
  rooms: OccupancyRoomDetail[];
}

export interface PharmacyTopMedication {
  medication_id: string;
  name: string;
  total_dispensed: number;
  revenue: number;
}

export interface PharmacyReport {
  summary: { total_orders: number; total_revenue: number };
  top_medications: PharmacyTopMedication[];
  low_stock_count: number;
}

/* ----------------------------------------------------------------
   Admin Invoices
---------------------------------------------------------------- */
export interface AdminInvoice extends CashierInvoice {
  issued_by_name?: string;
}

/* ----------------------------------------------------------------
   Notifications
---------------------------------------------------------------- */

export type NotificationType =
  | 'appointment'
  | 'prescription'
  | 'lab'
  | 'radiology'
  | 'pharmacy'
  | 'inventory'
  | 'emergency'
  | 'general'
  | 'room';

export interface LabOrderCompletedPayload {
  id: string;
  test_name: string;
  patient_id: string;
  patient_name: string;
  medical_record_id: string;
}

export interface RadiologyOrderCompletedPayload {
  id: string;
  scan_type: string;
  patient_id: string;
  patient_name: string;
  medical_record_id: string;
}

export interface EmergencyFlagPayload {
  patientId: string;
  patientName: string;
  severity: EmergencySeverity;
  message: string;
  nurse: string;
  flaggedAt: string;
}

export interface PatientCheckedInPayload {
  patientId: string;
  patientName: string;
  appointmentId: string;
  checkedInAt: string;
}

export interface PaymentPendingPayload {
  patient_id: string;
  patient_name: string;
  source: 'pharmacy' | 'appointment';
  source_id: string;
  description: string;
}

export interface DoctorRequestPayload {
  appointmentId: string;
  type: 'cancel' | 'reschedule';
  doctorName: string;
  patientName: string;
  reason?: string;
  scheduledAt: string;
}

export interface AppointmentConflictPayload {
  doctorName: string;
  patientName: string;
  conflict: 'cancel_while_checked_in';
}

export interface Notification {
  id: string;
  _id?: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  reference_id?: string;
  reference_type?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DoctorQueueItem {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  type: 'physical' | 'online';
  status: AppointmentStatus | string;
  scheduled_at: string;
}

export interface DoctorNote {
  id: string;
  patient_id: string;
  content: string;
  appointment_id?: string;
  created_at: string;
  updated_at: string;
}

// Matches the backend GET /doctor/video/token response (camelCase, consumed by the Stream SDK in Part 3).
export interface VideoCallToken {
  callId: string;
  token: string;
  apiKey: string;
  status?: 'waiting' | 'active' | 'ended';
}

/* ----------------------------------------------------------------
   DTOs — request payloads
---------------------------------------------------------------- */

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: 'male' | 'female';
    blood_type?: string;
    national_id?: string;
    insurance_provider?: string;
    insurance_number?: string;
    allergies?: string;
  };
}

export interface BookAppointmentDto {
  doctor_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  reason: string;
  visit_type?: 'physical' | 'online';
  department?: string;
}

export interface DoctorAvailability {
  id: string;
  name: string;
  specialty: string;
  specialization?: string;
  next_available: string | null;
  department?: string;
  avatar_url?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface ChatMessage {
  id: string;
  from: 'user' | 'bot';
  text: string;
  isLoading?: boolean;
}

export interface CartItem {
  medicationId: string;
  name: string;
  quantity: number;
  requiresPrescription: boolean;
  prescriptionId?: string;
  unitPrice: number;
}

export interface DiagnosisDto {
  appointment_id: string;
  chief_complaint: string;
  diagnosis: string;
  icd_code?: string;
  treatment_plan: string;
  vitals: Vitals;
  notes?: string;
}

export interface PrescriptionDto {
  medical_record_id: string;
  items: Omit<PrescribedItem, 'medication_name'>[];
  notes?: string;
}

export interface LabOrderDto {
  medical_record_id: string;
  tests_requested: string[];
  priority?: 'routine' | 'urgent' | 'stat';
}

export interface LabResultsDto {
  result_text: string;
  file_url?: string;
  notes?: string;
}

export interface RadiologyOrderDto {
  medical_record_id: string;
  modality: RadiologyOrder['modality'];
  body_part: string;
  clinical_indication: string;
  priority?: 'routine' | 'urgent' | 'stat';
}

export interface RadiologyFindingsDto {
  findings: string;
  file_url?: string;
  notes?: string;
}

export interface PharmacyOrderDto {
  prescription_id: string;
  items: { prescription_item_id: string; quantity_dispensed: number }[];
}

export interface PatientPharmacyOrderDto {
  items: {
    medication_id: string;
    quantity: number;
    prescription_id?: string;
  }[];
  delivery_type?: 'pickup' | 'delivery';
}

export interface Room {
  id: string;
  _id?: string;
  name: string;
  type: 'operation' | 'icu' | 'radiology' | 'general';
  status: 'available' | 'occupied' | 'maintenance';
  floor: number;
  capacity: number;
  current_occupancy: number;
  price_per_day: number;
  items: string[];
  assigned_doctor?: string;
  available_beds?: number;
  is_full?: boolean;
}

export interface RoomDetail extends Omit<Room, 'items'> {
  items: InventoryItem[];
  available_beds: number;
  is_full: boolean;
}

export interface AddRoomDto {
  name: string;
  type: Room['type'];
  floor: number;
  capacity: number;
  price_per_day: number;
  status?: Room['status'];
}

export interface DoctorReportItem {
  doctor_id: string;
  name: string;
  specialty: string;
  total_visits: number;
  total_patients?: number;
  avg_rating?: number;
  rating_count?: number;
  completion_rate?: number;
}

export interface RoomBookingDto {
  room_id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  reason?: string;
  doctor_id?: string;
  duration_days?: number;
}

export interface RoomBooking {
  id: string;
  _id?: string;
  patient_id: string;
  room_number: string;
  room_type: string;
  check_in: string;
  check_out?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  reason?: string;
  created_at?: string;
}

export interface DoctorScheduleRoomBooking {
  id: string;
  patient_id: string;
  patient_name?: string;
  room_name?: string;
  room_type?: string;
  check_in: string;
  check_out?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface PaymentDto {
  amount: number;
  payment_method: NonNullable<Invoice['payment_method']>;
  insurance_claim_id?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role: Role;
  first_name?: string;
  last_name?: string;
}

export interface UpdateUserDto {
  is_active?: boolean;
  role?: Role;
  email?: string;
}

export interface UserSettings {
  id: string;
  notifications: {
    appointments: boolean;
    prescriptions: boolean;
    lab_results: boolean;
    pharmacy: boolean;
    emergency: boolean;
    system: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'ar';
  };
}

export interface DashboardStats {
  total_patients: number;
  total_appointments_today: number;
  total_revenue_today: number;
  pending_lab_orders: number;
  pending_radiology_orders: number;
  low_stock_items: number;
}

export interface SystemLog {
  id: string;
  _id?: string;
  performed_by: { id: string; username: string; email: string; role: Role };
  action: string;
  resource: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface CreateInventoryItemDto {
  name: string;
  category: InventoryItem['category'];
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  expiry_date?: string;
  room_id?: string;
}

export interface UpdateInventoryItemDto extends Partial<CreateInventoryItemDto> {}

export interface RecordVitalsDto extends Vitals {}

export interface VitalsEntry extends Vitals {
  recorded_at: string;
  recorded_by?: string;
}

export interface CreatePatientDto {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Profile['gender'];
  national_id: string;
  phone: string;
  blood_type: BloodType;
}

export interface CancelRequest {
  id: string;          // appointment._id — used for confirm/reject action endpoints
  _id?: string;
  appointment_id?: string;
  doctor_name?: string;
  patient_name?: string;
  type: 'cancel' | 'reschedule';
  from_time?: string;
  to_time?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export type EmergencySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EmergencyFlagDto {
  message: string;
  severity: EmergencySeverity;
}

export interface VitalsSnapshot {
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  heart_rate?: number;
  temperature?: number;
  oxygen_level?: number;
  blood_sugar?: number;
  recorded_at?: string;
}

export interface EmergencyFlag {
  id: string;
  patient: string; // user id (ref)
  patient_name: string;
  nurse: string; // user id (ref)
  nurse_name?: string; // present on the doctor endpoint
  doctor: string; // user id (ref)
  doctor_name?: string; // present on the nurse endpoint
  doctor_specialization?: string | null;
  message: string;
  severity: EmergencySeverity;
  status: 'notified' | 'acknowledged' | 'resolved';
  vitals_snapshot?: VitalsSnapshot;
  notes?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string; // normalized from backend `createdAt` in the service
}

export interface EmergencyFlagKPIs {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  avg_response_minutes: number | null;
}

export interface NursePatient extends Profile {
  room_name?: string;
  last_vitals_at?: string;
}

export interface RequestedItem {
  item_type: 'medication' | 'inventory';
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  _id?: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  category: 'medications' | 'equipment' | 'supplies' | 'all';
  is_active: boolean;
  notes?: string;
  payment_terms?: string;
  categories_supplied?: string[];
  delivery_time_avg?: number;
  quality_score?: number;
  on_time_rate?: number;
  total_orders?: number;
}

export interface SupplyRequest {
  id: string;
  _id?: string;
  requested_by: { id: string; username: string; email: string; role: string } | string;
  item_type?: 'medication' | 'inventory';
  item_id?: string;
  item_name?: string;
  quantity_requested?: number;
  supplier?: Supplier | string;
  priority?: 'low' | 'normal' | 'urgent';
  requested_items?: RequestedItem[];
  expected_delivery?: string;
  shipment?: string;
  status: 'pending' | 'approved' | 'fulfilled' | 'rejected';
  notes?: string;
  fulfilled_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentItem {
  item_type: 'medication' | 'inventory';
  item_id: string;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit: string;
  notes?: string;
}

export interface Shipment {
  id: string;
  _id?: string;
  supply_request: string | SupplyRequest;
  supplier?: Supplier;
  received_by: string;
  items: ShipmentItem[];
  status: 'pending' | 'partial' | 'complete';
  received_at: string;
  warehouse_notes?: string;
}

export interface WarehouseEntry {
  id: string;
  _id?: string;
  shipment: string | Shipment;
  item_type: 'medication' | 'inventory';
  item_id: string;
  item_name: string;
  quantity_total: number;
  quantity_assigned: number;
  quantity_remaining: number;
  unit: string;
  status: 'unassigned' | 'partial' | 'assigned';
  createdAt: string;
}

export interface CreateSupplyRequestDto {
  supplier_id?: string;
  priority?: 'low' | 'normal' | 'urgent';
  expected_delivery?: string;
  requested_items: RequestedItem[];
  notes?: string;
}

export interface ReceiveShipmentDto {
  items: ShipmentItem[];
  warehouse_notes?: string;
  supplier_id?: string;
}

export interface AssignWarehouseDto {
  quantity: number;
  target_type: 'stock' | 'room';
  room_id?: string;
}

export interface BedOccupancy {
  unit: string;
  occupied: number;
  total: number;
}

export type PharmacistRxState = 'awaiting_verification' | 'verified' | 'dispensed' | 'rejected';
export type PharmacistRxFlag = 'standard' | 'restricted' | 'otc';

export interface PharmacistRx {
  id: string;
  _id?: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  items: PrescribedItem[];
  flag_type: PharmacistRxFlag;
  state: PharmacistRxState;
  notes?: string;
  created_at: string;
}

// ---- Schedules ----
export type ScheduleSlotType = 'available' | 'booked' | 'blocked';
export interface ScheduleSlot {
  id: string;
  date: string;
  time_slot: string;
  type: ScheduleSlotType;
  appointment_id?: string;
  patient_name?: string;
}
export interface DoctorSchedule {
  doctor_id: string;
  doctor_name: string;
  department?: string;
  slots: ScheduleSlot[];
}

// ---- Shifts ----
export type ShiftType = 'morning' | 'evening' | 'night';
export interface Shift {
  id: string;
  _id?: string;
  staff: { id: string; name: string; role: Role; department?: string };
  shift_type: ShiftType;
  start_date: string;
  end_date: string;
  notes?: string;
  created_at: string;
}
export interface AssignShiftDto {
  user_id: string;
  shift_type: ShiftType;
  start_date: string;
  end_date: string;
  notes?: string;
}

// ---- Announcements ----
export interface Announcement {
  id: string;
  _id?: string;
  title: string;
  message: string;
  target_roles: Role[];
  is_urgent: boolean;
  created_by: { name: string };
  createdAt: string;
}
export interface CreateAnnouncementDto {
  title: string;
  message: string;
  target_roles: Role[];
  is_urgent?: boolean;
}

// ---- Pricing ----
export interface PricingTestItem {
  test_name: string;
  price: number;
}
export interface RadiologyScanItem {
  scan_type: string;
  price: number;
}
export interface PricingSettings {
  appointments: { physical_fee: number; online_fee: number };
  rooms: { general_per_day: number; icu_per_day: number; operation_per_day: number; radiology_per_day: number };
  pharmacy: { delivery_fee: number };
  lab: PricingTestItem[];
  radiology: RadiologyScanItem[];
  updatedAt?: string;
}

// ---- Maintenance ----
export interface MaintenanceStatus {
  is_active: boolean;
  message?: string;
  estimated_duration?: number;
  started_at?: string;
}

// ---- Email Templates ----
export interface EmailTemplate {
  id: string;
  _id?: string;
  name: string;
  subject: string;
  body: string;
  updated_at?: string;
}

// ---- Compliance ----
export interface DeletionRequest {
  id: string;
  _id?: string;
  patient: { id: string; name: string; email: string };
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  processed_by?: string;
  processed_at?: string;
}

// ---- System Health ----
export interface SystemHealthEntry {
  status: 'ok' | 'error' | 'degraded';
  latency_ms?: number;
  message?: string;
}
export interface SystemHealth {
  mongodb: SystemHealthEntry;
  redis: SystemHealthEntry;
  socket_connections: number;
  uptime_seconds: number;
  memory: { used_mb: number; total_mb: number; percentage: number };
  checked_at: string;
}
export interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  endpoint?: string;
  level: 'error' | 'warn' | 'info';
  stack?: string;
}

// ---- Pharmacy (Full Module) ----
export interface PharmacyOrderFull {
  id: string;
  patient: string;
  patient_name?: string;
  pharmacist?: string;
  prescription?: string;
  invoice?: string;
  items: Array<{
    medication: string;
    medication_name?: string;
    quantity: number;
    price: number;
    requires_prescription?: boolean;
  }>;
  delivery_type: 'pickup' | 'delivery';
  status: 'pending' | 'approved' | 'rejected' | 'dispensed';
  total_amount: number;
  rejection_reason?: string;
  delivery_status?: 'preparing' | 'dispatched' | 'delivered';
  estimated_delivery_time?: string;
  tracking_notes?: string;
  order_type?: 'otc' | 'prescription';
  interactions_warning?: PharmaDrugInteraction[];
  discount_applied?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PharmaMedication {
  id: string;
  name: string;
  category: string;
  unit: string;
  requires_prescription: boolean;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  expiry_date?: string;
  is_low_stock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PharmaMedicationBatch {
  id: string;
  medication: string;
  batch_number: string;
  quantity_total: number;
  quantity_remaining: number;
  expiry_date: string;
  received_at: string;
  is_active: boolean;
}

export interface PharmaPrescription {
  id: string;
  patient: string;
  patient_name?: string;
  doctor: string;
  doctor_name?: string;
  doctor_specialization?: string;
  medical_record: string;
  items: Array<{
    medication: string;
    medication_name?: string;
    dosage: string;
    frequency: string;
    duration_days: number;
    instructions?: string;
  }>;
  status: 'active' | 'dispensed' | 'expired' | 'cancelled';
  expires_at: string;
  validity_check?: { valid: boolean; reason?: string };
  createdAt: string;
  updatedAt: string;
}

export interface PharmaDispensingRecord {
  id: string;
  order: string;
  patient: string;
  patient_name?: string;
  pharmacist: string;
  pharmacist_name?: string;
  medication: string;
  medication_name: string;
  quantity: number;
  dispensed_at: string;
  prescription?: string;
}

export interface PharmaRefillRequest {
  id: string;
  patient: string;
  patient_name?: string;
  original_prescription: string;
  original_order: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: string;
  medication_name?: string;
  last_dispensed_date?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PharmaDrugInteraction {
  id?: string;
  medication_a: string;
  medication_b: string;
  medication_a_name?: string;
  medication_b_name?: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

export interface PharmaDailyReport {
  report_date: string;
  total_dispensed: number;
  total_revenue: number;
  breakdown: Array<{
    medication_id: string;
    medication_name: string;
    quantity: number;
    revenue: number;
  }>;
  prescription_count: number;
  otc_count: number;
}

export interface PharmacyDeliveryUpdatePayload {
  order_id: string;
  delivery_status: string;
  tracking_notes?: string;
  estimated_delivery_time?: string;
}

export interface PharmacyLowStockPayload {
  medication_id: string;
  name: string;
  stock_quantity: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

export interface PharmacyExpiryAlertPayload {
  items: Array<{ name: string; expiry_date: string; type: string; urgent: boolean }>;
}

/* ----------------------------------------------------------------
   Inventory — Extended Types (Part 2)
---------------------------------------------------------------- */

export interface PurchaseOrderItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  unit: string;
}

export interface PurchaseOrder {
  id: string;
  _id?: string;
  supplier: Supplier | string;
  items: PurchaseOrderItem[];
  status: 'draft' | 'ordered' | 'shipped' | 'received' | 'cancelled';
  expected_delivery_date?: string;
  total_amount: number;
  created_by: { id: string; username: string } | string;
  received_at?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderDto {
  supplier_id: string;
  items: { item_id: string; quantity: number; unit_price: number }[];
  expected_delivery_date?: string;
  notes?: string;
}

export interface WasteEntry {
  id: string;
  _id?: string;
  item: string;
  item_name: string;
  quantity: number;
  reason: 'expired' | 'damaged' | 'lost';
  department?: string;
  notes?: string;
  logged_by: { id: string; username: string } | string;
  createdAt: string;
}

export interface LogWasteDto {
  item_id: string;
  quantity: number;
  reason: 'expired' | 'damaged' | 'lost';
  department?: string;
  notes?: string;
}

export interface BudgetSummary {
  month: number;
  year: number;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface BudgetHistoryEntry {
  month: number;
  year: number;
  budget: number;
  spent: number;
  remaining: number;
}

export interface ForecastItem {
  item_id: string;
  item_name: string;
  unit: string;
  current_stock: number;
  avg_daily_consumption: number;
  predicted_consumption: number;
  recommended_reorder_qty: number;
  suggested_reorder_date: string | null;
}

export interface ItemPrice {
  id: string;
  _id?: string;
  supplier: Supplier;
  unit_price: number;
  last_updated: string;
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  delivery_time_avg: number;
  quality_score: number;
  on_time_rate: number;
  total_orders: number;
  recent_orders: PurchaseOrder[];
}

export interface TransferStockDto {
  item_id: string;
  from_department: string;
  to_department: string;
  quantity: number;
  notes?: string;
}

export interface ConsumptionAnalytics {
  period: string;
  period_start: string;
  items: { item_id: string; item_name: string; total_consumed: number }[];
}

export interface PriceSuggestion {
  item_id: string;
  item_name: string;
  cheapest_supplier: ItemPrice | null;
}
