# Current Task

## Task
Pharmacy Module Part 3 — Real-time & Edge Cases (2026-05-30)

## Status
ALL PARTS COMPLETE.

## Completed This Session

### Pharmacy Part 3 — Real-time & Edge Cases

**Backend:**
- [x] `sendLowStockAlerts()` now also notifies pharmacists (emitToRole + Notification.insertMany per pharmacist)
- [x] `approvePharmacyOrder` + `approvePrescriptionOrder`: home delivery prior visit guard — checks `Appointment.countDocuments({ patient, status:'completed' }) > 0`, returns 400 if no prior visit
- [x] `approvePharmacyOrder` + `approvePrescriptionOrder`: emit `pharmacy:order:approved` + Notification per admin after approval
- [x] `approveRefillRequest`: max_refills check — counts approved RefillRequests for the prescription; blocks if `approvedCount >= prescription.max_refills`
- [x] `Prescription` model: added optional `max_refills?: number` field
- [x] `pharmacyExpiry.job.ts`: each expiry item now has `urgent: boolean` (≤7 days = true); urgent items also emit separate `pharmacy:expiry_alert_urgent` event

**Frontend:**
- [x] `usePharmacistDashboard.ts`: added `inventory:low_stock` listener → refetch lowStockMeds + toast; `pharmacy:expiry_alert` listener → refetch expiringMeds + urgent/normal toast; `refill:new` listener → toast notification
- [x] `usePharmacistRefills.ts`: added `refill:new` listener → calls `load()` to refresh refill list
- [x] `usePharmacy.ts` (patient): added `pharmacy:delivery:update` listener → updates order delivery_status in-place without page refresh + toast
- [x] `types/index.ts`: added `PharmacyDeliveryUpdatePayload`, `PharmacyLowStockPayload`, `PharmacyExpiryAlertPayload`; `PharmacyOrder` extended with delivery fields

## Live Integration Test (2026-05-30) — 31/31 PASSED
Ran a self-contained ts-node integration test against the live dev server (MongoDB + Redis up). Bootstrapped pharmacist/patient/data via models, drove the flow over HTTP, asserted state + Notification side-effects, then cleaned up all test data. Results:
- T1 Home-delivery guard BLOCKS no-visit patient (400 "prior visit") ✅
- T2 OTC approval: stock −4, FIFO consumed oldest batch first, dispensing record, cashier+admin+patient notifications ✅
- T3 Home-delivery guard ALLOWS patient with completed appointment ✅
- T4 Prescription approval: 20% insurance discount (240→192), prescription→dispensed ✅
- T5 Reject with reason ✅
- T6 Delivery status update → patient notification w/ correct `delivery_status` field (validates BUG-PH3-1 fix) ✅
- T7 Refill: 1st approved, 2nd BLOCKED on max_refills=1; pharmacist refill notification ✅
- T8 Low-stock alert to BOTH pharmacist + inventory manager ✅
Note: the 2 initial "fails" were test-timing races (asserting fire-and-forget notifications before flush); added 500ms waits → all green. No code bugs.

## Next Steps
Pharmacy Part 3 complete and live-tested. Awaiting next module.

---

## Previous Task
Redis Activation & Integration (2026-05-30)

## Status
ALL PARTS COMPLETE. Redis fully activated and integrated. Awaiting next module.

## Completed This Session

### Part 1: Redis Already Operational
- `src/config/redis.ts` verified: `connectRedis()` gracefully handles failures (server keeps starting)

### Part 2: Caching Layer
- Created `src/config/cacheTtl.ts` — single source for TTLs + CACHE_KEYS
- Created `src/utils/cache.ts` — `cache.get / set / del` with Redis-unavailable fallback (never throws)
- Pricing settings: `settings:pricing`, 1h, invalidated on any admin price/lab/radiology update (7 locations)
- Doctor schedules: `schedule:doctor:{id}`, 15min, invalidated on block/unblock/admin override
- Available slots: `slots:{doctorId}:{date}`, 5min, invalidated on booking / block / unblock
- Medications list: `pharmacy:medications`, 30min, invalidated on approvePharmacyOrder and warehouse assign
- Insurance companies: `insurance:companies` (admin) + `insurance:companies:active` (patient), 1h each
- Room availability: `rooms:availability`, 5min, invalidated on addRoom/updateRoom/updateRoomStatus/deleteRoom/bookRoom/confirmRoomBooking
- Patient profile: `profile:{userId}`, 10min, invalidated on updateProfile

