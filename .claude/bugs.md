# Bugs

## [BUG-SLOTS-1] Available slots missing after admin assigns shifts (cache not invalidated)
- **Status:** resolved (2026-06-07)
- **Reproduction:** Admin assigns shifts for a doctor on Day X. Patient queries Day X availability within ~5 min of a previous query (before shift was assigned). Gets empty slots even though shifts are now assigned.
- **Root Cause:** `upsertDoctorSchedule` only invalidated `CACHE_KEYS.DOCTOR_SCHEDULE(doctorId)` (`schedule:doctor:{id}`), never the per-date slot caches (`slots:{doctorId}:{date}`). The "not scheduled on this day" response was cached for 5 min. After the admin added entries, those caches remained stale.
- **Fix:** Added `cache.delPattern(pattern)` to `src/utils/cache.ts` (Redis SCAN-based, non-blocking). Called `cache.delPattern('slots:{doctorId}:*')` in both `upsertDoctorSchedule` and `deleteDoctorScheduleEntry` to flush all per-date slot caches for the affected doctor on any schedule change.
- **Files:** `apps/backend/src/utils/cache.ts`, `apps/backend/src/controllers/admin/doctorScheduleNew.controller.ts`

## [BUG-SLOTS-2] Multi-shift merge silently dropped slots when ShiftDefinition was deleted/orphaned
- **Status:** resolved (2026-06-07)
- **Reproduction:** Doctor assigned to two shifts on Monday. One ShiftDefinition is deleted. The slot endpoint returned only the remaining shift's hours — no error, no warning, silently fewer slots.
- **Root Cause:** The `activeEntries` filter used `e.shift?.is_active !== false` which passes entries with `null` shifts (orphaned refs after populate). The hour-generation loop then hit `if (!shift?.start_time || !shift?.end_time) continue` and skipped them silently. The multi-shift iteration code was already correct (Set-based merge over all `activeEntries`), but orphaned entries contaminated the count while contributing no hours.
- **Fix:** Tightened the filter in `getDoctorAvailability` to require `e.shift != null && e.shift.is_active !== false && e.shift.start_time && e.shift.end_time`. Entries that pass the filter are guaranteed to have valid time data, so the inner `if (!shift...)` guard was removed as redundant. Multiple shifts for the same day are still all iterated and merged via `Set<number>`.
- **Files:** `apps/backend/src/controllers/doctor/index.ts`

## [BUG-AUTH-1] Staff registration "stuck on Submitting…" then jumps to success after ~30s
- **Status:** resolved (2026-06-02)
- **Reproduction:** Submit `/auth/register` (staff tab). Button shows "Submitting…" for tens of seconds, then suddenly transitions to `StaffSuccessScreen`. API does eventually return 2xx — it's slow, not failing.
- **Root Cause:** `authService.registerStaff` (`apps/backend/src/services/auth.service.ts`) awaited `sendEmail(...)` inline before returning. `sendEmail` opens an SMTP connection to `smtp.sendgrid.net:587` via nodemailer with no `connectionTimeout`/`socketTimeout` configured (`apps/backend/src/utils/mailer.ts`). If SendGrid is slow / throttling / API key bad, the HTTP response is held until the SMTP round-trip settles. The frontend `await apiClient.post(...)` was correctly waiting — there was just nothing to wait *for* until the email finished.
- **Misleading symptom:** Looked like the form was "stuck" because the response sometimes took longer than a user expects a click to last. The form was actually working correctly the whole time; the success screen just rendered after the email round-trip.
- **Fix:** Drop the `await` on the `sendEmail` call in `registerStaff` so the email is fire-and-forget, matching the surrounding notification insert + socket emit which are already wrapped as `try/catch { /* non-fatal */ }`. The pre-existing `.catch(() => {})` still swallows rejection. Added a one-line comment explaining the intent so future readers don't "fix" it by re-adding `await`.
- **File:** `apps/backend/src/services/auth.service.ts` (function `registerStaff`)
- **Hypotheses checked and ruled out:** (a) frontend `api.client.ts` response interceptor — identity on 2xx, doesn't throw; (b) backend setting auth cookies for pending staff — verified `registerStaff` returns `{pending, message}` with NO `setAuthCookies` call; (c) `middleware.ts` redirect — `/auth/register` is in `publicPaths`, never read. None matched.
- **Follow-up (not done):** other call sites also `await` `sendEmail` / `sendTemplatedEmail` inside request handlers; consider auditing. Also consider setting `connectionTimeout` + `socketTimeout` on the nodemailer transport so a bad `SENDGRID_API_KEY` fails fast instead of stalling.

