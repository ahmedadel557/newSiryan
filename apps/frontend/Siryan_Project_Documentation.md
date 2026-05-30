# Siryan — Hospital Management System

## Project Documentation

---

## 1. Project Overview

**Siryan** is a comprehensive hospital management web platform designed to streamline medical operations for both patients and hospital staff. The system bridges the gap between patients and healthcare providers through digital tools including online consultations, appointment booking, pharmacy services, and resource management.

---

## 2. Roles & Permissions

### Patient

- Self-registers on the platform
- **Chatbot**: AI-powered medical chatbot — text consultation, upload prescriptions and scans
- **Appointment booking**: Physical visit or online video meeting with a doctor
- **Pharmacy**: Purchase OTC medications freely; restricted medications require a doctor's prescription
- **Room booking**: Book operation rooms, ICU, radiology — must assign a supervising doctor
- Delivery available for patients outside the hospital (requires prior visit record)

### Doctor

- View only assigned patients
- Access full patient medical records
- Write diagnosis, prescriptions, lab orders, radiology orders
- Request appointment cancellation or reschedule (approved by Receptionist)
- Manage personal schedule and availability

### Nurse

- View patients in assigned department only
- Record vital signs (blood pressure, temperature, heart rate, blood sugar, oxygen)
- Follow medication schedule and log administration
- Send emergency flags to doctor
- Cannot write prescriptions or diagnoses

### Receptionist

- Manage patient list and view appointments (no sensitive medical data)
- Approve/reject doctor cancellation and reschedule requests (after contacting patient)
- Coordinate lab and radiology orders
- Check-in patients on arrival
- Send appointment confirmation notifications

### Pharmacist

- View all prescriptions with filter by doctor name or specialization (auto-populated when doctor writes a prescription)
- Approve OTC drug requests directly
- Approve restricted drug requests only after verifying prescription
- Track low-stock medications and send supply requests to Inventory Manager

### Inventory Manager

- Full inventory control: medications, equipment, beds, rooms, oxygen tanks, supplies
- Automatic alerts when any item drops below 20% stock
- Receive supply requests from Pharmacist and system
- Update room/facility availability
- Manage suppliers and fulfillment orders
- Generate monthly inventory reports

### Lab Technician

- Account created by Admin
- Receive lab test orders fr
- Upload test results to patient file
- Notify doctor when results are ready

### Radiology Technician

- Account created by Admin
- Receive radiology orders
- Upload scan images to patient file
- Notify doctor when scans are ready

### Cashier

- Account created by Admin
- Process patient payments
- Issue invoices and receipts
- Handle insurance at point of sale
- Submit daily revenue report to Admin

### Admin

- Full system access
- Creates accounts for all staff (Doctor, Nurse, Receptionist, Pharmacist, Inventory Manager, Lab Technician, Radiology Technician, Cashier)
- Assigns roles to newly registered users
- Cannot view any user passwords (passwords stored as hashed)
- Manages departments, specializations, doctor schedules and shifts
- Manages insurance providers and coverage verification
- Full financial oversight: invoices, revenue reports, daily/monthly/annual summaries
- System-wide reports: bed occupancy, doctor performance, most common diagnoses, pharmacy stats
- Audit logs and system configuration

### Registration Flow

- **Patients**: Self-register → immediately active as Patient
- **Staff**: Admin creates account → sets role → system sends temporary password via email → staff logs in and changes password
- A self-registered user without an Admin-assigned role is treated as a Patient by default

---

## 3. System Architecture

### Layers

| Layer             | Components                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Client            | Patient Dashboard, Staff Dashboards, Admin Dashboard, Medical Chatbot (AI)                          |
| API Gateway       | Authentication, Rate Limiting, Routing                                                              |
| Backend Services  | Appointments, Medical Records, Pharmacy, Inventory, Notifications, Auth & RBAC, Billing, Video Call |
| Data Layer        | PostgreSQL (main DB), Redis (cache), File Storage (scans & reports)                                 |
| External Services | Payment Gateway, AI API (Claude), Video Call Provider, SMS/Email Service                            |

