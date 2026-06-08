# UI Responsive Audit Report — Phase 1 (Mobile-First)
Generated: 2026-06-08
Total files scanned: 220
Issues found: 13 critical, 32 warnings, 5 info

**Phase 2 fix sweep completed: 2026-06-08. All Critical and Warning items resolved.**

---

## Critical Issues

### `components/doctor/OverviewTab.tsx` (line 98) [FIXED]
- Issue: `grid-cols-3` without `grid-cols-1` base — vitals tiles overflow on mobile
- Current: `className="grid grid-cols-3 gap-3 px-5 pb-[18px] pt-3"`
- Fix: `className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 pb-[18px] pt-3"`

### `components/doctor/VitalsTab.tsx` (line 82) [FIXED]
- Issue: `grid-cols-3` without `grid-cols-1` base — 3 vital tiles crush on mobile
- Current: `className="grid grid-cols-3 gap-3 px-5 py-4"`
- Fix: `className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 py-4"`

### `components/doctor/PrescriptionModal.tsx` (line 98) [FIXED]
- Issue: `grid-cols-3` without base — dose/frequency/duration inputs inside a modal, unreadable on mobile
- Current: `className="grid grid-cols-3 gap-2"`
- Fix: `className="grid grid-cols-1 sm:grid-cols-3 gap-2"`

### `components/doctor/DiagnosisModal.tsx` (line 121) [FIXED]
- Issue: `grid-cols-3` without base — 3 columns inside a bottom-sheet modal
- Current: `<div className="grid grid-cols-3 gap-3">`
- Fix: `<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">`

### `app/dashboard/admin/page.tsx` (lines 72–83) [FIXED]
- Issue: `grid-cols-2` without base + `col-span-2` child — both collapse incorrectly on mobile
- Current: `className="grid grid-cols-2 gap-5"` + child `className="... col-span-2"`
- Fix: `className="grid grid-cols-1 md:grid-cols-2 gap-5"` + child `className="... md:col-span-2"`

### `app/dashboard/admin/schedules/page.tsx` (line 159) [FIXED]
- Issue: `grid-cols-3 flex-1` without base — KPI strip cards overflow on mobile
- Current: `className="grid grid-cols-3 gap-3 flex-1"`
- Fix: `className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1"`

### `app/dashboard/admin/reports/page.tsx` (line 150) [FIXED]
- Issue: `grid-cols-3` without base — stat summary row overflows
- Current: `<div className="grid grid-cols-3 gap-3">`
- Fix: `<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">`

### `app/dashboard/cashier/invoices/[id]/page.tsx` (line 276) [FIXED]
- Issue: `grid-cols-3` without base — payment breakdown columns overflow
- Current: `<div className="grid grid-cols-3 gap-3">`
- Fix: `<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">`

### `app/dashboard/inventory/reports/page.tsx` (line 244) [FIXED]
- Issue: `grid-cols-3` without base — inventory chart row overflows
- Current: `<div className="grid grid-cols-3 gap-3">`
- Fix: `<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">`

### `app/dashboard/patient/appointments/page.tsx` (line 309) [FIXED]
- Issue: `grid-cols-3` without base — filter button row overflows on small phones
- Current: `<div className="grid grid-cols-3 gap-3">`
- Fix: `<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">`

### `components/shared/DashboardSkeleton.tsx` (line 18) [FIXED]
- Issue: `grid-cols-4` without base — skeleton loading shows 4 tiny columns on mobile
- Current: `<div className="grid grid-cols-4 gap-4">`
- Fix: `<div className="grid grid-cols-2 md:grid-cols-4 gap-4">`

### `app/dashboard/receptionist/patients/page.tsx` (line 143) [FIXED]
- Issue: `w-[380px] shrink-0` fixed-width detail panel in a flex row — overflows viewport on mobile
- Current: `<div className="w-[380px] shrink-0 flex flex-col gap-4">`
- Fix: Outer flex needs `flex-col md:flex-row`; panel: `w-full md:w-[380px] md:shrink-0`

### `app/dashboard/admin/invoices/page.tsx` (line 415) [FIXED]
- Issue: `w-[340px] shrink-0` fixed-width sidebar in `flex gap-5` — overflows on mobile
- Current: `<div className="w-[340px] shrink-0 card p-5 flex flex-col gap-4 self-start sticky top-5">`
- Fix: Outer flex needs `flex-col md:flex-row`; sidebar: `w-full md:w-[340px] md:shrink-0 md:sticky md:top-5`

---

## Warnings

### RTL Incompatible — `pl-` / `pr-` on containers and inputs

#### `components/layouts/StaffShell.tsx` (line 315) [FIXED]
- Issue: `pl-4 border-l` — layout container uses physical left properties
- Current: `className="flex items-center gap-[10px] pl-4 border-l border-[var(--border-1)] ml-2"`
- Fix: `className="flex items-center gap-[10px] ps-4 border-s border-[var(--border-1)] ms-2"`

