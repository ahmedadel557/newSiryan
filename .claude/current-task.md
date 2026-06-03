# Current Task

## Task
UI Polish — Part 1: foundational design-system unification I1/I2/I3/I5 (2026-06-03).

## Status
COMPLETE. Next = UI Polish Part 2 (remaining audit items: I4 ConfirmDialog rollout, I6 dead buttons,
I7 settings de-dupe, I8 table overflow wrappers).

## What was done
Unified the four foundational design-system inconsistencies from the UI audit.

- **I1 — shared status→variant map.** New `src/lib/statusBadge.ts` exporting `statusVariant` (one
  canonical status→`BadgeVariant` map covering appointment / order / payment / room / warehouse /
  pharmacy / emergency / user statuses) + `getStatusVariant(status)` (lowercases, falls back to
  `'neutral'`). Exported a `BadgeVariant` type from `components/ui/Badge.tsx`. Removed the ~28 inline
  status→variant maps/functions across receptionist/doctor/patient/admin/cashier/inventory/lab/
  radiology/pharmacist files and routed every status `<Badge>` through `getStatusVariant`. **`cancelled`
  is now `neutral` everywhere** (was `critical` in ~14 files, `neutral` in others). Label maps were
  preserved per file. Left alone: `NursePatientTable` (derived mock VitalsStatus, not a backend status),
  `InventoryTable.statusVariant(item)` (computed from quantity thresholds), priority/payment-method/
  type maps (not statuses), and KPI `tone` props (metric colors, e.g. admin/appointments cancelled-count).
- **I2 — single badge system.** Replaced every `chip chip-*` usage in components with `<Badge>` (pharmacist
  cards/lists/modals, cashier TodaysTransactions, pharmacist medications page, landing RolesSection).
  Status-bearing chips route through `getStatusVariant`; the rest map directly to a `BadgeVariant`.
  The `chip-*` classes remain defined in `kit.css` (per constraint) but are no longer used by any component.
- **I3 — one destructive button.** `.btn-danger` (kit.css) + `<Button variant="danger">` (button.tsx) are
  now solid `var(--critical)` / white with `brightness(0.92)` hover + disabled state. Replaced the inline
  `style={{ background: 'var(--critical)', color: '#fff' }}` destructive buttons (ConfirmDialog, 3
  pharmacist modals, EmergencyFlagModal, admin announcements/appointments/settings/shifts/users[id],
  nurse/patients[id]) with `btn-danger`. Left: `StaffShell` "Urgent" badge (a label, not a button) and
  `admin/compliance` conditional approve/reject confirm.
- **I5 — `--warning` token.** Added `--warning: var(--caution)` alias to `tokens.css`; replaced the
  password-strength `colors` arrays in `settings/page.tsx` + `patient/settings/page.tsx` with
  `['var(--critical)','var(--caution)','var(--positive)','var(--brand)']` (removed hardcoded `#f59e0b`/`#84cc16`).

## Verification
- `npx tsc --noEmit` (frontend) → 0 errors.
- `grep '#84cc16'` → 0. `grep "cancelled.*critical"` → 1 (a KPI `tone`, not a status badge — left).
  `grep "style.*var(--critical)"` → remaining hits are legitimate red icon/text colors, soft backgrounds,
  and non-button badges; the only solid destructive button pattern left is the StaffShell urgent badge.

---

## Previous Task

## Task
Emergency Flag System — Part 2: Frontend wiring + dark-mode fixes C2/C3/C4 (2026-06-03).

## Status
COMPLETE.

## What was done
Wired the previously-static `nurse/alerts` page to real data, added a doctor-side actionable
"Active Alerts" section, and fixed the 3 systemic dark-mode bugs at their source.

- **Types** (`types/index.ts`): `VitalsSnapshot`, `EmergencyFlag`, `EmergencyFlagKPIs`. Shape matches
  the **real** backend response (flat `patient_name`/`doctor_name`/`nurse_name` strings, refs as id
  strings, `createdAt`) — *not* the nested objects the Part-2 prompt assumed. Services normalize
  `createdAt → created_at`.