### Technology Recommendations

- **Frontend**: React / Next.js
- **Backend**: Node.js (Express) or Django REST Framework
- **Database**: PostgreSQL
- **Cache**: Redis
- **File Storage**: AWS S3 or similar
- **AI Chatbot**: Claude API (Anthropic) — supports Arabic, image/PDF analysis
- **Video Calls**: Twilio Video or similar
- **Notifications**: SendGrid (email), Twilio (SMS)
- **Auth**: JWT with refresh tokens, RBAC

---

## 4. Database Schema

### Group 1 — Users & Roles

**users**

- id (UUID PK), username, email, password_hash, role, is_active, created_at

**roles**

- id (UUID PK), name, description

**staff_profiles**

- id (UUID PK), user_id (FK), first_name, last_name, phone, specialization, department, shift, hired_at

**patient_profiles**

- id (UUID PK), user_id (FK), first_name, last_name, date_of_birth, gender, blood_type, phone, address, insurance_provider, insurance_number

---

### Group 2 — Appointments & Medical Records

**appointments**

- id, patient_id, doctor_id, type (physical/online), scheduled_at, status, cancel_reason, rescheduled_from, created_at

**medical_records**

- id, patient_id, doctor_id, appointment_id, diagnosis, notes, created_at

**lab_orders**

- id, record_id, patient_id, doctor_id, technician_id, test_name, status, results, file_url, ordered_at, completed_at

**radiology_orders**

- id, record_id, patient_id, doctor_id, technician_id, scan_type, status, file_url, ordered_at, completed_at

**vital_signs**

- id, patient_id, nurse_id, blood_pressure_sys, blood_pressure_dia, temperature, heart_rate, blood_sugar, oxygen_level, recorded_at

---

### Group 3 — Pharmacy & Inventory

**medications**

- id, name, category, unit, requires_prescription, price, stock_quantity, low_stock_threshold, expiry_date, updated_at

**prescriptions**

- id, patient_id, doctor_id, record_id, status, created_at, expires_at

**prescription_items**

- id, prescription_id, medication_id, dosage, frequency, duration_days, instructions

**pharmacy_orders**

- id, patient_id, pharmacist_id, prescription_id, delivery_type, status, total_amount, ordered_at

**inventory_items**

- id, name, category, unit, quantity, low_stock_threshold, expiry_date, location, updated_at

**supply_requests**

- id, requested_by, item_id, quantity_requested, status, notes, requested_at, fulfilled_at

---

### Group 4 — Rooms, Billing & Notifications

**rooms**

- id, name, type (operation/ICU/radiology/general), status, floor, capacity, price_per_day, assigned_doctor_id

**room_bookings**

- id, room_id, patient_id, doctor_id, check_in, check_out, status, total_cost

**invoices**

- id, patient_id, status, subtotal, insurance_coverage, total_due, payment_method, insurance_provider, issued_at, paid_at

**invoice_items**

- id, invoice_id, description, category, amount

**notifications**

- id, user_id, type, title, message, is_read, created_at

---

## 5. API Endpoints

### Auth (All Roles)

| Method | Endpoint                  | Description                            |
| ------ | ------------------------- | -------------------------------------- |
| POST   | /api/auth/register        | Register new user (patient by default) |
| POST   | /api/auth/login           | Login and return JWT                   |
| POST   | /api/auth/logout          | Logout                                 |
| POST   | /api/auth/refresh-token   | Refresh access token                   |
| POST   | /api/auth/forgot-password | Request password reset                 |

### Patient