## [BUG-ADMIN-2] Pending-staff sidebar badge stale + row stays after approve/reject
- **Status:** resolved (2026-06-02)
- **Reproduction:** (1) Open admin sidebar — pending count badge correct on mount. Approve or reject any pending request on `/dashboard/admin/staff-requests` → badge stays at the old number. (2) Same page: row for the just-approved request stays in the list until manual refresh.
- **Root Cause:** Bug (1) — `StaffShell.tsx` fetched `pendingStaffCount` once on mount via `adminService.getStaffRequests('pending')` + `useState` + `useEffect`, never re-ran. The yesterday's TanStack Query migration moved the staff-requests page onto `useAdminStaffRequests`, whose mutations invalidate `['admin','staff-requests']`, but StaffShell wasn't on the shared cache so it never saw the invalidation. Bug (2) — cache invalidation refetches in the background; the row only disappears after the network RTT, which feels laggy on slow connections.
- **Fix:**
  - `apps/frontend/src/hooks/admin/useAdminStaffRequests.ts` — added `enabled?: boolean` option; added optimistic-update `onMutate` to both `approve` and `reject` (remove the request from every cached staff-requests page; snapshot for rollback in `onError`; `onSettled` re-invalidates to reconcile with server).
  - `apps/frontend/src/components/layouts/StaffShell.tsx` — replaced the local `useState`+`useEffect` fetch with `useAdminStaffRequests('pending', { enabled: user?.role === 'admin' })`. The shared cache + the hook's existing `staff_request:new` socket listener now keep the badge live, and optimistic mutations make both the row AND the badge decrement instantly.
- **Why no window event / parallel fetch:** the prompt suggested a `window.dispatchEvent('staff-request-updated')` bridge; the TanStack Query cache that the page already invalidates is the exact mechanism for cross-component live state, so using it costs zero lines in the page, no new dependencies, and removes the dangling-listener class of bugs entirely.
- **Files:**
  - `apps/frontend/src/hooks/admin/useAdminStaffRequests.ts`
  - `apps/frontend/src/components/layouts/StaffShell.tsx`

## [BUG-PH3-1] Pharmacy delivery socket payload field mismatch (found during Part 3 flow testing)
- **Status:** resolved
- **Reproduction:** Pharmacist updates delivery status → backend emits `pharmacy:delivery:update` with field `status`, but the patient frontend listener reads `data.delivery_status`. Patient order's `delivery_status` became `undefined` and toast showed "Delivery update: undefined".
- **Root Cause:** Field name mismatch between emitter and consumer.
- **Fix:** Renamed backend payload field `status` → `delivery_status` in `updateDeliveryStatus`.
- **File:** `newSiryan_backEnd/src/controllers/pharmacist/index.ts`

## [BUG-PH3-2] Patient pharmacy order never sent delivery_type (found during Part 3 flow testing)
- **Status:** resolved
- **Reproduction:** Patient selects "Home delivery" in CartPanel, but `placeOrder` never included `delivery_type` in the request body → every order defaulted to `pickup` on the backend. Additionally the frontend used `'home'` while the backend zod enum only accepts `'pickup' | 'delivery'`.
- **Root Cause:** `PatientPharmacyOrderDto` lacked `delivery_type`; `placeOrder` omitted it; value naming mismatch (`'home'` vs `'delivery'`).
- **Fix:** Added `delivery_type?` to the DTO; `placeOrder` now maps `'home'`→`'delivery'` and sends it. This makes the home-delivery prior-visit edge case reachable end-to-end.
- **File:** `newSiryan_frontEnd/src/hooks/usePharmacy.ts`, `src/types/index.ts`

## [BUG-1] checkinPatient did not guard status when appointment_id provided
- **Status:** resolved
- **Reproduction:** Receptionist POSTs `/checkin/:patient_id` with an explicit `appointment_id` for a cancelled or already-checked-in appointment — the appointment was found and overwritten.
- **Root Cause:** `Appointment.findOne({ _id, patient })` had no status filter when `appointment_id` was explicitly supplied. The `$in: ['pending', 'confirmed', 'rescheduled']` filter only applied to the auto-selection path.
- **Fix:** Added explicit status guards after the findOne: `if checked_in → 400`, `if cancelled → 400`.
- **File:** `newSiryan_backEnd/src/controllers/receptionist/index.ts` — `checkinPatient`

## [BUG-2] confirmAppointment allowed re-confirming or confirming cancelled appointments
- **Status:** resolved
- **Reproduction:** PATCH `/receptionist/appointments/:id/confirm` on an already-confirmed or cancelled appointment would blindly set status to `confirmed`.
- **Root Cause:** Used `findByIdAndUpdate` with no status pre-check.
- **Fix:** Changed to `findOneAndUpdate` with `{ status: { $nin: ['confirmed', 'cancelled', 'completed', 'checked_in'] } }` filter. On null result, does a secondary lookup to distinguish "not found" from "wrong status" and returns a descriptive 400.
- **File:** `newSiryan_backEnd/src/controllers/receptionist/index.ts` — `confirmAppointment`

## [BUG-3] notifyReceptionists in doctor controller only wrote DB notifications — no real-time push
- **Status:** resolved
- **Reproduction:** Doctor submits cancel/reschedule request — receptionists only saw it after polling (30s) or page refresh.
- **Root Cause:** `notifyReceptionists()` called `Notification.insertMany` but never called `emitToUser`.
- **Fix:** Extended `notifyReceptionists` to accept optional `socketPayload?` and loop `emitToUser` for each receptionist.
- **File:** `newSiryan_backEnd/src/controllers/doctor/index.ts` — `notifyReceptionists`

