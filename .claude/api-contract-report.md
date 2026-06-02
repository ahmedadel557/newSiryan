# API Contract Report — Shape-Fallback Audit (2026-06-02)

Audited all `Array.isArray` fallbacks and nested-key reads across frontend services.
Each entry cross-references the actual `sendSuccess(res, data)` call in the corresponding controller.

---

## admin.service.ts

| Line | Function | Endpoint | BE returns | FE reads | Status | Action |
|------|----------|----------|------------|----------|--------|--------|
| 19 | `getUsers` | GET /admin/users | `{ users, total, page, limit, totalPages }` | `.data.data.users` | ✅ match | none |
| 43 | `getDashboardStats` | GET /admin/stats | stats object | `.data.data` | ✅ match | none |
| 48 | `getAuditLog` | GET /admin/audit-log | bare array | `normalizeList(res.data.data)` | ✅ match | none |
| 94 | `getInsuranceCompanies` | GET /admin/insurance-companies | bare array | `res.data.data.map(...)` | ✅ match | none |
| 113 | `getDepartments` | GET /admin/departments | bare array | `res.data.data?.departments ?? res.data.data ?? []` | ✅ safe | none (double-fallback handles bare array) |
| 128 | `getAdminInvoices` | GET /admin/invoices | bare array | `Array.isArray` guard | ✅ match | none |
| 139 | `getPatients` | GET /admin/users?role=patient | `{ users, total, ... }` | `res.data.data.users ?? []` | ✅ match | none |
| 149 | `getAppointments` | GET /admin/appointments | bare array | `Array.isArray` guard | ✅ match | none |
| 183 | `getAllSchedules` | GET /admin/schedules | bare array | `Array.isArray` guard | ✅ match | none |
| 213 | `getShifts` | GET /admin/shifts | `{ shifts: Record<dept,Shift[]>, total }` | `Array.isArray` guard → always `[]` | ❌ MISMATCH | **FIXED**: `Object.values(raw.shifts).flat()` |
| 219 | `getTodayShifts` | GET /admin/shifts/today | `{ shifts: Record<dept,Shift[]>, total }` | `Array.isArray` guard → always `[]` | ❌ MISMATCH | **FIXED**: `Object.values(raw.shifts).flat()` |
| 240 | `getAnnouncements` | GET /admin/announcements | bare array | `Array.isArray` guard | ✅ match | none |
| 307 | `getEmailTemplates` | GET /admin/email-templates | bare array | `Array.isArray` guard | ✅ match | none |
| 328 | `getDeletionRequests` | GET /admin/deletion-requests | bare array | `Array.isArray` guard | ✅ match | none |
| 332 | `processDeletionRequest` | PATCH /admin/deletion-requests/:id | 404 (no such route) | — | ❌ MISMATCH | **FIXED**: URL changed to `/:id/approve` or `/:id/reject` |
| 340 | `getDepartmentStaff` | GET /admin/departments/:id/staff | `{ department, staff: Record<role,Profile[]> }` | `.staff.map(...)` → TypeError | ❌ MISMATCH | **FIXED**: `Object.values(raw.staff).flat()` |
| 356 | `getSystemLogs` | GET /admin/system/logs | bare array | `Array.isArray` guard | ✅ match | none |

---

## inventory.service.ts

| Line | Function | Endpoint | BE returns | FE reads | Status |
|------|----------|----------|------------|----------|--------|
| 103 | `getLowStock` | GET /inventory/low-stock | `{ inventory: [], medications: [] }` | `.data.data.inventory` + `.medications` | ✅ match |
| 111 | `getExpiringItems` | GET /inventory/expiring | `{ urgent: [], warning: [] }` | `.data.data.urgent` + `.warning` | ✅ match |

---

## cashier.service.ts

| Line | Function | Endpoint | BE returns | FE reads | Status |
|------|----------|----------|------------|----------|--------|
| 108 | `payInvoicePartial` | PATCH /cashier/invoices/:id/partial | `{ invoice, remaining_balance }` | `res.data.data.invoice` | ✅ match |

---

## lab.service.ts / radiology.service.ts

| Line | Function | Endpoint | BE returns | FE reads | Status |
|------|----------|----------|------------|----------|--------|
| 37 | `getSchedule` | GET /lab/schedule | `[{ date, orders: Order[] }]` | `group.orders` via `.map()` | ✅ match |
| 37 | `getSchedule` | GET /radiology/schedule | `[{ date, orders: Order[] }]` | `group.orders` via `.map()` | ✅ match |

---

## nurse.service.ts

| Line | Function | Endpoint | BE returns | FE reads | Status |
|------|----------|----------|------------|----------|--------|
| 16 | `getVitals` | GET /nurse/vitals/:id | single object or array | `Array.isArray(data) ? data : [data]` | ✅ safe (intentional single→array coerce) |

---

## Summary

- **Fixed:** 3 mismatches (getShifts, getTodayShifts, getDepartmentStaff, processDeletionRequest URL)
- **Safe fallbacks:** 12+ `Array.isArray` guards confirmed correct (BE returns bare array)
- **No changes:** inventory/cashier/lab/radiology/nurse shape reads all match their controllers

---

## How to re-audit

```bash
cd apps/backend && npm run audit:routes
```

Re-run after adding new routes or new service calls. Output saved to `.claude/route-diff-report.txt`.
