# Current Task

## Task
Patient System Fixes — Part 2 (2026-06-02): Book Appointment Improvements.

## Status
COMPLETE.

## What was done
- **FIX 1** Removed dead "Save as draft" button from `BookingSummaryPanel`
- **FIX 2** Departments now fetched from `GET /patient/departments` (TanStack Query); hardcoded `DEPARTMENTS` array removed; loading skeleton + "no departments" fallback added; Next disabled while loading
- **FIX 3** Doctor list now filtered by selected department (`GET /doctor/list?department=...`); re-fetches on department change; selecting a new department clears previous doctor selection
- **FIX 4** `reason` fallback no longer uses `formData.department` — sends empty string instead
- **FIX 5** Removed duplicate outer `div` in DoctorStep filter bar; onWheel now fires once
- **FIX 6** Extracted `DoctorCard` + `DoctorFilterBar` components; DoctorStep now ≤100 lines; added empty-state ("Change department" button) separate from error state; helper text below Next when no doctor selected
- **FIX 7** `cachedDoctorRef` in `useBooking` preserves last resolved doctor on re-fetch failure (back navigation resilience)
- **FIX 8** Notes row icon in `ConfirmStep` changed from `Calendar` → `FileText`
- **FIX 9** `BookingProgress` wrapped in `overflow-x-auto` container with `min-w-max` inner row — no overflow on narrow screens
- **FIX 10** Department initialises as `''`; first real department from backend becomes default once loaded
- **FIX 11** Distinct empty-state in `DoctorStep`: fetch success + 0 results shows "No doctors available for this department" + "Change department" back-button
- **BACKEND** `GET /patient/departments` route added (reuses admin `getDepartments` controller)
- **BACKEND** `getDoctorList` now accepts `?department` query param and filters by it
- **KEYS** Added `bookingDepartments` + `bookingDoctors` to `queryKeys.ts`

## Verification
- `npm run audit:routes`: ❌ 0 (GET /patient/departments now ✅ matched)
- `npx tsc --noEmit` backend: 0 errors
- `npx tsc --noEmit` frontend: 0 errors

## Next Steps
- Integration testing: smoke-test the full booking flow end-to-end in the browser

---

## Previous Task
B1–B8 Backend Gap Fixes — re-apply all 8 missing route/controller additions (2026-06-02).

## What was done
- **B1** `GET /lab/orders/:id` — added `getLabOrderById` controller + route
- **B2** `GET /radiology/orders/:id` — added `getRadiologyOrderById` controller + route
- **B3** `POST /pharmacy/prescriptions/:id/verify` — added `verifyPrescription` controller + route
- **B4** `POST /pharmacy/prescriptions/:id/reject` — added `rejectPrescription` controller + route
- **B5** `GET /nurse/patients/:id/vitals` — added `getPatientVitals` controller + route
- **B6** Split `processDeletionRequest` → `approveDeletionRequest` + `rejectDeletionRequest` in admin.service.ts; updated compliance page
- **B7** `POST /receptionist/appointments` — added `createAppointmentSchema` validation + `createAppointment` controller + route
- **B8** `POST /receptionist/patients` — added `registerPatientSchema` validation + `registerPatient` controller + route

## Verification
- `npm run audit:routes` → ❌ 0 (was 8)
- `npx tsc --noEmit` backend → 0 errors
- `npx tsc --noEmit` frontend → 0 errors

---

## Previous Task
TanStack Query Migration — Part 3 of 3 (2026-06-02): hook folder cleanup + useNotifications migration.

## What was done
- Migrated `useNotifications` from polling/useState to TanStack Query (`refetchInterval: 30_000`, socket → `setQueryData`, mutations for markRead/markAllRead/deleteOne/clearAll)
- Added `notifications` and `chatbotHistory` queryKeys to `queryKeys.ts`
- Created root `hooks/index.ts` — unified barrel re-exporting all subfolder hooks (conflict-safe aliases for `QueueFilter` clash between doctor/ and receptionist/)
- Updated all 111 files that still imported `@/hooks/useXxx` barrel paths → proper subfolder paths (`@/hooks/shared`, `@/hooks/doctor`, `@/hooks/patient`, etc.)
- Deleted all 39 barrel re-export files from `hooks/` root
- Verification: `npx tsc --noEmit` → 0 errors; `grep '@/hooks/use'` → 0 matches; lint errors are all pre-existing (315 total, same baseline)