### Part 3: Session & Rate Limiting
- Token blacklist: SHA-256 hash stored in `blacklist:{hash}` with TTL = remaining expiry
- `logout` blacklists refresh token; `refreshAccessToken` checks blacklist before verify
- Login: 10 attempts / 15 min / IP
- Register: 5 attempts / 1h / IP
- Chatbot: 20 / 1h / user ID

### Part 4: Socket.IO Redis Adapter
- Installed `@socket.io/redis-adapter`
- `attachRedisAdapter()` in `socket.ts` creates sub client via `redisClient.duplicate()`, attaches adapter
- Called from `server.ts` after `initSocket()`, skipped gracefully if Redis unavailable

### Part 5: Edge Cases — All Handled
- All cache.get/set/del wrapped in try/catch; never propagate errors to HTTP response
- Redis `isReady` guard at the top of every operation
- No passwords, tokens, or medical records cached
- All TTL constants in one file

---

## Admin Module — Bug-fix & Live-data Session (prior)

## Status (prior)
ALL BUGS FIXED. Admin module fully live.

## Completed This Session
- [x] BUG: `s.doctor_name.toLowerCase()` crash on schedules page — `doctor_name` was undefined (null-guard added)
- [x] BUG: `slots.forEach` crash on schedules page — `slots` was undefined (null-guard added)
- [x] BUG: `health.memory.used_mb` crash on system health page — `memory` object absent from API response (optional-chaining added)
- [x] BUG: Announcements showed "Invalid Date" — field was `createdAt` (Mongoose timestamps) not `created_at`; type + all page references corrected
- [x] BUG: Announcements `target_roles.map` crash — field was undefined (null-guard added)
- [x] BUG: Duplicate announcement keys — socket event fired before HTTP response; dedup added to both socket handler and handleCreate; socket payload normalized (`_id` → `id`)
- [x] BUG: "Cannot update component while rendering" on announcements — `showToast` was called inside a `setAnnouncements` updater function; moved outside
- [x] BUG: `useSocketEvent` re-registered listener on every render — handler now stored in a ref; effect depends only on `[event]`
- [x] BUG: Announcement socket payload missing `createdAt`, `target_roles`, `is_urgent`, `created_by` — backend emit extended with full payload
- [x] BUG: DoctorKPIStrip rendered NaN — added `isNaN` guard; root cause was occupancy type mismatch
- [x] BUG: Occupancy report shape mismatch — backend returns `overall.total_capacity` / `overall.occupancy_pct` / `by_type` as Record; frontend type + reports page rewritten to match
- [x] FEATURE: Bed occupancy card on admin dashboard made live — `OccupancySection` now self-fetches from `getOccupancyReport()` instead of using `DEFAULT_BEDS` hardcoded data
- [x] FEATURE: Revenue chart made fully self-contained — `RevenueChart` now self-fetches with last-7-days `from` param; listens to `payment:received` socket for instant refresh; no longer depends on `useAdmin` for data
- [x] BUG: Admin schedules page broken — backend returned wrong field names (`name` not `doctor_name`, `blocked_slots` not `slots`) and no appointments; `getAllSchedules` rewritten to return correct shape + include this week's appointments as `booked` slots

## Admin Part 3 (Full Feature Set) Progress
- [x] Real-time revenue updates — already done (payment:received → getDashboardStats + getRevenueReport)
- [x] Real-time staff request alerts — already done (staff_request:new → toast + count)
- [x] Maintenance mode real-time — backend already emits; NEW: socket emits maintenance payload on new connection; NEW: MaintenanceOverlay component (full-screen non-admin / banner admin); NEW: StaffShell listens system_maintenance + system_online
- [x] Urgent announcements prominent banner — NEW: StaffShell listens announcement:new + renders urgent banners above page content; normal → bell only
- [x] System health every 60s — NEW: server.ts setInterval 60s emits health_update to admin role; NEW: mongoose.connection.on('disconnected') → health_alert; health page already listens health_update; NEW: health page listens health_alert → critical toast + reload
- [x] Pricing_updated broadcast to ALL roles — was admin-only; broadened with ALL_ROLES loop; patient booking page NEW: useSocketEvent('pricing_updated') → toast
- [x] Doctor schedule override notification — NEW: overrideDoctorSchedule emits notification:new + schedule:updated to doctor after save; NEW: StaffShell listens schedule:updated → toast (doctor-role only)
- [x] Admin cannot deactivate own account — NEW: backend setActive 403 guard; NEW: UsersTable Deactivate button disabled for self (desktop + mobile menu)
- [x] Admin cannot delete/change-role own account — already done
- [x] Insurance cascade delete — already done
- [x] Lab test / radiology scan delete blocked if pending orders — NEW: deleteLabTest + deleteRadiologyScan check LabOrder/RadiologyOrder countDocuments → 409
- [x] Deletion approval blocks on pending appointments or unpaid invoices — NEW: approveDeletion checks Appointment + Invoice → 400
- [x] Approved deletion anonymizes (keeps medical records) — already done
- [x] Shift conflict warning — NEW: assignShift Shift.findOne overlap check → 409
- [x] Price cannot be 0 or negative — already done (Zod .positive())
- [x] Email template changes take effect immediately — already done (no caching)
- [x] Department reassignment real-time visibility — NEW: assignStaffDepartment emits department:updated to affected user
- [x] Data export empty structure — already works (empty arrays returned)
- [x] Not yet activated badge (temp password > 48h) — already done in UsersTable