## [BUG-4] Cashier invoice tab filter uses 'refunded' instead of spec's 'partial'
- **Status:** resolved (2026-05-29)
- **Resolution:** Page 3 rewrite replaced `useCashier`/`InvoiceTable` with `useCashierInvoices` (tabs `all|unpaid|paid|partial`, mapped to backend `partially_paid`) + raw `CashierInvoice` shape. Old files deleted.
- **(original)** active
- **Reproduction:** `/dashboard/cashier/invoices` filter tabs (`InvoiceTabFilter` in `useCashier.ts`) are `'all' | 'unpaid' | 'paid' | 'refunded'`. The backend never emits `refunded` for live invoices (`normalizeInvoice` maps `cancelled → refunded`, `partially_paid → partial`), so the "refunded" tab is effectively dead and there is no "Partial" tab. Part 2 spec (Page 3) requires tabs: All / Unpaid / Paid / Partial.
- **Root Cause:** Tab filter type predates the normalized status mapping.
- **Fix:** Pending — address when building Page 3 (Invoices). Change `InvoiceTabFilter` to include `'partial'` (and decide whether to keep a cancelled/refunded view).
- **File:** `newSiryan_frontEnd/src/hooks/useCashier.ts`, `newSiryan_frontEnd/src/components/staff/cashier/InvoiceTable.tsx`

## [BUG-5] CreateInvoiceModal submits wrong body shape to backend
- **Status:** resolved (2026-05-29, option a)
- **Resolution:** Backend now accepts a `'manual'` source with optional `source_id` (`invoiceItemLineSchema`), and the createInvoice controller skips manual items when flagging source records. Frontend `createInvoice` takes a `CreateInvoiceDto`; `CreateInvoiceModal` rewritten to emit `{ patient_id, items:[{source:'manual', description, category, amount}] }`. Manual invoices now create successfully (status `unpaid`); payment is taken via the payment modal.
- **(original)** active
- **Reproduction:** Open "New invoice" on `/dashboard/cashier` or `/dashboard/cashier/invoices`, fill the form, submit. The modal builds a frontend-shaped `Invoice` (`line_items`, `total_amount`, `payment_status`, …) and POSTs it via `cashierService.createInvoice`, but the backend `createInvoiceSchema` requires `{ patient_id, items: [{ source, source_id, description, category, amount }] }` → 422.
- **Root Cause:** `CreateInvoiceModal` + the typed `cashierService.createInvoice(data: Omit<Invoice,…>)` predate the Part 1 backend rewrite of the createInvoice contract.
- **Fix:** Cannot be fixed frontend-only (discovered 2026-05-29 while building Page 4). The backend `invoiceItemLineSchema` requires every item to have `source` (enum: appointment/pharmacy/lab/radiology/room) **and** a non-empty `source_id` — there is no `other`/`manual` source. A free-form manual line item therefore can't pass validation. Options: (a) backend change — add a `manual`/`other` source and make `source_id` optional; or (b) drop the free-form modal and point Page 1's "New invoice" button at the Pending→Generate flow (`/dashboard/cashier/pending`), which is the system's real invoice-creation path. **Needs a product decision — not changed yet.**
- **File:** `newSiryan_frontEnd/src/components/staff/cashier/CreateInvoiceModal.tsx`, `newSiryan_frontEnd/src/services/cashier.service.ts` (`createInvoice`), `newSiryan_backEnd/src/validations/cashier.validation.ts` (`invoiceItemLineSchema`)

## [BUG-6] Admin revenue card showed 'LBP' while the whole system uses EGP
- **Status:** resolved (2026-05-29)
- **Reproduction:** Admin dashboard "Revenue today" KPI rendered `… + ' LBP'`, but every backend invoice/payment message and notification uses EGP.
- **Root Cause:** Stray currency label in `app/dashboard/admin/page.tsx` (line 20).
- **Fix:** Changed the label to `EGP` (standardized on EGP everywhere). New payment toasts/notifications also use EGP.
- **File:** `newSiryan_frontEnd/src/app/dashboard/admin/page.tsx`

## [NOTE] partialPayInvoice did not notify admins (closed by Part 3 Item 1)
- **Status:** resolved (2026-05-29)
- **Detail:** `partialPayInvoice` created only a patient notification — admins got no socket event or persistent notification for partial payments. Part 3 Item 1 added `notifyAdminsOfPayment(...)` to both `payInvoice` and `partialPayInvoice`.
- **File:** `newSiryan_backEnd/src/controllers/cashier/index.ts`

## [NOTE] normalizeInvoice is lossy for cashier views
- **Status:** documented (intentional workaround in place)
- **Detail:** `normalizeInvoice` (`newSiryan_frontEnd/src/services/patient.service.ts:25`) drops `patient_name`, collapses `mixed → cash`, and maps `cancelled → refunded`. Page 1's "Today's transactions" needs the raw fields, so it consumes `cashierService.getDailyReport()` (raw `DailyReport`) instead. Keep this in mind for Pages 3–5.

---

## [NOTE] Admin Part 6 — useToast mismatch caught and fixed (2026-05-29)
- Initial writes used `{ toast } = useToast()` + `toast({ title, variant: 'destructive' })` pattern (shadcn-style). Actual hook returns `{ showToast }` and takes `showToast(message, variant)` where variant is `'success'|'error'|'info'`. Fixed across all 8 new files before final tsc check.
- `npx tsc --noEmit` — 0 errors in any admin file. Pre-existing errors in radiology/nurse/patient unrelated and untouched.