| Method | Endpoint                       | Description                     |
| ------ | ------------------------------ | ------------------------------- |
| GET    | /api/patient/profile           | Get patient profile             |
| PUT    | /api/patient/profile           | Update patient profile          |
| GET    | /api/patient/medical-record    | Full medical history            |
| GET    | /api/patient/appointments      | List appointments               |
| POST   | /api/patient/appointments      | Book new appointment            |
| DELETE | /api/patient/appointments/:id  | Cancel appointment              |
| GET    | /api/patient/prescriptions     | Patient prescriptions           |
| GET    | /api/patient/lab-results       | Lab test results                |
| GET    | /api/patient/radiology-results | Radiology results               |
| POST   | /api/patient/pharmacy/order    | Order medication                |
| GET    | /api/patient/pharmacy/orders   | List pharmacy orders            |
| POST   | /api/patient/rooms/book        | Book room/facility              |
| GET    | /api/patient/rooms/bookings    | Room bookings                   |
| POST   | /api/patient/chatbot           | Send message to medical chatbot |

### Doctor

| Method | Endpoint                                        | Description            |
| ------ | ----------------------------------------------- | ---------------------- |
| GET    | /api/doctor/patients                            | Assigned patients      |
| GET    | /api/doctor/patients/:id/record                 | Patient medical record |
| POST   | /api/doctor/patients/:id/diagnosis              | Write diagnosis        |
| POST   | /api/doctor/patients/:id/prescription           | Write prescription     |
| POST   | /api/doctor/patients/:id/lab-order              | Order lab test         |
| POST   | /api/doctor/patients/:id/radiology-order        | Order radiology        |
| GET    | /api/doctor/schedule                            | Doctor schedule        |
| POST   | /api/doctor/appointments/:id/reschedule-request | Request reschedule     |
| POST   | /api/doctor/appointments/:id/cancel-request     | Request cancellation   |

### Receptionist

| Method | Endpoint                                      | Description              |
| ------ | --------------------------------------------- | ------------------------ |
| GET    | /api/receptionist/patients                    | Patient list             |
| GET    | /api/receptionist/patients/:id/appointments   | Patient appointments     |
| PATCH  | /api/receptionist/appointments/:id/confirm    | Confirm appointment      |
| PATCH  | /api/receptionist/appointments/:id/cancel     | Approve cancellation     |
| PATCH  | /api/receptionist/appointments/:id/reschedule | Approve reschedule       |
| GET    | /api/receptionist/lab-orders                  | Pending lab orders       |
| GET    | /api/receptionist/radiology-orders            | Pending radiology orders |
| POST   | /api/receptionist/checkin/:patient_id         | Patient check-in         |

### Pharmacist

| Method | Endpoint                         | Description                    |
| ------ | -------------------------------- | ------------------------------ |
| GET    | /api/pharmacy/prescriptions      | All prescriptions with filters |
| GET    | /api/pharmacy/prescriptions/:id  | Prescription details           |
| PATCH  | /api/pharmacy/orders/:id/approve | Approve order                  |
| PATCH  | /api/pharmacy/orders/:id/reject  | Reject order                   |
| GET    | /api/pharmacy/medications        | Available medications          |
| POST   | /api/pharmacy/supply-request     | Request medication supply      |

### Inventory Manager

| Method | Endpoint                                   | Description              |
| ------ | ------------------------------------------ | ------------------------ |
| GET    | /api/inventory/items                       | All inventory items      |
| POST   | /api/inventory/items                       | Add new item             |
| PUT    | /api/inventory/items/:id                   | Update item              |
| GET    | /api/inventory/low-stock                   | Items below 20%          |
| GET    | /api/inventory/supply-requests             | Incoming supply requests |
| PATCH  | /api/inventory/supply-requests/:id/fulfill | Fulfill supply request   |
| GET    | /api/inventory/rooms                       | Room/facility status     |
| PATCH  | /api/inventory/rooms/:id/status            | Update room status       |

### Nurse

| Method | Endpoint                                         | Description               |
| ------ | ------------------------------------------------ | ------------------------- |
| GET    | /api/nurse/patients                              | Patients in department    |
| POST   | /api/nurse/patients/:id/vitals                   | Record vital signs        |
| GET    | /api/nurse/patients/:id/medication-schedule      | Medication schedule       |
| PATCH  | /api/nurse/patients/:id/medication/:med_id/given | Log medication given      |
| POST   | /api/nurse/patients/:id/emergency-flag           | Emergency alert to doctor |