## Admin Part 6 Progress
(prior content preserved below)

## Admin Part 6 Progress
- [x] New types appended to `src/types/index.ts`: ScheduleSlotType, ScheduleSlot, DoctorSchedule, ShiftType, Shift, AssignShiftDto, Announcement, CreateAnnouncementDto, PricingTestItem, PricingSettings, MaintenanceStatus, EmailTemplate, DeletionRequest, SystemHealthEntry, SystemHealth, ErrorLog
- [x] 30 new service methods appended to `src/services/admin.service.ts` (schedules, shifts, announcements, pricing, maintenance, email templates, compliance, department staff, system health/logs)
- [x] 6 new nav items + new icon imports added to `src/config/navItems.tsx` (Schedules, Shifts, Announcements, Sys Settings, Compliance, Sys Health)
- [x] `app/dashboard/admin/schedules/page.tsx` — weekly grid, color-coded slots, filter, slot popover, unblock confirm
- [x] `app/dashboard/admin/schedules/[doctorId]/page.tsx` — per-doctor schedule, block-slot form, delete blocked slots
- [x] `app/dashboard/admin/shifts/page.tsx` — today's shifts by dept + all shifts table + AssignShiftModal
- [x] `app/dashboard/admin/announcements/page.tsx` — create modal, urgent-first sort, socket listener
- [x] `app/dashboard/admin/settings/page.tsx` — 3-tab: Pricing / Maintenance / Email Templates
- [x] `app/dashboard/admin/compliance/page.tsx` — patient export (JSON/PDF blob), deletion requests
- [x] `app/dashboard/admin/system/health/page.tsx` — status cards, 30s auto-refresh + socket, error logs
- [x] `app/dashboard/admin/departments/[id]/page.tsx` — staff by role + reassign department
- [x] npx tsc --noEmit → 0 errors in admin files

## Next Steps
Admin Part 6 frontend complete. Awaiting next module.

---

## Admin Part 5 Progress
- [x] 5 new models: Shift, PricingSettings (singleton), Announcement, EmailTemplate, DeletionRequest
- [x] 2 new seeds: pricingSettings.seed.ts + emailTemplates.seed.ts (7 default templates) — called in server.ts
- [x] New middleware: maintenanceMode.ts — Redis-backed 503 guard, registered in app.ts after rateLimiter
- [x] Section 4: PUT /admin/staff/:id/department, GET /admin/departments/:id/staff
- [x] Section 5: GET/PUT/DELETE /admin/doctors/:id/schedule, GET /admin/schedules
- [x] Section 6: GET/POST/PUT/DELETE /admin/shifts + GET /admin/shifts/today
- [x] Section 7: GET/PUT /admin/settings/pricing + lab/radiology CRUD (8 routes); public GET /settings/pricing (Redis-cached, 1h TTL)
- [x] Section 8: POST/GET/DELETE /admin/announcements (Socket.io broadcast on create)
- [x] Section 9: POST/DELETE/GET /admin/system/maintenance (Redis + Socket.io)
- [x] Section 10: GET /admin/email-templates, PUT /admin/email-templates/:name
- [x] Section 11: POST /admin/export/patient/:id (JSON or PDF via pdfkit), GET/PATCH /admin/deletion-requests
- [x] Section 12: GET /admin/system/health, GET /admin/system/logs
- [x] utils/pricing.ts: added getPricingSettings() with Redis cache
- [x] utils/mailer.ts: added sendTemplatedEmail()
- [x] npx tsc --noEmit → 0 errors