## [NOTE] Admin Part 5 — No bugs found (2026-05-29)
- `npx tsc --noEmit` passed with 0 errors after all 40 endpoints were added.
- Pre-existing unrelated TS errors in radiology/lab/nurse controllers were not introduced this session.

---

## [BUG-7] Admin schedules page: doctor search broken + grid always empty (2026-05-30)
- **Status:** resolved
- **Reproduction:** Navigate to `/dashboard/admin/schedules` — the weekly grid shows no slots and typing in the doctor search input has no effect.
- **Root Cause (search):** Backend `getAllSchedules` returned `name` field; frontend read `doctor_name` → always `undefined` → filter matched nothing.
- **Root Cause (grid empty):** Backend returned `blocked_slots` array; frontend read `slots` → always `undefined` → `slotsByDay` received `undefined`.
- **Root Cause (no appointments):** Backend only returned blocked slots (from `BlockedSlot` model); actual appointments were never fetched, so `type:'booked'` slots never appeared.
- **Fix:** Rewrote `getAllSchedules` in `controllers/admin/index.ts` to: return `doctor_name` (not `name`), return `slots` (not `blocked_slots`), fetch current-week appointments alongside blocked slots and merge into a single `slots[]` array with `type:'booked'`/`'blocked'`, `time_slot`, and `patient_name`.
- **Files:** `newSiryan_backEnd/src/controllers/admin/index.ts` — `getAllSchedules`

## [BUG-8] Announcements: socket payload missing fields → date shows "—", roles empty, is_urgent wrong (2026-05-30)
- **Status:** resolved
- **Reproduction:** Create an announcement — the card that appears in real-time shows `—` for date, no role badges, and never shows URGENT styling even when urgent is checked.
- **Root Cause:** Backend emitted only `{id, title, message, priority}` — missing `_id` (normalization key), `createdAt`, `target_roles`, `is_urgent`, `created_by`.
- **Fix:** Extended `createAnnouncement` socket emit to include all required fields. Frontend socket handler also normalizes `raw._id ?? raw.id`.
- **Files:** `newSiryan_backEnd/src/controllers/admin/index.ts` — `createAnnouncement`

## [BUG-9] Announcements: duplicate entries after creating (2026-05-30)
- **Status:** resolved
- **Reproduction:** Create an announcement — it appears twice in the list with a React duplicate-key warning.
- **Root Cause:** Race condition — backend emits `announcement:new` before the HTTP response resolves. Both `handleCreate` and the socket handler add the item to state independently (each seeing a `prev` without the item yet).
- **Fix:** Dedup guard added to both state updaters: `if (prev.some(a => a.id === data.id)) return prev`. Socket handler normalizes `_id` to `id` first so the comparison works.
- **Files:** `newSiryan_frontEnd/src/app/dashboard/admin/announcements/page.tsx`

## [BUG-10] useSocketEvent re-registered on every render causing missed events (2026-05-30)
- **Status:** resolved
- **Reproduction:** Any state update in a component using `useSocketEvent` caused the listener to be removed and re-added, creating a brief window where events could be missed.
- **Root Cause:** `useEffect` deps included `handler` (inline function — new reference each render), so the effect ran on every render.
- **Fix:** Handler stored in `handlerRef.current` (updated each render without triggering the effect); effect deps changed to `[event]` only. Stable listener, always calls the latest handler.
- **Files:** `newSiryan_frontEnd/src/hooks/useSocketEvent.ts`

## [BUG-11] Occupancy report type mismatch — all KPI cards blank, rate shows NaN% (2026-05-30)
- **Status:** resolved
- **Reproduction:** Navigate to Reports → Occupancy tab — all four KPI cards are empty and Occupancy Rate shows "NaN%".
- **Root Cause:** Complete field name mismatch between backend response and frontend type. Backend returns `overall.total_capacity`, `overall.occupancy_pct`, `by_type` as Record<string,{...}>; frontend type declared `total_rooms`, `occupancy_rate`, `by_type` as array.
- **Fix:** `OccupancyReport` and `OccupancyRoomDetail` types rewritten to match actual backend shape. Reports page occupancy section rewritten to use `occupancy.overall.*`, `Object.entries(occupancy.by_type)`, and correct room field names.
- **Files:** `newSiryan_frontEnd/src/types/index.ts`, `newSiryan_frontEnd/src/app/dashboard/admin/reports/page.tsx`

---

## Route-Diff Script Findings (2026-06-02) — run `npm run audit:routes` to refresh

### ❌ Real mismatches (FE calls BE doesn't define)

