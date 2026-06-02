# Bugs

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

## Template

### [BUG-N] Title
- **Status:** active | investigating | resolved
- **Reproduction:** steps to reproduce
- **Root Cause:** (fill when known)
- **Attempted Fixes:** (list what was tried)
- **Edge Cases:** (unresolved edge cases)