- **queryKeys**: `nurseEmergencyFlags(status?)`, `doctorEmergencyFlags()`.
- **Services**: `nurseService.getEmergencyFlags(status?)`; `doctorService.getDoctorEmergencyFlags`,
  `acknowledgeFlag`, `resolveFlag`.
- **Hooks**: `useNurseAlerts` (status filter + socket-invalidate on `emergency:acknowledged`/`:resolved`),
  `useDoctorEmergencyFlags` (ack/resolve mutations + socket-invalidate on `emergency:flag`). Both follow
  the `useDoctorQueue` TanStack pattern.
- **Nurse alerts page** rewritten: KPI strip (total/active/acknowledged/avg-response), filter pills,
  real flag list with severity/status badges + vitals summary + relative times, loading/empty/error
  states, and "Raise new flag" via a patient `<select>` → reused `EmergencyFlagModal`.
- **Doctor overview**: new `components/doctor/ActiveAlertsCard.tsx` rendered below the KPI strip;
  acknowledge + inline-notes resolve; renders nothing when no active flags; max 5 shown + "+N more".
- **Dark mode (C2/C3/C4)**: `Skeleton` → `--bg-sunken` + `animate-pulse`; new `--neutral-soft-bg/-fg`
  tokens (light + `.dark`) used by `Badge` neutral variant; table-row + secondary/ghost button hovers
  → `--bg-sunken`; removed the `.dark .btn-ghost:hover { color: black }` hack.
  > Note: the prompt named `--surface-raised`/`--surface-overlay` — these don't exist; used real tokens.

## Verification
- `npx tsc --noEmit` (frontend) → 0 errors.
- `npm run audit:routes` → all 4 emergency-flag routes in ✅ MATCHED; FE-call-with-no-BE-route = 0.

---

## Previous Task

## Task
Emergency Flag System — Part 1: Backend persistence + lifecycle (2026-06-03).

## Status
COMPLETE.

## What was done
Built the persistence/read/lifecycle backend so emergency flags are real records (the
`nurse/alerts` page was previously a static mockup with no backend support).

- **NEW model** `models/EmergencyFlag.ts` — snake_case (`patient`/`nurse`/`doctor` refs,
  `vitals_snapshot` subdoc, `acknowledged_at`/`resolved_at`), `status` enum
  `notified|acknowledged|resolved`, `toJSON` (_id→id), indexes `{nurse,createdAt}` /
  `{doctor,status}`. Registered in `models/index.ts`.
- **`emergencyFlag`** (`controllers/nurse/index.ts`) now persists an `EmergencyFlag` +
  snapshots the patient's latest vitals from `MedicalRecord.vital_signs` (optional — flag
  still creates if none), adds `flag_id` to the `emergency:flag` socket payload, returns
  `{ flag }` 201. Existing doctor Notification + sockets preserved.
- **NEW `getNurseEmergencyFlags`** — list own flags (optional `?status=`) + `kpis`
  (total/active/acknowledged/resolved/avg_response_minutes); names resolved via `Profile`.
- **NEW `controllers/doctor/emergencyFlags.controller.ts`** — `getDoctorEmergencyFlags`
  (non-resolved, severity-sorted), `acknowledgeFlag` (ownership 403 + status 400 guards),
  `resolveFlag` (optional notes); both emit `emergency:acknowledged`/`emergency:resolved`
  to the nurse.
- Validations: nurse `emergencyFlagSchema` + `notes`; doctor `resolveEmergencyFlagSchema`.
- Routes: `GET /nurse/emergency-flags`; `GET /doctor/emergency-flags`,
  `PATCH /doctor/emergency-flags/:flagId/{acknowledge,resolve}` (literal path placed before
  `/:id` wildcards to avoid the shadowing class fixed for `/me/ratings`).