### Lab / Radiology

| Method | Endpoint                          | Description               |
| ------ | --------------------------------- | ------------------------- |
| GET    | /api/lab/orders                   | Assigned lab orders       |
| PATCH  | /api/lab/orders/:id/results       | Upload lab results        |
| GET    | /api/radiology/orders             | Assigned radiology orders |
| PATCH  | /api/radiology/orders/:id/results | Upload scan image         |

### Admin

| Method | Endpoint                      | Description                     |
| ------ | ----------------------------- | ------------------------------- |
| GET    | /api/admin/users              | All users                       |
| POST   | /api/admin/users              | Create staff account            |
| PATCH  | /api/admin/users/:id/role     | Assign/change role              |
| PATCH  | /api/admin/users/:id/activate | Activate/deactivate account     |
| DELETE | /api/admin/users/:id          | Delete user                     |
| GET    | /api/admin/appointments       | All hospital appointments       |
| DELETE | /api/admin/appointments/:id   | Cancel appointment (emergency)  |
| GET    | /api/admin/departments        | Departments and specializations |
| POST   | /api/admin/departments        | Add department                  |
| GET    | /api/admin/reports/revenue    | Revenue report                  |
| GET    | /api/admin/reports/occupancy  | Room occupancy report           |
| GET    | /api/admin/reports/doctors    | Doctor performance report       |
| GET    | /api/admin/audit-log          | Login audit log                 |
| GET    | /api/admin/invoices           | All invoices                    |
| POST   | /api/admin/invoices           | Issue invoice                   |

---

## 6. UI/UX Flows

### Patient Journey

1. Opens Siryan app
2. Register (new) or Login (existing)
3. Arrives at Patient Dashboard
4. Chooses a service:
   - **Chatbot**: Upload files → AI responds → Medical record updated
   - **Book Appointment**: Select doctor & time → Confirm → SMS/Email notification
   - **Pharmacy**: Choose medication → OTC (direct) or Prescription (verify) → Order sent to Pharmacist
   - **Room Booking**: Select room type & doctor → Confirm → SMS/Email notification
5. All actions reflected on dashboard with real-time notifications

### Appointment Cancellation / Reschedule Flow

1. **Doctor** sends cancel or reschedule request from dashboard
2. **Receptionist** receives request, reviews appointment details
3. **Receptionist** contacts Patient (phone/notification)
4. **Patient** confirms or rejects
   - Rejects → Receptionist notifies Doctor, appointment continues
   - Confirms (Cancel) → Receptionist cancels, all parties notified
   - Confirms (Reschedule) → Receptionist sets new time, all parties notified

### Inventory Alert & Supply Flow

1. System monitors inventory continuously (automated)
2. Any item drops below 20% threshold → automatic alert to Inventory Manager
3. Pharmacist can also manually send supply request for a medication
4. Inventory Manager reviews alert + requests
5. Approves and places supply order
6. Inventory is restocked and updated in system

---

## 7. External Services & Integrations

| Service    | Purpose                                          | Recommendation         |
| ---------- | ------------------------------------------------ | ---------------------- |
| AI Chatbot | Medical consultation, prescription/scan analysis | Claude API (Anthropic) |
| SMS        | Appointment confirmations, alerts                | Twilio                 |
| Email      | Notifications, password reset                    | SendGrid               |
| Video Call | Online doctor consultations                      | Twilio Video           |
| Payment    | Patient billing                                  | Local payment gateway  |

---

## 8. Security Notes

- All passwords stored as bcrypt hashes — Admin cannot view passwords
- JWT-based authentication with refresh tokens
- RBAC (Role-Based Access Control) enforced at API Gateway level
- Sensitive medical data accessible only to authorized roles
- Receptionist cannot access patient medical details — appointments only
- Audit log tracks all Admin actions and user logins
- Prescription-required medications cannot be dispensed without verified doctor prescription

---

_Siryan — Project Documentation v1.0_