## Files Changed
- `apps/frontend/src/lib/queryKeys.ts` — added notifications + chatbotHistory keys
- `apps/frontend/src/hooks/shared/useNotifications.ts` — TanStack Query migration
- `apps/frontend/src/hooks/index.ts` — NEW: root barrel re-exporting all subfolders
- 111 page/component/hook files — import path updates only (no logic changes)
- 39 `hooks/useXxx.ts` barrel files — DELETED

## Next Steps
- Doctor system integration testing (video calls with real Stream credentials, browser smoke-test of all hooks)
- Browser smoke-test the remaining TanStack migrations (nurse/receptionist/pharmacist/lab/radiology/inventory) — especially socket-driven cache invalidations

---

## Previous Task
Bugfixes (2026-06-02) — staff-registration slow response + admin pending-staff badge stale — COMPLETE.

## Context / Decisions

### Bug 1 — staff registration "stuck on Submitting…" then resolves slowly
The frontend was correct; backend was the bottleneck. `authService.registerStaff` awaited
`sendEmail` inline (no SMTP timeout configured), so a slow SendGrid round-trip held the HTTP
response and the form's `await apiClient.post(...)` legitimately waited. Misleading symptom — the
user thought the form was stuck, but the success screen rendered correctly once SMTP finished.

Investigated each hypothesis in the prompt and ruled them all out against actual source:
- Frontend `api.client.ts` interceptor is identity on 2xx → can't throw.
- Backend `registerStaff` does NOT call `setAuthCookies` → no cookie-driven redirect.
- `middleware.ts` has `/auth/register` in `publicPaths` → middleware never reads cookie there.

Fix: drop the `await` from the `sendEmail` call (it's already `.catch(()=>{})`-guarded and matches
the surrounding fire-and-forget side-effects). One-line behavioural change + a comment.

### Bug 2 — admin sidebar pending-staff badge stale + stale row
StaffShell predated the TanStack Query migration and had a manual `useState` + one-shot
`useEffect` fetch. Yesterday's migration moved the staff-requests page onto `useAdminStaffRequests`
whose mutations + `staff_request:new` socket listener invalidate the shared cache, but StaffShell
wasn't reading from that cache so it never saw the invalidations.

Fix:
- Added `enabled` option + optimistic `onMutate` (remove from cache, snapshot for rollback,
  `onSettled` invalidates) to `useAdminStaffRequests`.
- Replaced StaffShell's manual fetch with the shared hook gated to admin role.

Deliberately did NOT use the `window.dispatchEvent('staff-request-updated')` bridge from the
prompt — the TanStack Query cache is the exact mechanism for cross-component live state and
already exists.

## Files Changed
- `apps/backend/src/services/auth.service.ts` — removed inline `await` on `sendEmail` in `registerStaff`.
- `apps/frontend/src/hooks/admin/useAdminStaffRequests.ts` — added `enabled` option, optimistic mutations.
- `apps/frontend/src/components/layouts/StaffShell.tsx` — consume shared hook; removed local state + fetch.

## Verification
- Backend `npx tsc --noEmit` → 0 errors.
- Frontend `npx tsc --noEmit` → 0 errors.
- Frontend `npm run lint` → 296 problems (baseline; 0 new).

## Next Steps
- Manual browser test of the staff-registration flow (should feel instant now even if SendGrid
  is slow).
- Manual browser test of approve/reject on `/dashboard/admin/staff-requests` — confirm the row
  disappears immediately AND the sidebar badge ticks down in the same frame, across two open
  tabs (one as approver, one watching the badge).
- Follow-up audit not done: other `await sendEmail(...)` call sites in request handlers;
  setting nodemailer `connectionTimeout`/`socketTimeout`.

---

## Previous Task
Data layer — TanStack Query v5 integration for Admin + Cashier (2026-06-02) — COMPLETE.