| # | Method | FE path | Notes |
|---|--------|---------|-------|
| RD-1 | GET | `/api/cashier/stats/daily` | FE calls wrong path — BE has `GET /cashier/reports/daily` (different path + richer shape) |
| RD-2 | GET | `/api/nurse/patients/:id/vitals` | BE only has `POST /nurse/patients/:id/vitals` (add vitals); no GET for reading patient vitals |
| RD-3 | POST | `/api/receptionist/appointments` | No BE route — receptionist creates appointments through a different flow |
| RD-4 | POST | `/api/receptionist/patients` | No BE route — patient creation not implemented for receptionist role |
| RD-5 | DELETE | `/api/patient/rooms/bookings/:id` | No BE route — patient room booking cancellation not implemented |
| RD-6 | GET | `/api/lab/orders/:id` | No BE route for single lab order by ID (only list + status update) |
| RD-7 | GET | `/api/radiology/orders/:id` | No BE route for single radiology order by ID |
| RD-8 | POST | `/api/pharmacy/prescriptions/:id/verify` | No BE route — prescription verify endpoint missing |
| RD-9 | POST | `/api/pharmacy/prescriptions/:id/reject` | No BE route — prescription reject endpoint missing |

### ⚠️ Known script limitations (false positives)
- `GET/PUT /api/:param/profile` (staff.service.ts) — dynamic `/${role}/profile` pattern; BE has per-role routes
- `PATCH /api/admin/deletion-requests/:param/:param` — script can't match `${action}` ('approve'|'reject') against literal BE path segments `/approve` and `/reject`; this IS correctly wired at runtime

---

## [BUG-CONTRACT-1] getShifts / getTodayShifts always returned empty array
- **Status:** resolved (2026-06-02)
- **Reproduction:** Navigate to `/dashboard/admin/shifts` — shift list is always empty even though shifts exist in the DB.
- **Root Cause:** Backend `getShifts` and `getTodayShifts` (`apps/backend/src/controllers/admin/index.ts` lines 1264, 1357) group shifts by department and return `{ shifts: Record<dept, Shift[]>, total }`. Frontend did `Array.isArray(res.data.data) ? res.data.data : []` — an object is never an array, so the fallback always triggered and returned `[]`.
- **Fix:** Changed both methods to flatten the grouped object: `Object.values(raw.shifts ?? {}).flat()`. Backward-compatible (still handles bare-array case).
- **File:** `apps/frontend/src/services/admin.service.ts` (`getShifts` line 213, `getTodayShifts` line 219)

## [BUG-CONTRACT-2] getDepartmentStaff threw TypeError when staff existed
- **Status:** resolved (2026-06-02)
- **Reproduction:** Navigate to `/dashboard/admin/departments/:id/staff` — TypeError in console.
- **Root Cause:** Backend returns `{ department: string, staff: Record<role, Profile[]> }` (grouped by role). Frontend did `res.data.data?.staff.map(...)` — `.map()` does not exist on a plain object.
- **Fix:** Changed to `Object.values(raw.staff ?? {}).flat()` to produce a flat array before mapping.
- **File:** `apps/frontend/src/services/admin.service.ts` (`getDepartmentStaff` line 340)

## [BUG-CONTRACT-3] processDeletionRequest sent PATCH to non-existent route (404)
- **Status:** resolved (2026-06-02)
- **Reproduction:** Admin approves or rejects a GDPR deletion request → 404 network error.
- **Root Cause:** Frontend called `PATCH /admin/deletion-requests/:id` with `{ action }` body. Backend has no such route — it has separate `PATCH /deletion-requests/:id/approve` and `PATCH /deletion-requests/:id/reject` endpoints (admin.routes.ts lines 136–137).
- **Fix:** Changed URL to `/admin/deletion-requests/${id}/${action}`. Return type changed from `Promise<DeletionRequest>` to `Promise<void>` (both BE handlers return `null`).
- **File:** `apps/frontend/src/services/admin.service.ts` (`processDeletionRequest` line 332)

---

## [BUG-PATIENT-1] Home page: "Invalid Date" in Recent Activity + hardcoded doctor name
- **Status:** resolved (2026-06-02)
- **Reproduction:** Patient home page Recent Activity timestamps showed "Invalid Date". HeroCard always showed "your doctor" instead of the actual doctor's name.
- **Root Cause:** Mongoose lean returns `updatedAt` (camelCase), but the page read `a.updated_at` (snake_case). Doctor name was hardcoded as the string literal `'your doctor'` instead of reading from `upcoming[0].doctor_name`.
- **Fix:** `new Date(a.updatedAt ?? a.updated_at)` + `upcoming[0].doctor_name ?? ... ?? 'your doctor'`.
- **File:** `apps/frontend/src/app/dashboard/patient/page.tsx`

## [BUG-PATIENT-2] Requests page: scheduled labs/imaging appeared in "pending" counts
- **Status:** resolved (2026-06-02)
- **Reproduction:** A lab order with `status='scheduled'` and a non-null `scheduled_at` would show up in the "pending" badge count on the Requests page.
- **Root Cause:** Filter was `l.status === 'pending' || !(l as any).scheduled_at` — the second condition was always truthy for fresh orders (before the patient had set a date), making it include scheduled items.
- **Fix:** Removed the `|| !(l as any).scheduled_at` clause from both `pendingLabs` and `pendingImaging` filters.
- **File:** `apps/frontend/src/hooks/patient/usePatientRequests.ts`

