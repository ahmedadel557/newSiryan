# Task Router

Maps task descriptions to the affected system and context-loader category.

## Auth
"fix login" / "fix token refresh" / "Google OAuth" / "session expires"
→ Auth system → context-loader: Auth Tasks

"fix middleware redirect" / "role routing broken" / "ipc flag issue"
→ Frontend middleware.ts → context-loader: Auth Tasks

## Patient
"add patient feature" / "fix patient dashboard" / "patient appointments"
→ Patient system → context-loader: Patient Feature Tasks

"book appointment" / "cancel appointment" / "pay invoice"
→ Patient + Billing → context-loader: Patient + Billing

## Doctor
"doctor schedule" / "medical record" / "prescription" / "lab order" / "radiology order"
→ Doctor system → context-loader: Doctor Feature Tasks

## Nurse
"nurse alerts" / "administer medication" / "vital signs"
→ Nurse system → load: dashboard/nurse/ + components/staff/nurse/ + hooks/useNurse*

## Receptionist
"check-in" / "register patient" / "manage appointments"
→ Receptionist system → load: dashboard/receptionist/ + components/staff/receptionist/

## Pharmacy / Pharmacist
"dispense prescription" / "pharmacy order"
→ Pharmacist system → load: dashboard/pharmacist/ + services/pharmacist.service.ts

## Inventory
"stock alert" / "supply request" / "warehouse entry"
→ Inventory system → load: dashboard/inventory/ + services/inventory.service.ts + BE inventory routes

## Lab / Radiology
"lab order" / "lab result" / "radiology order" / "radiology result"
→ Lab or Radiology system → load: respective dashboard + services

## Cashier / Billing
"invoice" / "payment" / "receipt" / "billing"
→ Cashier + Billing → context-loader: Billing / Cashier Tasks

## Admin
"manage users" / "staff request" / "insurance" / "audit log" / "reports"
→ Admin system → context-loader: Admin Tasks

## Backend API
"add endpoint" / "new route" / "fix API" / "validation error"
→ Backend API system → context-loader: Backend API Tasks

## Styling
"fix UI" / "wrong color" / "dark mode" / "component style"
→ Styling system → context-loader: Styling / UI Tasks

## Real-time
"notification not showing" / "socket disconnect" / "live update"
→ Real-time system → context-loader: Real-time / Notifications Tasks

## Types
"TypeScript error" / "type mismatch" / "add type"
→ src/types/index.ts (FE) or src/types/ (BE)
