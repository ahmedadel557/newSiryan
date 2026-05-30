# Ownership Map

## Auth System
- BE: src/routes/auth.ts, src/controllers/auth/, src/services/auth.service.ts
- BE: src/middlewares/authenticate.ts, src/config/passport.ts
- FE: src/middleware.ts, src/app/auth/, src/services/auth.service.ts, src/context/AuthContext.tsx

## Patient System
- BE: src/routes/patient.ts, src/controllers/patient/, src/models/Profile.ts
- FE: src/app/dashboard/patient/, src/components/patient/, src/hooks/usePatient*.ts, src/services/patient.service.ts

## Doctor System
- BE: src/routes/doctor.ts, src/controllers/doctor/
- FE: src/app/dashboard/doctor/, src/components/doctor/, src/hooks/useDoctor*.ts, src/services/doctor.service.ts

## Nurse System
- BE: src/routes/nurse.ts, src/controllers/nurse/
- FE: src/app/dashboard/nurse/, src/components/staff/nurse/, src/hooks/useNurse*.ts

## Receptionist System
- BE: src/routes/receptionist.ts, src/controllers/receptionist/
- FE: src/app/dashboard/receptionist/, src/components/staff/receptionist/

## Pharmacist System
- BE: src/routes/pharmacist.ts, src/controllers/pharmacist/
- FE: src/app/dashboard/pharmacist/, src/components/staff/pharmacist/, src/services/pharmacist.service.ts

## Inventory System
- BE: src/routes/inventory.ts, src/controllers/inventory/, src/models/InventoryItem.ts + SupplyRequest.ts + Shipment.ts + WarehouseEntry.ts
- FE: src/app/dashboard/inventory/, src/components/staff/inventory/, src/services/inventory.service.ts

## Lab Technician System
- BE: src/routes/lab.ts, src/controllers/lab/, src/models/LabOrder.ts
- FE: src/app/dashboard/lab/, src/components/staff/lab/, src/services/lab.service.ts

## Radiology System
- BE: src/routes/radiology.ts, src/controllers/radiology/, src/models/RadiologyOrder.ts
- FE: src/app/dashboard/radiology/, src/components/staff/radiology/, src/services/radiology.service.ts

## Cashier / Billing System
- BE: src/routes/cashier.ts (or billing.ts), src/services/billing.service.ts, src/models/Invoice.ts + InvoiceItem.ts, src/utils/pricing.ts
- FE: src/app/dashboard/cashier/, src/services/cashier.service.ts

## Admin System
- BE: src/routes/admin.ts, src/controllers/admin/, src/models/AuditLog.ts + InsuranceCompany.ts
- FE: src/app/dashboard/admin/, src/components/staff/admin/

## Shared / Cross-Cutting
- BE: src/middlewares/, src/utils/, src/config/, src/jobs/, src/models/User.ts + Notification.ts + UserSettings.ts
- FE: src/components/ui/, src/components/shared/, src/styles/, src/types/index.ts, src/config/navItems.tsx, src/hooks/useNotifications.ts + useSocketEvent.ts + useToast.ts