## [BUG-PATIENT-3] Join Call button: always disabled (video calls marked "coming soon")
- **Status:** resolved (2026-06-02)
- **Reproduction:** Confirmed, paid online appointment showed a permanently-disabled "Video calls coming soon" button.
- **Fix:** Replaced with a 5-minute window gate (same `VIDEO_WINDOW_MS = 5 * 60 * 1000` pattern as QueueItem.tsx). Within window → active Link to `/appointments/online/:id`. Before window → disabled button with tooltip "Available 5 minutes before your appointment".
- **File:** `apps/frontend/src/app/dashboard/patient/appointments/page.tsx`

## [BUG-PATIENT-4] Pay page + online waiting room: fetched ALL appointments to find one
- **Status:** resolved (2026-06-02)
- **Reproduction:** `/appointments/:id/pay` and `/appointments/online/:id` called `getAppointments()` (fetches full list) then filtered by id — wasteful and broke if list was large.
- **Fix:** Added `GET /patient/appointments/:id` backend route with ownership check. Added `patientService.getAppointment(id)` frontend method. Both pages now call the single-item endpoint directly.
- **Files:** `apps/backend/src/controllers/patient/index.ts`, `apps/backend/src/routes/patient.routes.ts`, `apps/frontend/src/services/patient.service.ts`, pay page, online page

## [BUG-BOOKING-1] Hardcoded department list + department not filtering doctors
- **Status:** resolved (2026-06-02)
- **Root Cause (a):** `useBooking` initialised `department: 'Cardiology'` and `ReasonStep` had a hardcoded 15-item `DEPARTMENTS` array — out of sync with the backend `Department` collection.
- **Root Cause (b):** `GET /doctor/list` was called without any `?department=` param, so step 2 always showed all doctors regardless of what was selected in step 1.
- **Fix:** Added `GET /patient/departments` backend route (reuses admin `getDepartments` controller). `patientService.getDepartments()` + TanStack Query in `useBooking` replaces the hardcoded list. `getDoctorList` now accepts `?department` filter. Doctor fetch passes the current department; changing department clears `doctorId` and re-fetches.
- **Files:** `apps/backend/src/routes/patient.routes.ts`, `apps/backend/src/controllers/doctor/index.ts`, `apps/frontend/src/services/patient.service.ts`, `apps/frontend/src/hooks/shared/useBooking.ts`, `apps/frontend/src/components/patient/ReasonStep.tsx`

## [BUG-BOOKING-2] Duplicate specialization filter bar (nested identical divs)
- **Status:** resolved (2026-06-02)
- **Root Cause:** `DoctorStep.tsx` had the entire scrollable filter bar copy-pasted inside itself — outer div + inner div with identical className and `onWheel` handler. `onWheel` fired twice (bubbled inner → outer).
- **Fix:** Extracted filter bar into `DoctorFilterBar` component with a single scroll container. `DoctorStep` now imports `<DoctorFilterBar>`.
- **Files:** `apps/frontend/src/components/patient/DoctorFilterBar.tsx` (new), `apps/frontend/src/components/patient/DoctorStep.tsx`

## [BUG-BOOKING-3] reason fallback incorrectly sent department name as visit reason
- **Status:** resolved (2026-06-02)
- **Root Cause:** `submitBooking` in `useBooking` sent `reason: formData.notes || formData.department` — if notes were empty, "Cardiology" would be submitted as the visit reason.
- **Fix:** Changed to `reason: formData.notes || ''`.
- **File:** `apps/frontend/src/hooks/shared/useBooking.ts`

## [BUG-PATIENT-5] FALLBACK_DOCTORS ghost doctor selectable when /doctor/list fails
- **Status:** resolved (2026-06-02)
- **Reproduction:** If `GET /doctor/list` failed, booking step 2 showed "Dr. Sarah Hassan (Cardiologist)" as a fake fallback doctor. Selecting her and confirming would pass the `doctorId === 'fallback'` guard (with a toast), but the booking step was confusing.
- **Fix:** Removed `FALLBACK_DOCTORS`. On fetch error → empty list + `doctorsError=true`. DoctorStep shows "Unable to load doctors" + Retry button. Next button disabled when list is empty.
- **Files:** `apps/frontend/src/hooks/shared/useBooking.ts`, `apps/frontend/src/components/patient/DoctorStep.tsx`, `apps/frontend/src/app/dashboard/patient/appointments/new/page.tsx`

## [BUG-DR-RATINGS] GET /doctor/me/ratings → 500 (route shadowing)
- **Status:** resolved (2026-06-03, found during full integration sweep)
- **Reproduction:** Log in as a doctor, GET `/api/doctor/me/ratings` → 500 `{"message":"input must be a 24 character hex string, 12 byte Uint8Array, or an integer"}`. The doctor "My ratings" page crashes on load.
- **Root Cause:** Route ordering. `router.get("/:id/ratings", …)` (the public `getDoctorPublicRatings`, line ~65) is registered **before** `router.get("/me/ratings", getMyRatings)` (line ~104). Express matches in order, so `/doctor/me/ratings` is captured by `/:id/ratings` with `id="me"`, and `getDoctorPublicRatings` runs `new mongoose.Types.ObjectId("me")` → throws. `getMyRatings` was never reached.
- **Fix:** Registered `/me/ratings` with its full middleware chain (`authenticate, requireCompleteProfile, authorize("doctor")`) **above** the `/:id/...` wildcard routes, and removed the now-dead later registration.
- **File:** `apps/backend/src/routes/doctor.routes.ts`
- **Verify:** `/doctor/me/ratings` → 200 `{avg,count,recent}`; `/doctor/<realId>/ratings` still 200.