#### `components/layouts/PatientShell.tsx` (line 240) [FIXED]
- Issue: `pl-9 pr-3` on search input with icon
- Fix: `ps-9 pe-3`

#### `components/doctor/PatientQueueTable.tsx` (line 77) [FIXED]
- Issue: `pl-8 pr-3` on search input
- Fix: `ps-8 pe-3`

#### `components/shared/SecuritySection.tsx` (line 63) [FIXED]
- Issue: `pl-3 pr-9` on password input (reveal icon on right)
- Fix: `ps-3 pe-9`

#### `components/staff/pharmacist/PharmacistFilterBar.tsx` (line 17) [FIXED]
- Issue: `pl-9 pr-3` on search input with leading icon
- Fix: `ps-9 pe-3`

#### `components/patient/MedicationCatalog.tsx` (line 43) [FIXED]
- Issue: `pl-9 pr-3` on search input
- Fix: `ps-9 pe-3`

#### `app/dashboard/admin/invoices/page.tsx` (line 342) [FIXED]
- Issue: `pl-8` on search input with leading icon
- Fix: `ps-8`

#### `app/dashboard/admin/audit-log/page.tsx` (lines 101, 116, 132) [FIXED]
- Issue: `pl-8`, `pr-8`, `pr-8` — search + select inputs with icons
- Fix: `ps-8`, `pe-8`, `pe-8`

#### `app/dashboard/admin/appointments/page.tsx` (line 178) [FIXED]
- Issue: `pl-8` on search input
- Fix: `ps-8`

#### `app/dashboard/doctor/record/page.tsx` (line 103) [FIXED]
- Issue: `pl-9 pr-3` on patient search input
- Fix: `ps-9 pe-3`

#### `app/dashboard/cashier/invoices/page.tsx` (line 89) [FIXED]
- Issue: `pl-9 pr-3` on search input
- Fix: `ps-9 pe-3`

#### `app/dashboard/radiology/orders/page.tsx` (line 73) + `app/dashboard/lab/orders/page.tsx` (line 73) [FIXED]
- Issue: `pl-9` on search inputs
- Fix: `ps-9`

#### `app/dashboard/nurse/patients/page.tsx` (line 53) [FIXED]
- Issue: `pl-9` on search input
- Fix: `ps-9`

---

### RTL Incompatible — `ml-` / `mr-` on layout elements

#### `components/doctor/VitalTile.tsx` (line 39) [FIXED]
- Issue: `ml-1` on unit label
- Fix: `ms-1`

#### `components/staff/cashier/InvoiceCard.tsx` (line 84) [FIXED]
- Issue: `ml-2` on category label
- Fix: `ms-2`

#### `components/doctor/PatientQueueTable.tsx` (line 56) [FIXED]
- Issue: `ml-3` on tab group
- Fix: `ms-3`

#### `components/doctor/DoctorRatingsCard.tsx` (line 83) [FIXED]
- Issue: `ml-2` on patient name label
- Fix: `ms-2`

#### `components/shared/ConfirmDialog.tsx` (line 41) [FIXED]
- Issue: `ml-2` on close button
- Fix: `ms-2`

#### `app/dashboard/admin/schedules/[doctorId]/page.tsx` (line 187) [FIXED]
- Issue: `ml-2` on select input
- Fix: `ms-2`

#### `app/dashboard/nurse/patients/[id]/page.tsx` (lines 274, 294, 298, 302) [FIXED]
- Issue: `mr-1` on inline icons before text labels
- Fix: `me-1`

#### `app/dashboard/admin/insurance/page.tsx` (line 138) [FIXED]
- Issue: `mr-1` on inline icon before text
- Fix: `me-1`

#### `app/dashboard/inventory/suppliers/page.tsx` (line 277) [FIXED]
- Issue: `mr-1` on inline star icon
- Fix: `me-1`

---

### Fixed-width inputs that clip in narrow toolbar rows

#### `app/dashboard/admin/invoices/page.tsx` (line 342) [FIXED]
- Issue: `w-[180px]` hard-coded search input
- Fix: `w-full sm:w-[180px]`

#### `app/dashboard/admin/audit-log/page.tsx` (line 101) [FIXED]
- Issue: `w-[200px]` search input
- Fix: `w-full sm:w-[200px]`

#### `app/dashboard/admin/appointments/page.tsx` (line 178) [FIXED]
- Issue: `w-[220px]` search input
- Fix: `w-full sm:w-[220px]`

#### `app/dashboard/cashier/invoices/page.tsx` (line 89) [FIXED]
- Issue: `w-[240px]` search input in toolbar
- Fix: `w-full sm:w-[240px]`

#### `components/staff/pharmacist/PharmacistFilterBar.tsx` (line 10) [FIXED]
- Issue: `w-[280px]` container — hard-coded
- Fix: `w-full sm:w-[280px]`