## Next Steps
Admin Part 5 frontend (pages for shifts, pricing, announcements, maintenance, email templates, GDPR, system health). Or next module.

## Admin Parts 3 & 4 Progress

### Part 3 — Real-time & Edge Cases
- [x] Item 1: Revenue chart wired to live data; `useAdmin.ts` refetches `getRevenueReport()` on `payment:received`
- [x] Item 2: Real-time staff request alerts — `useSocketEvent('staff_request:new')` → toast + pending count increment; BOTH registration flows emit this event
- [x] Item 3: Admin cannot view passwords — already enforced by User model
- [x] Item 4: Role/delete self-guard — 403 on backend + disabled buttons in `UsersTable` + user detail page; `currentUserId` prop pattern
- [x] Item 5: Insurance cascade — `deleteInsuranceCompany` clears patient profiles + Notification + emitToUser per affected patient
- [x] Item 6: Temp password flow — `password_changed:false` on admin-created accounts; `pwc` JWT claim; middleware redirect; new `/auth/change-password` page (no old_password field)

### Part 4 — Missing Features
- [x] Item 1: Appointments oversight — `GET /admin/appointments` + `DELETE /admin/appointments/:id`; new `/dashboard/admin/appointments` page; nav item added
- [x] Item 2: Staff profile edit — `PATCH /admin/users/:id/profile`; edit mode on user detail page Personal card
- [x] Item 3: Admin invoice create — `createAdminInvoice` service + `CreateInvoiceModal` on invoices page

### Part 3 — Cashier (prior) Progress
- [x] Item 1: Real-time Payment Notification to Admin
  - Backend `controllers/cashier/index.ts`: added `resolvePatientName()` + `notifyAdminsOfPayment()` helpers; wired into `payInvoice` (real name from Profile, replaces username) and `partialPayInvoice` (previously emitted nothing to admins). Admins now get a persistent `Notification` + `notification:new` (bell) AND `payment:received` (live dashboard).
  - Frontend `hooks/useAdmin.ts`: `useSocketEvent('payment:received')` → toast (success/info for full/partial) + authoritative `getDashboardStats()` refetch (keeps `total_revenue_today` consistent with backend aggregation).
  - Frontend `app/dashboard/admin/page.tsx`: revenue card currency `LBP` → `EGP`.
  - BE `tsc` build clean; FE lint clean on both changed files.
- [x] Item 2: Real-time New Pending Payment Alert to Cashier
  - New shared `services/notification.service.ts` → `notifyCashiersOfPendingPayment({patientId, source, sourceId, description})`: persistent `Notification` + `notification:new` per active cashier (bell) AND `emitToRole('cashier','payment:pending', {...})` (live banner + pending-list refresh). Resolves patient name from Profile internally.
  - Backend wiring: `pharmacist/approvePharmacyOrder` (source 'pharmacy') and `doctor/createDiagnosis` (source 'appointment', only when completed appt type !== 'online' — physical visits are paid at cashier). Captured `completedAppointmentType` from the findOneAndUpdate result.
  - Frontend: new `PaymentPendingPayload` type; new `components/staff/cashier/PendingPaymentBanner.tsx` (caution-toned, "New payment pending for {name}"); cashier dashboard page subscribes to `payment:pending` → renders banners (View pending → /dashboard/cashier/pending, dismissable); `useCashierPending` reloads on `payment:pending`.
  - BE `tsc` build clean; FE lint clean on changed files (pre-existing empty-interface errors in types/index.ts:843/845 unrelated).
- [x] Item 3: Invoice PDF Generation
  - `app/dashboard/cashier/invoices/[id]/page.tsx` — added `exportInvoicePdf(invoice)` (dependency-free print-window, mirrors daily-report pattern): hospital name + logo placeholder, patient name, invoice #, date, status badge, itemized table (description/category/amount), insurance discount line, subtotal/total-due/paid/remaining totals (remaining coloured caution/positive), payment method + paid date if present, notes, generated-at footer. "Export" button (ghost, always visible) + moved "Process payment" inside a flex row. Replaced `fmtLBP` with `fmtEGP` throughout the file. FE lint clean.