## [BUG-RECEP-APPTS-NULL] GET /receptionist/appointments → 500 on orphaned appointment
- **Status:** resolved (2026-06-03, found during full integration sweep)
- **Reproduction:** Log in as receptionist, GET `/api/receptionist/appointments` → 500 `{"message":"Cannot read properties of null (reading 'toString')"}`. The receptionist appointments page (a core page) fails to load whenever the DB contains an appointment whose `patient` or `doctor` ref points at a deleted user.
- **Root Cause:** `getAllAppointments` did `(a.patient as any)?._id?.toString() ?? a.patient.toString()`. After `.populate`, a ref to a deleted user resolves to `null`, so the `??` fallback calls `null.toString()`. Same latent risk in the `doctor` field. (Triggered here by a pre-existing orphaned appointment in the shared `siryandev` cluster.)
- **Fix:** Added a null-safe `refId(ref)` helper, filtered nulls out of the id list passed to `buildProfileMap`, and guarded the name lookups. Orphaned appointments now render with empty patient/doctor names instead of crashing the whole list.
- **File:** `apps/backend/src/controllers/receptionist/index.ts` (`getAllAppointments`)
- **Note:** The same `?? ref.toString()` pattern repeats in `confirmAppointment`/`cancelAppointment`/etc. on a single found appointment — lower risk (the acted-on appointment is rarely orphaned) but worth an eventual audit. See [TODO].

## [BUG-MAIL-AWAIT] Admin approve/create-staff hang ~30–120s on SMTP (await sendEmail)
- **Status:** resolved (2026-06-03, found during full integration sweep — same class as [BUG-AUTH-1])
- **Reproduction:** As admin, `POST /admin/users` (create staff) or `PATCH /admin/staff-requests/:id/approve`. The DB write succeeds immediately but the HTTP response hangs until the SendGrid SMTP round-trip times out (~2 min with the default/invalid key), making the admin UI appear frozen.
- **Root Cause:** Both handlers `await sendEmail(...)` inline, and `mailer.ts` set **no** `connectionTimeout`/`socketTimeout` on the nodemailer transport (the exact follow-up flagged under [BUG-AUTH-1]). `getMyRatings`-style endpoints were fine; only the email-sending handlers stalled.
- **Fix (two parts):**
  1. `apps/backend/src/utils/mailer.ts` — added `connectionTimeout`/`greetingTimeout`/`socketTimeout` = 7000ms so any `sendEmail` call site fails fast instead of holding the response ~2 min.
  2. `apps/backend/src/controllers/admin/index.ts` — made the `sendEmail` calls in `createStaff` and `approveStaff` fire-and-forget (`.catch(...)`), matching the earlier `registerStaff` fix. Both already write the user/notification before the email.
- **Verify:** `POST /admin/users` with a fresh email now returns **201 in 0s**; staff approval returns immediately.

## [BUG-RT-NOTIFYROLES] Staff notifications via notifyRoles are DB-only (no real-time socket) — NON-BLOCKING
- **Status:** open (documented 2026-06-03)
- **Reproduction:** Doctor creates a prescription / lab order / radiology order. The pharmacist / lab_technician / radiology_technician get the DB notification (visible on next poll or refresh) but **no live socket push** — so it appears only after the `useNotifications` 30s `refetchInterval`, not instantly.
- **Root Cause:** `notifyRoles()` in `apps/backend/src/controllers/doctor/index.ts` (line ~40) only does `Notification.insertMany` — it never calls `emitToUser`/`emitToRole`. This is the same shape as the resolved [BUG-3] (`notifyReceptionists`), which was extended to emit sockets; `notifyRoles` was not.
- **Impact:** Non-blocking — notifications still arrive within 30s and on page load. Real-time toast/badge is just delayed for these specific staff events.
- **Suggested fix:** Extend `notifyRoles` to accept an optional socket payload and loop `emitToUser(u._id, 'notification:new', …)` like `notifyReceptionists` does.

## [BUG-RT-PRESC-PATIENT] Prescription creation doesn't push patient socket notification — NON-BLOCKING
- **Status:** open (documented 2026-06-03)
- **Reproduction:** Doctor creates a prescription. The patient's `Notification` doc is created (`'New prescription'`) but `createPrescription` does **not** `emitToUser(patientId, 'notification:new', …)`. By contrast `createLabOrder`/`createRadiologyOrder` (same file) DO emit `lab:order:created`/`radiology:order:created` to the patient.
- **Impact:** Non-blocking — patient sees the prescription notification within 30s (TanStack refetch) / on load, just not as a live push.
- **File:** `apps/backend/src/controllers/doctor/index.ts` (`createPrescription`, ~line 459–475).