---

### `grid-cols-2` without `grid-cols-1` base (inside modals or detail panels)

#### `app/dashboard/receptionist/requests/page.tsx` (lines 94, 160) [FIXED]
- Fix: `grid-cols-1 sm:grid-cols-2`

#### `app/dashboard/admin/settings/page.tsx` (lines 126, 144) [FIXED]
- Fix: `grid-cols-1 sm:grid-cols-2`

#### `app/dashboard/admin/schedules/page.tsx` (line 238) [FIXED]
- Fix: `grid-cols-1 sm:grid-cols-2`

#### `app/dashboard/admin/invoices/page.tsx` (line 205) [FIXED]
- Fix: `grid-cols-1 sm:grid-cols-2`

#### `app/dashboard/inventory/requests/page.tsx` (lines 174, 398, 500) [FIXED]
- Fix: `grid-cols-1 sm:grid-cols-2`

#### `components/staff/pharmacist/BatchesModal.tsx` (line 89) [FIXED]
- Fix: `grid-cols-1 sm:grid-cols-2`

#### `components/staff/pharmacist/PrescriptionDetailModal.tsx` (line 65) [FIXED]
- Fix: `grid-cols-1 sm:grid-cols-2`

---

## Info

### `components/patient/BookingProgress.tsx` (line 11)
- Issue: `-mr-1 pr-1` scroll-bleed pattern — not RTL-compatible
- Current: `<div className="overflow-x-auto -mr-1 pr-1">`
- Fix: `<div className="overflow-x-auto -me-1 pe-1">`

### `app/dashboard/patient/rooms/page.tsx` (line 233)
- Issue: `gap-8` in vertical flex — excessive spacing on mobile
- Current: `<div className="flex flex-col gap-8">`
- Fix: `<div className="flex flex-col gap-5 md:gap-8">`

### `components/shared/NotificationBell.tsx` (line 281)
- Issue: `w-80` (320px) dropdown — can clip on very narrow phones (< 360px)
- Current: `className="w-80 ..."`
- Fix: `className="w-[calc(100vw-24px)] sm:w-80 ..."`

### `app/dashboard/admin/schedules/page.tsx` (line 343)
- Issue: `min-w-[220px]` on a flex item inside a flex row — may force horizontal scroll
- Fix: Remove or wrap the parent in `overflow-x-auto`

### `app/dashboard/admin/schedules/page.tsx` (line 1064)
- Issue: `flex-1 min-w-[200px]` inside schedule config modal fields — may overflow on mobile
- Fix: `w-full` and drop `min-w-[200px]`

---

## Summary by section

| Section | Critical | Warning | Info |
|---------|----------|---------|------|
| Landing page | 0 | 0 | 0 |
| Auth pages | 0 | 0 | 0 |
| Patient dashboard | 1 ✅ | 1 ✅ | 1 |
| Doctor dashboard | 4 ✅ | 3 ✅ | 0 |
| Admin dashboard | 5 ✅ | 8 ✅ | 2 |
| Receptionist dashboard | 1 ✅ | 2 ✅ | 0 |
| Cashier dashboard | 1 ✅ | 2 ✅ | 0 |
| Nurse dashboard | 0 | 4 ✅ | 0 |
| Pharmacist dashboard | 0 | 3 ✅ | 0 |
| Inventory dashboard | 1 ✅ | 3 ✅ | 0 |
| Lab / Radiology dashboard | 0 | 2 ✅ | 0 |
| Shared components | 0 | 2 ✅ | 1 |
| Modals & popups | 0 | 2 ✅ | 0 |
| Layouts (Shell) | 0 | 1 ✅ | 1 |

---

## Notes

- **ModalSheet is already mobile-safe**: bottom-sheet on mobile (`inset-x-0 bottom-0 max-h-[90vh]`), centered on desktop. All modals using `w-full max-w-[...]` are correctly mobile-first.
- **Tables**: Every `<table>` in the codebase is correctly wrapped in `overflow-x-auto`. No bare tables without scroll containers found.
- **Landing page**: Uses custom CSS classes (`.hero`, `.bento-grid`, etc.) defined in CSS, not Tailwind — assumed to have its own responsive rules; excluded from this Tailwind audit.
- **Auth pages**: Use `AuthShell` with `max-w-[460px]` centered layout — correctly mobile-safe.
- **Staff shells**: Both `StaffShell` and `PatientShell` handle mobile via `isMobile` detection + bottom nav; sidebar is `{!isMobile && ...}` — correct pattern.
- **`grid-cols-2` with `col-span-2` coupling**: Three instances (`admin/page.tsx:83`, `receptionist/requests/page.tsx:108`, `patient/page.tsx:167,173`). When fixing the parent grid to add `grid-cols-1` base, the `col-span-2` children must also gain `md:col-span-2` to avoid spanning into a 1-column grid.