- Backend types: `EmergencyFlag` + `VitalsSnapshot` + `PopulatedUserRef` in `types/index.ts`.

### Corrections applied vs the Part-1 prompt
- `VitalSign.ts` is an empty stub — vitals read from `MedicalRecord.vital_signs` instead.
- snake_case (not the prompt's camelCase) to match every other model.
- Names resolved via `Profile` (not `populate` on `User`).
- Logic kept controller-resident (no service layer) to match existing nurse/doctor code.

## Verification
- `npx tsc --noEmit` → 0 errors.
- `npm run audit:routes` → ❌ FE-call-with-no-BE-route = **0**; 4 new routes listed as
  backend-only (expected until Part 2); 249 matched.
- Live lifecycle smoke (localhost:5000): nurse raise → 201 w/ vitals_snapshot;
  doctor list → 200; wrong-doctor ack → 403; ack → 200; re-ack → 400; resolve → 200;
  nurse `?status=resolved` → flag + kpis. ✅

## Next Steps (Part 2 — frontend)
- `nurseService`/`doctorService` methods + query keys; `useNurse`/doctor hooks.
- Replace hardcoded `flags` in `app/dashboard/nurse/alerts/page.tsx`; wire Filter / Raise /
  View; doctor acknowledge/resolve UI; `EmergencyAlertBanner` socket listeners
  (`emergency:acknowledged`/`emergency:resolved`).

---

## Previous Task
Full Integration Test Sweep — all 10 roles, API-level (2026-06-03). COMPLETE.

## What was done
First live end-to-end smoke test of every role against backend `:5000` (shared `siryandev`
Atlas). Method: API-level curl + token-replay (cookies are `Secure`, so the `access_token`
is captured from the login `Set-Cookie` and replayed via a `Cookie:` header) + static code
audit. Rate limiters are bypassed for localhost in dev, so HTTP login/register were unlimited.

Seeded test users (namespaced for cleanup — `*@siryan.test`, `ZZTest*`):
- patient@siryan.test / Test1234!  · patient2@siryan.test / Test1234! (recep-registered)
- nurse|receptionist|pharmacist|lab_technician|radiology_technician|cashier @siryan.test / Test@1234
  (self-registered → admin-approved)
- (pre-seeded) admin@test.com / Admin@123 · inventoryM@test.com / Inventory@123 ·
  dr.sarah@siryan.com / Doctor@123 (+7 other dr.*@siryan.com / Doctor@123)

Result: every role's core flow passes. 3 blocking bugs found + fixed inline; 4 non-blocking
documented. See changelog 2026-06-03 + bugs.md for detail.

### Blocking bugs fixed (verified 2xx after fix; tsc 0 errors; audit:routes 0 unmatched)
- [BUG-DR-RATINGS] `/doctor/me/ratings` 500 → route shadowing by `/:id/ratings`. Fixed in `doctor.routes.ts`.
- [BUG-RECEP-APPTS-NULL] `/receptionist/appointments` 500 on orphaned appt. Null-guarded `getAllAppointments`.
- [BUG-MAIL-AWAIT] admin create/approve-staff hung ~2 min on SMTP. Added mailer timeouts + fire-and-forget.

### Non-blocking (documented in bugs.md, not fixed)
[BUG-RT-NOTIFYROLES], [BUG-RT-PRESC-PATIENT], [BUG-SEC-STAFFREQ], [BUG-AUTH-LOGOUT-STATELESS].

## Remaining / next steps
- Apply the 4 documented non-blocking fixes (see todos.md).
- Browser/E2E pass still outstanding (this sweep was API-level only): Socket.io live
  toasts, Stream video call join (needs the 5-min window + Chat product enabled).
- Clean up test data when done: users `*@siryan.test`, records prefixed `ZZTest`.

---

## Previous Task
Patient System Fixes — Part 2 (2026-06-02): Book Appointment Improvements. COMPLETE.

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