## [BUG-SEC-STAFFREQ] Admin staff-requests response leaks bcrypt password hash — NON-BLOCKING
- **Status:** open (documented 2026-06-03)
- **Reproduction:** `GET /api/admin/staff-requests?status=pending` returns each user object **including** the `password` field (bcrypt hash). Pending staff users are returned without a `-password` projection.
- **Impact:** Non-blocking for functionality but a security hygiene issue — password hashes should never leave the backend. (The `User` model strips `password` in its `toJSON`, but this endpoint appears to return lean/raw docs that bypass that transform.)
- **File:** `apps/backend/src/controllers/admin/index.ts` (`getStaffRequests`) — add `.select('-password')` (and to the populated profile if needed).

## [BUG-AUTH-LOGOUT-STATELESS] Logout does not invalidate the access token — INFO / BY-DESIGN
- **Status:** open / by-design note (documented 2026-06-03)
- **Observation:** `POST /auth/logout` clears cookies and blacklists the **refresh** token (verified: refresh reuse after logout → 401), but the 15-min **access** token remains valid until expiry (it is a stateless JWT and is not blacklisted). Replaying a captured access token after logout still returns 200.
- **Impact:** Standard stateless-JWT trade-off; acceptable for most apps given the 15-min TTL. Documented so it's a conscious decision. If stricter logout is required, blacklist the access token's jti on logout and check it in `authenticate`.

## [UI-C1] nurse/alerts was a static mockup, not wired to the backend
- **Status:** resolved (2026-06-03, Emergency Flag Part 2)
- **Reproduction:** `/dashboard/nurse/alerts` showed hardcoded fake patients/vitals/KPIs; Filter / Raise / View buttons had no handlers; empty state was unreachable.
- **Fix:** Rewrote the page to drive from `useNurseAlerts()` (real `GET /nurse/emergency-flags` + kpis). Filter pills wired to `statusFilter`; "Raise new flag" opens the reused `EmergencyFlagModal` after a patient `<select>`; removed all fake data; loading/empty/error states added. Added a doctor-side `ActiveAlertsCard` for acknowledge/resolve.
- **Files:** `apps/frontend/src/app/dashboard/nurse/alerts/page.tsx`, `hooks/nurse/useNurseAlerts.ts`, `hooks/doctor/useDoctorEmergencyFlags.ts`, `components/doctor/ActiveAlertsCard.tsx`, `services/{nurse,doctor}.service.ts`.

## [UI-C2] Skeleton component didn't adapt to dark mode (used app-wide)
- **Status:** resolved (2026-06-03)
- **Root Cause:** `components/ui/Skeleton.tsx` used fixed light `bg-[var(--sand-200)] opacity-50` → pale blob on dark surfaces.
- **Fix:** Replaced with `bg-[var(--bg-sunken)] animate-pulse` (theme-flipping token + shimmer).
- **File:** `apps/frontend/src/components/ui/Skeleton.tsx`

## [UI-C3] Badge neutral variant was light in dark mode (23+ usages)
- **Status:** resolved (2026-06-03)
- **Root Cause:** `Badge.tsx` neutral variant used raw `bg-[var(--sand-100)]`, bypassing the `.dark .chip-neut` override.
- **Fix:** Added `--neutral-soft-bg` / `--neutral-soft-fg` tokens to `tokens.css` (`:root` + `.dark`, mirroring the chip-neut dark values) and pointed the Badge neutral variant at them. Propagates to all usages.
- **Files:** `apps/frontend/src/styles/tokens.css`, `apps/frontend/src/components/ui/Badge.tsx`

## [UI-C4] Hover states flashed light in dark mode (tables + secondary/ghost buttons)
- **Status:** resolved (2026-06-03)
- **Root Cause:** `.tbl tr:hover td`, `.btn-secondary:hover`, `.btn-ghost:hover` and the React Button secondary/ghost hovers used fixed `--sand-50`/`--sand-100`; a `.dark .btn-ghost:hover { color: black }` hack patched only one case.
- **Fix:** Pointed all four hovers at `--bg-sunken` (theme-flipping) and deleted the dark ghost-hover color-black hack.
- **Files:** `apps/frontend/src/styles/kit.css`, `apps/frontend/src/components/ui/button.tsx`

## [SEC-ROOT-1] Root admin account had no protection against modification by other admins
- **Status:** resolved (2026-06-07)
- **Root Cause:** No field on the User model distinguished the root admin from regular admins. Admin routes (`PATCH /users/:id/role`, `PATCH /users/:id/activate`, `PATCH /users/:id/profile`, `DELETE /users/:id`, `PUT /staff/:id/department`) applied only the generic self-action guard (`req.params.id === req.user.id`), leaving the root account editable/deletable by any other admin.
- **Fix:** Added `isRootAdmin: Boolean (default false)` to the User model. Created `middlewares/protectRootAdmin.ts` which looks up the target user and returns 403 if `isRootAdmin` is true. Middleware is inserted before the controller on all five user-mutation routes in `admin.routes.ts`. The flag is never exposed in registration or create-staff flows — it must be set directly in the DB (or a seed script).
- **Files:** `apps/backend/src/models/User.ts`, `apps/backend/src/middlewares/protectRootAdmin.ts`, `apps/backend/src/routes/admin.routes.ts`

## Template

### [BUG-N] Title
- **Status:** active | investigating | resolved
- **Reproduction:** steps to reproduce
- **Root Cause:** (fill when known)
- **Attempted Fixes:** (list what was tried)
- **Edge Cases:** (unresolved edge cases)