- [x] Item 4: Edge Cases
  - **Already handled (verified):** empty items (Zod min(1)), already-paid guard (payInvoice/partialPayInvoice), partial exceeds total (partialPayInvoice).
  - **Gap 3 fixed (Insurance live lookup):** `createInvoice` now looks up `InsuranceCompany.findOne({name, is_active:true}).discount_percentage` using the provider from the request body or patient's profile — falls back to `Profile.insurance_discount_pct` only if company not found. Added `InsuranceCompany` + `Medication` + `mongoose` imports.
  - **Gap 5 fixed (Daily report cashier filter):** `getDailyReport` `matchStage` now includes `issued_by: new mongoose.Types.ObjectId(req.user!.id)` — report only shows the logged-in cashier's transactions.
  - **Gap 6 (Invoice cancellation):** new `PATCH /cashier/invoices/:id/cancel` endpoint — guards against cancelling paid invoices; notifies patient (Notification + socket); reverses stock for `approved` pharmacy orders (adds back stock, resets to `pending`); unsets `invoice` field on all linked records (appointments, labs, radiology, room bookings, dispensed pharmacy orders). Route registered. Frontend: `cashierService.cancelInvoice`, `useCashierInvoice.cancelInvoice` + `cancelConfirm` state, inline confirm UI in detail page ("Cancel invoice" → "Confirm cancel?" → "Yes, cancel"/"Keep").
  - BE `tsc` clean; FE lint clean on changed files.

## Next Steps
Cashier Part 3 (Items 1-4) complete. Awaiting next task from user.

---

## (Prior) Cashier Part 2 — COMPLETE
ALL PAGES COMPLETE (1–5) + BUG-4 & BUG-5 resolved. Cashier Part 2 frontend done.

## Completed
- [x] Page 1: Main Dashboard (`/dashboard/cashier`)
  - Added `DailyTransaction` + `DailyReport` types (`src/types/index.ts`)
  - Added `cashierService.getDailyReport(date?)` (raw, un-normalized)
  - New `useCashierDashboard` hook (daily report + invoice counts; `useCashier` left intact for Page 3)
  - New `TodaysTransactions` component
  - Rewrote `page.tsx`: 4 spec summary cards + transactions list + New-invoice/Daily-report actions
- [x] Page 2: Pending Payments (`/dashboard/cashier/pending`)
  - Added `PendingItemType`/`PendingItem`/`PendingPatient` types
  - Added `cashierService.getPending()` + `generateInvoiceFromPending()` (sends correct backend `items[{source,…}]` body)
  - New `useCashierPending` hook + `PendingPatientCard` (expandable breakdown) + page
  - Added "Pending" nav item to `cashierNav`
  - On generate → navigates to `/invoices`. Lint + tsc clean.
- [x] Page 3: Invoices (`/dashboard/cashier/invoices`)
  - Added raw `CashierInvoice`* types + `getCashierInvoices`/`payInvoiceFull`/`payInvoicePartial`
  - New `useCashierInvoices` hook (tabs All/Unpaid/Paid/Partial + patient search + counts)
  - New `InvoiceCard` (badges, totals, View-details expand) + reusable `PaymentModal` (full + partial)
  - Fixed BUG-4; deleted orphaned `useCashier`/`InvoiceTable`/`ProcessPaymentModal`/`GenerateConsolidatedInvoiceModal`

- [x] Page 4: Invoice Detail & Payment Modal (`/dashboard/cashier/invoices/[id]`)
  - Added `getCashierInvoice(id)` + `useCashierInvoice` hook + detail page; reused `PaymentModal`
  - Added "Open" link on `InvoiceCard`
  - BUG-5 found unfixable frontend-only (needs backend `source` change or repoint New-invoice button) — documented, deferred

- [x] Page 5: Daily Report (`/dashboard/cashier/reports`) — date picker, total + by-method + by-category, transaction list, dependency-free Export PDF (print window). Nav item added.
- [x] BUG-5 (option a): backend `manual` source + optional source_id; `CreateInvoiceDto`; `CreateInvoiceModal` rewritten.

## Next Steps
Cashier Part 2 frontend complete. Awaiting next task from user.
Suggested follow-ups (not started):
- Manual end-to-end verification with `npm run dev` (both apps) as a cashier across all 5 pages.
- Optional: search/date filter on Page 3 currently client-side; could push `?status=`/`?date=` to backend if invoice volume grows.
- [ ] Page 4: Invoice Detail & Payment Modal
- [ ] Page 5: Daily Report (`/dashboard/cashier/reports`) — date picker, method/category breakdown, PDF export (Page-1 "Daily report" link targets this)
