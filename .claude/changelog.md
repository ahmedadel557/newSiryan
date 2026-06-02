# Changelog

## [2026-06-02] Doctor System Part 3 (Frontend) — Video Call + In-Call Chat (custom UI)

### Goal
Build the 1-on-1 video consultation (doctor + patient) with a fully custom UI (no prebuilt Stream
visual components) and an in-call-only text chat, replacing the Part-2 video placeholder.

### Dependency
- `stream-chat` (headless client). Skipped `stream-chat-react` (prebuilt UI — violates custom-UI rule);
  `@stream-io/video-react-sdk` was already installed in Part 2.

### New Files (Frontend, under `apps/frontend/`)
- `src/hooks/useVideoCall.ts` — doctor call lifecycle (POST create → join → end-for-both)
- `src/hooks/usePatientVideoCall.ts` — patient call lifecycle (GET token → join → leave)
- `src/hooks/useInCallChat.ts` — Stream Chat channel keyed by callId (best-effort, guarded)
- `src/components/doctor/video/ParticipantVideo.tsx` — headless track binding (`bindVideoElement`/`bindAudioElement`)
- `src/components/doctor/video/RemoteVideoTile.tsx`, `LocalVideoTile.tsx` (PiP)
- `src/components/doctor/video/CallControls.tsx` — mic/camera/chat/end (Stream media-state hooks)
- `src/components/doctor/video/InCallChat.tsx` — custom slide-in chat panel
- `src/components/doctor/video/CallStatusOverlay.tsx` — connecting state
- `src/components/doctor/video/VideoCallLayout.tsx` — composes the above (shared by both pages)
- `src/app/dashboard/patient/video/[appointmentId]/page.tsx` — patient call page

### Changed Files
- `src/app/dashboard/doctor/video/[appointmentId]/page.tsx` — placeholder → live call page
- `src/services/doctor.service.ts` — added `createVideoCall`, `endVideoCall`
- `src/services/patient.service.ts` — added `getVideoCallToken` (+ `VideoCallToken` import)
- `src/components/patient/AppointmentRow.tsx` — enabled "Join call" within the 5-min window → patient video page
- `src/app/dashboard/patient/appointments/online/[id]/page.tsx` — placeholder → "Join video call" CTA

### Conventions / deviations from spec
- Doctor opens via **POST** `createVideoCall` (backend creates the Stream call) then joins
  `{ create: false }`; patient uses **GET** token then joins. (Spec's doctor-uses-GET would fail.)
- `<StreamVideo>`/`<StreamCall>` used as **headless providers** for the SDK hooks; video rendered
  via `call.bindVideoElement` — no prebuilt visual UI (no ParticipantView/SpeakerLayout/StreamTheme).
- Used real design tokens (spec's `--surface-sunken`/`--error`/`--red-500` don't exist): stage
  `var(--forest-950)`, End Call `var(--critical)`, chat `var(--bg-surface)`/`--bg-sunken`/`--brand`.
- `apiKey` taken from the token response (env `NEXT_PUBLIC_STREAM_API_KEY` is only a fallback).

### Verification
- `npx tsc --noEmit` (frontend) → 0 errors. New video files lint-clean except repo-wide
  `no-explicit-any` baseline (Stream chat types / catch blocks — same pattern as existing hooks/services).
- E2E needs real `STREAM_API_KEY`/`SECRET` (backend) + `NEXT_PUBLIC_STREAM_API_KEY` (frontend);
  in-call chat additionally needs the Chat product enabled on the Stream app.

## [2026-06-02] Doctor System Part 2 (Frontend) — Integrate Part-1 endpoints + new pages

### Goal
The doctor frontend already existed and was mature, so Part 2 integrated Part-1's three new
backend endpoints (`/queue/today`, `/notes` CRUD, `/video/token`) and added the net-new,
backend-supported pages — rather than rebuilding the spec's greenfield dashboard (which would
have duplicated working UI and called endpoints that don't exist).

### New Files (Frontend, under `apps/frontend/`)
- `src/hooks/useDoctorQueue.ts` — today's queue, 60s auto-refresh, `appointment:status` socket sync
- `src/hooks/useDoctorNotes.ts` — per-patient private notes CRUD (optimistic, toasts)
- `src/hooks/useDoctorRatings.ts` — wraps existing `getMyRatings()`
- `src/components/doctor/RatingStars.tsx` — read-only star display
- `src/components/doctor/QueueItem.tsx` — queue row; conditional "Start video call" (online + within 5 min)
- `src/components/doctor/NoteEditor.tsx` — private-notes panel (add/edit/delete) used in Notes tab
- `src/app/dashboard/doctor/queue/page.tsx` — today's queue
- `src/app/dashboard/doctor/ratings/page.tsx` — my ratings
- `src/app/dashboard/doctor/notifications/page.tsx` — notifications (reuses `useNotifications`)
- `src/app/dashboard/doctor/video/[appointmentId]/page.tsx` — placeholder (Part 3 fills it)

### Changed Files
- `src/services/doctor.service.ts` — added getTodayQueue, getNotes/createNote/updateNote/deleteNote,
  getVideoCallToken (+ `normalizeNote`)
- `src/types/index.ts` — added `DoctorQueueItem`, `DoctorNote`, `VideoCallToken`
- `src/components/doctor/NotesTab.tsx` + `app/dashboard/doctor/patients/[id]/page.tsx` —
  render `<NoteEditor>` (real persistent DoctorNote) alongside existing clinical notes
- `src/config/navItems.tsx` — added Queue / Ratings / Notifications to `doctorNav` (lucide-react)

### Dependency
- `@stream-io/video-react-sdk` (installed for Part 3).

### Conventions / deviations from spec
- Kept **lucide-react** (repo standard; the spec's "react-icons only" is backwards).
- **snake_case** types (matches existing). Skipped spec items with no backend support
  (working-hours editor, global prescriptions/orders pages, visit-summary) and spec components
  that already exist.

### Verification
- `npx tsc --noEmit` (frontend) → 0 errors. New files lint clean except the repo-wide accepted
  baseline pattern (`react-hooks/set-state-in-effect`, also present in `useNotifications.ts`);
  project lint has 248 pre-existing errors unrelated to this change.

## [2026-06-02] Doctor System Part 1 (Backend) — Stream Video + Notes + Queue

### Goal
Deliver the genuinely-missing doctor backend pieces. Most of the original Part-1 spec
(records, prescriptions, lab/radiology orders, schedule, ratings, cancel/reschedule) already
existed in `apps/backend`, so this part added only: **Stream Video calling** (fills the
patient "Video calls coming soon" placeholder), **doctor private notes**, and a dedicated
**today's queue** endpoint. Built with the repo's first real service layer (`doctor.service.ts`).

### New Files (Backend, all under `apps/backend/`)
- `src/config/stream.ts` — guarded `StreamClient` singleton (`@stream-io/node-sdk`); 503 when unconfigured
- `src/models/VideoCall.ts` — appointment↔Stream-call mapping (waiting/active/ended)
- `src/models/DoctorNote.ts` — doctor-private patient notes
- `src/services/doctor.service.ts` — video (get-or-create / end / token), notes CRUD, today-queue
- `src/controllers/doctor/video.controller.ts` — createVideoCall, endVideoCall, getVideoToken
- `src/controllers/doctor/notes.controller.ts` — createNote, getNotes, updateNote, deleteNote
- `src/controllers/doctor/queue.controller.ts` — getTodayQueue

### Changed Files
- `src/validations/doctor.validation.ts` — added `createNoteSchema`, `updateNoteSchema`
- `src/types/index.ts` — added `VideoCallToken`, `DoctorQueueItem`
- `src/routes/doctor.routes.ts` — added `/video/token/:appointmentId` (doctor+patient),
  `/video/call/:appointmentId`, `/video/call/:callId/end`, `/queue/today`, `/notes` CRUD
- `.env.example` — added `STREAM_API_KEY`, `STREAM_API_SECRET`

### Dependency
- `@stream-io/node-sdk` (video SDK). The spec's `getstream-node` (legacy chat) was skipped.

### Verification
- `npx tsc --noEmit` → 0 errors. (ESLint is not configured in the backend — no dep/config.)

### Out of scope (reused existing, not rebuilt)
DoctorSchedule model, parallel route paths, and the already-implemented
records/prescriptions/orders/schedule/ratings/cancel-reschedule endpoints.

## [2026-06-01] Auth Pages Component Architecture Refactor

### Goal
Refactored 3 monolithic auth pages (login: 436 lines, register: 1540 lines, complete-profile: 305 lines)
into clean micro-component architecture. Pages now serve as thin orchestrators (40/48/23 lines).

### New Files (Frontend)

**Shared auth components (`src/components/auth/shared/`):**
- `AuthInput.tsx` — Reusable input field with icon, error display, hint, and status slot
- `AuthButton.tsx` — Reusable submit button with loading state
- `AuthDivider.tsx` — "or continue with" divider
- `GoogleIcon.tsx` — Shared Google SVG icon (was duplicated in login + register)
- `UsernameField.tsx` — Username input with availability status display
- `PasswordStrength.tsx` — Password strength indicator (was duplicated 3x)
- `StepIndicator.tsx` — Multi-step form indicator (was duplicated 2x in register)

**Login components (`src/components/auth/login/`):**
- `LoginHeader.tsx` — Logo + brand header
- `LoginForm.tsx` — Email/password form with error handling + social login
- `SocialLogin.tsx` — Google + Phone OTP buttons
- `PhoneLogin.tsx` — Self-contained phone OTP flow (enter-phone + enter-otp states)

**Register components (`src/components/auth/register/`):**
- `registerTypes.ts` — All schemas, types, constants (patientSchema, staffSchema, DEPARTMENT_SPECIALIZATIONS, STAFF_ROLES, etc.)
- `RegisterHeader.tsx` — Logo + Patient/Staff tab switcher
- `PatientForm.tsx` — Patient registration orchestrator (3-step state machine)
- `StaffForm.tsx` — Staff registration orchestrator (2-step state machine)
- `StaffSuccessScreen.tsx` — Post-submission success screen
- `steps/PersonalInfoStep.tsx` — Patient step 1: name, email, phone, username
- `steps/MedicalInfoStep.tsx` — Patient step 2: DOB, gender, blood type, insurance, national ID
- `steps/SecurityStep.tsx` — Patient step 3: password, confirm, terms
- `steps/StaffProfessionalStep.tsx` — Staff step 1: name, email, phone, role, department, specialization, national ID
- `steps/StaffSecurityStep.tsx` — Staff step 2: username, password, terms, professional confirm

**Complete-profile components (`src/components/auth/complete-profile/`):**
- `ProfileHeader.tsx` — Logo + Google avatar + title
- `CompleteProfileForm.tsx` — Account + personal info form

**Hook (`src/hooks/`):**
- `useUsernameCheck.ts` — Debounced username availability check (was duplicated 3x)

### Modified Files (Frontend)
- `src/app/auth/login/page.tsx` — Rewritten as thin orchestrator (436→40 lines)
- `src/app/auth/register/page.tsx` — Rewritten as thin orchestrator (1540→48 lines)
- `src/app/auth/complete-profile/page.tsx` — Rewritten as thin orchestrator (305→23 lines)

### Notes
- Zero logic changes — all API calls, validation schemas, and form submission logic preserved exactly
- All components under 150 lines; no prop drilling beyond 2 levels
- Fixed `CompleteProfileForm` TS assignment mismatch (`UseFormRegister<FormValues>` vs `UseFormRegister<PersonalFieldsValues>`) by exporting `FormValues` and importing/using it in the `ProfilePersonalFields` sub-component.
- `npx tsc --noEmit` → 0 errors; `npx eslint` → 0 errors, 3 warnings (pre-existing react-hook-form incompatible-library)

## [2026-05-30] Pharmacy Part 3 — Real-time & Edge Cases + Flow Testing

### Backend
- `src/models/Prescription.ts` — added optional `max_refills?: number` field
- `src/controllers/pharmacist/index.ts`:
  - `sendLowStockAlerts()` now also notifies pharmacists (emitToRole `inventory:low_stock` + Notification.insertMany)
  - `approvePharmacyOrder` + `approvePrescriptionOrder`: home-delivery prior-visit guard (`Appointment.countDocuments({patient, status:'completed'})` → 400 if none); admin `pharmacy:order:approved` emit + Notification per admin
  - `approveRefillRequest`: blocks when approved refill count ≥ `prescription.max_refills`
  - **BUG FIX**: `updateDeliveryStatus` socket payload field renamed `status` → `delivery_status` to match frontend contract (was causing `undefined` on patient side)
- `src/jobs/pharmacyExpiry.job.ts` — each expiry item tagged `urgent` (≤7 days); urgent items also emit `pharmacy:expiry_alert_urgent`

### Frontend
- `src/types/index.ts` — added `PharmacyDeliveryUpdatePayload`, `PharmacyLowStockPayload`, `PharmacyExpiryAlertPayload`; `PharmacyOrder` extended with delivery fields; `PatientPharmacyOrderDto` gained `delivery_type?`
- `src/hooks/usePharmacistDashboard.ts` — listeners for `inventory:low_stock`, `pharmacy:expiry_alert`, `refill:new`; added `fetchLowStockMeds` / `fetchExpiringMeds`
- `src/hooks/usePharmacistRefills.ts` — `refill:new` listener refreshes list
- `src/hooks/usePharmacistOrders.ts` — new `handleUpdateDelivery(id, status)` action
- `src/hooks/usePharmacy.ts` (patient) — `pharmacy:delivery:update` listener updates order in-place; **BUG FIX**: `placeOrder` now sends `delivery_type` (maps `'home'`→`'delivery'`), surfaces backend error message
- `src/services/pharmacy.service.ts` — new `updateDeliveryStatus()` method
- `src/components/staff/pharmacist/OrderCard.tsx` — delivery-stage control (preparing/dispatched/delivered) for approved/dispensed delivery orders
- `src/app/dashboard/pharmacist/orders/page.tsx` — wires `onUpdateDelivery`

### Verification
- Backend `npx tsc --noEmit` → 0 errors; Frontend `npx tsc --noEmit` → 0 errors
- New files lint-clean (OrderCard, orders page, service); hooks carry only pre-existing `err: any` / `set-state-in-effect` patterns

## [2026-05-30] Redis Activation & Full Integration

### New files
- `newSiryan_backEnd/src/config/cacheTtl.ts` — TTL constants + namespaced cache key factory functions
- `newSiryan_backEnd/src/utils/cache.ts` — `cache.get / cache.set / cache.del` with Redis-unavailable fallback
- `newSiryan_backEnd/src/middlewares/redisRateLimiter.ts` — Redis-backed per-IP/per-user rate limiter factory

### Part 1: Redis client already connected in server.ts — confirmed operational

### Part 2: Caching Layer
- `src/config/socket.ts` — `attachRedisAdapter()` exported; duplicates Redis client for pub/sub; called in server.ts after `initSocket()`
- `src/server.ts` — imports + calls `attachRedisAdapter()` after initSocket
- `src/utils/pricing.ts` — rewrote to use `cache` util with key `settings:pricing`
- `src/controllers/admin/index.ts` — `listInsuranceCompanies` cached (`insurance:companies`); create/update/delete insurance invalidates both `insurance:companies` + `insurance:companies:active`; `getPublicPricing` uses cache util; all 7 `redisClient.del('pricing:settings')` replaced with `cache.del(CACHE_KEYS.PRICING_SETTINGS)`; `overrideDoctorSchedule` + `deleteDoctorScheduleSlot` invalidate `schedule:doctor:{id}`
- `src/controllers/doctor/index.ts` — `getDoctorAvailability` caches `slots:{doctorId}:{date}` (5 min); `getSchedule` caches `schedule:doctor:{doctorId}` (15 min); `blockScheduleSlot` / `unblockScheduleSlot` invalidate slots + schedule
- `src/controllers/pharmacist/index.ts` — `getMedications` cached (`pharmacy:medications`, 30 min); `approvePharmacyOrder` invalidates
- `src/controllers/patient/index.ts` — `getProfile` cached (`profile:{userId}`, 10 min); `updateProfile` invalidates; `bookAppointment` invalidates slots + schedule; `bookRoom` / `confirmRoomBooking` invalidate `rooms:availability`; `getInsuranceCompanies` cached (`insurance:companies:active`, 1 h)
- `src/controllers/inventory/index.ts` — `getRooms` (no-filter only) caches `rooms:availability` (5 min); `addRoom / updateRoom / updateRoomStatus / deleteRoom` invalidate; `assignWarehouseEntry` invalidates medications on stock update

### Part 3: Session & Rate Limiting
- `src/services/auth.service.ts` — `blacklistToken(token)` hashes token (SHA-256) + stores in Redis with TTL = remaining expiry; `isTokenBlacklisted` checked inside `refreshAccessToken` before JWT verify
- `src/controllers/auth/index.ts` — `logout` blacklists refresh_token before clearing cookies
- `src/routes/auth.routes.ts` — login rate limiter (10/15min/IP), register rate limiter (5/h/IP) via Redis
- `src/routes/patient.routes.ts` — chatbot rate limiter (20/h/user) via Redis

### Part 4: Socket.io Redis Adapter
- Installed `@socket.io/redis-adapter`
- `src/config/socket.ts` — `attachRedisAdapter()` creates a duplicate Redis client for sub, attaches `createAdapter` to io; gracefully skipped if Redis unavailable

### Part 5: Edge Cases
- All cache operations wrapped in try/catch; return null on error, never throw
- Redis unavailable → `isReady` guard → immediate null/skip
- No sensitive data (passwords, tokens, medical records) cached
- All TTLs in `src/config/cacheTtl.ts`; all keys in `CACHE_KEYS` constant

---

## [2026-05-30] Admin Module — Bug-fix & Live-data Session

### Frontend — Runtime crash fixes
- `app/dashboard/admin/schedules/page.tsx` — null-guard on `s.doctor_name` (`?? ''`) and `slots` (`?? []`) to prevent TypeError crashes when API returns incomplete data
- `app/dashboard/admin/system/health/page.tsx` — optional-chaining on all `health.memory.*` accesses with fallbacks (`'—'` / `0`) for when memory object is absent
- `app/dashboard/admin/announcements/page.tsx`
  - `createdAt` (was `created_at`) — Mongoose timestamps use camelCase; fixed in all 4 usages
  - `target_roles ?? []` — null-guard prevents `.map` crash
  - Duplicate key bug: dedup guard added to both `useSocketEvent('announcement:new')` handler and `handleCreate` state updater; socket payload normalized (`raw._id ?? raw.id`)
  - "Cannot update component while rendering": `showToast` moved outside `setAnnouncements` updater
  - Socket payload extended on backend — now includes `_id`, `createdAt`, `target_roles`, `is_urgent`, `created_by.name`
- `components/doctor/DoctorKPIStrip.tsx` — `isNaN` guard renders `—` instead of `NaN` children
- `app/dashboard/admin/reports/page.tsx` — occupancy section rewritten to use actual API shape (`overall.*`, `Object.entries(by_type)`, `room.name`/`room.type`/`room.current_occupancy`)

### Frontend — Type fixes
- `types/index.ts`
  - `Announcement.created_at` → `Announcement.createdAt`
  - `OccupancyRoomDetail`: replaced `room_number`, `room_type`, `patient_name?` with `name`, `type`, `floor`, `capacity`, `current_occupancy`, `available`
  - `OccupancyReport`: replaced flat `total_rooms/occupied_rooms/occupancy_rate/by_type[]` with `overall{total_capacity,occupied,available,occupancy_pct}` + `by_type: Record<string,{...}>` matching actual backend response

### Frontend — Live data
- `components/staff/admin/OccupancySection.tsx` — rewritten as self-fetching component; maps `by_type` Record to bar rows; owns its own loading skeleton; `DEFAULT_BEDS` hardcoded mock removed
- `components/staff/admin/RevenueChart.tsx` — rewritten as self-fetching component; passes `from` param (last 7 days only); listens to `payment:received` socket for instant update; props removed
- `app/dashboard/admin/page.tsx` — removed `data={revenueByDay}` prop + outer loading guard for both cards; removed `revenueByDay` from `useAdmin` destructure

### Frontend — useSocketEvent stability
- `hooks/useSocketEvent.ts` — handler stored in `handlerRef`; effect depends only on `[event]` (not handler); prevents listener teardown/re-registration on every render

### Backend — Schedules fix
- `controllers/admin/index.ts` — `getAllSchedules` rewritten:
  - Returns `doctor_name` (was `name`) and `slots` (was `blocked_slots`) matching frontend types
  - Fetches current week (Mon–Sun) appointments per doctor with `status: pending/confirmed/checked_in`
  - Builds unified `slots[]` combining blocked slots (`type:'blocked'`, `time_slot:'HH:00–HH:00'`) and appointments (`type:'booked'`, `time_slot:'HH:MM'`, `patient_name`)
  - Department filter and explicit `date` filter both still work

### Backend — Announcement emit fix
- `controllers/admin/index.ts` — `createAnnouncement`: socket emit payload extended from `{id,title,message,priority}` to `{_id, title, message, target_roles, is_urgent, createdAt, created_by:{name}}`

---

## [2026-05-29] Admin Flow Part 6 — Frontend (6 pages + 2 sub-pages)

### New Files (Frontend)
- `newSiryan_frontEnd/src/app/dashboard/admin/schedules/page.tsx` — weekly grid (doctors × Mon–Sun), color-coded slots (positive=available/caution=booked/critical=blocked), slot click popover, confirm-unblock dialog, filter by doctor name + dept dropdown
- `newSiryan_frontEnd/src/app/dashboard/admin/schedules/[doctorId]/page.tsx` — individual doctor schedule grouped by date; block-slot form (PUT override); delete blocked slots
- `newSiryan_frontEnd/src/app/dashboard/admin/shifts/page.tsx` — today's shifts grouped by department; all shifts table with role/dept/date-range filters; AssignShiftModal with staff email search; edit/delete per row
- `newSiryan_frontEnd/src/app/dashboard/admin/announcements/page.tsx` — KPI strip (total/urgent); CreateAnnouncementModal (roles checkboxes + urgent toggle); list sorted urgent-first with red left-border; useSocketEvent('announcement:new')
- `newSiryan_frontEnd/src/app/dashboard/admin/settings/page.tsx` — 3-tab page: Pricing (appointment/rooms/pharmacy/lab tests CRUD/radiology scans CRUD, per-section Save, pricing_updated socket banner), Maintenance (enable with message+duration/disable), Email Templates (expand-editor with subject+HTML body + preview window)
- `newSiryan_frontEnd/src/app/dashboard/admin/compliance/page.tsx` — patient search + JSON/PDF blob export (URL.createObjectURL + anchor click); deletion requests table (approve/reject confirm dialogs)
- `newSiryan_frontEnd/src/app/dashboard/admin/system/health/page.tsx` — status cards (MongoDB/Redis/Socket/Uptime/Memory with progress bar), useSocketEvent('health_update') + 30s setInterval fallback, manual refresh, error logs scrollable table (max-height 420px)
- `newSiryan_frontEnd/src/app/dashboard/admin/departments/[id]/page.tsx` — staff grouped by role, reassign-department select dropdown per staff card

### Updated Files (Frontend)
- `newSiryan_frontEnd/src/types/index.ts` — appended 16 new types: ScheduleSlotType, ScheduleSlot, DoctorSchedule, ShiftType, Shift, AssignShiftDto, Announcement, CreateAnnouncementDto, PricingTestItem, PricingSettings, MaintenanceStatus, EmailTemplate, DeletionRequest, SystemHealthEntry, SystemHealth, ErrorLog
- `newSiryan_frontEnd/src/services/admin.service.ts` — updated import line; appended 30 new methods covering all new admin backend endpoints
- `newSiryan_frontEnd/src/config/navItems.tsx` — added icon imports (Clock, Megaphone, SlidersHorizontal, Shield, Activity); inserted 6 nav items before existing /dashboard/settings entry

### Key Pattern Note
`useToast()` returns `{ showToast, toasts }`. Call as `showToast(message, variant?)` where variant is `'success' | 'error' | 'info'`. NOT `{ title, variant: 'destructive' }`.

---

## [2026-05-29] Admin Flow Part 5 — Backend Infrastructure (40 new endpoints)

### New Models
- `src/models/Shift.ts` — staff shift assignments (user, shift_type enum, start_date, end_date, department, notes)
- `src/models/PricingSettings.ts` — singleton doc (appointments, rooms, pharmacy, lab[], radiology[])
- `src/models/Announcement.ts` — system-wide announcements (title, message, target_roles[], priority, created_by)
- `src/models/EmailTemplate.ts` — DB-stored email templates (name unique, subject, html_body with {{placeholder}} vars)
- `src/models/DeletionRequest.ts` — GDPR patient deletion workflow (patient, status, reason, processed_by, processed_at)

### New Seeds
- `src/seeds/pricingSettings.seed.ts` — idempotent, creates default PricingSettings if none exists
- `src/seeds/emailTemplates.seed.ts` — upserts 7 default templates: appointment_confirmation, appointment_reminder, password_reset, staff_welcome, invoice_ready, lab_results_ready, prescription_ready

### New Middleware
- `src/middlewares/maintenanceMode.ts` — reads `system:maintenance` from Redis; returns 503 for non-admin/non-auth routes; registered in app.ts after rateLimiter

### Updated: src/controllers/admin/index.ts (+40 controller functions)
- Section 4: `assignStaffDepartment`, `getDepartmentStaff`
- Section 5: `getDoctorSchedule`, `overrideDoctorSchedule`, `deleteDoctorScheduleSlot`, `getAllSchedules`
- Section 6: `getShifts`, `assignShift`, `updateShift`, `deleteShift`, `getTodayShifts`
- Section 7: `getPricingAdmin`, `getPublicPricing`, `updatePricing`, `addLabTest`, `updateLabTest`, `deleteLabTest`, `addRadiologyScan`, `updateRadiologyScan`, `deleteRadiologyScan`
- Section 8: `createAnnouncement`, `getAnnouncements`, `deleteAnnouncement`
- Section 9: `enableMaintenance`, `disableMaintenance`, `getMaintenanceStatus`
- Section 10: `getEmailTemplates`, `updateEmailTemplate`
- Section 11: `exportPatientData` (JSON + PDF via pdfkit), `getDeletionRequests`, `approveDeletion`, `rejectDeletion`
- Section 12: `getSystemHealth`, `getSystemLogs`

### Updated: src/validations/admin.validation.ts
- Added Zod schemas for all new sections: assignShiftSchema, updateShiftSchema, updatePricingSchema, addLabTestSchema, updateLabTestPriceSchema, addRadiologyScanSchema, updateRadiologyScanPriceSchema, createAnnouncementSchema, enableMaintenanceSchema, updateEmailTemplateSchema, exportPatientDataSchema, rejectDeletionSchema, overrideDoctorScheduleSchema, assignDepartmentSchema

### Updated: src/routes/admin.routes.ts
- 40 new routes across sections 4–12

### Updated: src/routes/settings.routes.ts
- Added `GET /pricing` (no auth) → `getPublicPricing`

### Updated: src/utils/pricing.ts
- Added `getPricingSettings()` — Redis cache (1h TTL) → PricingSettings.findOne() → fallback constants

### Updated: src/utils/mailer.ts
- Added `sendTemplatedEmail(to, templateName, vars)` — fetches EmailTemplate from DB, replaces {{placeholders}}, falls back to plain HTML

### Updated: src/server.ts
- Added `await seedPricingSettings()` + `await seedEmailTemplates()` after Redis connect

### Updated: src/app.ts
- Added `import { maintenanceGuard }` + `app.use(maintenanceGuard)` after rateLimiter

### New dependency
- `pdfkit` + `@types/pdfkit` — for GDPR patient data PDF export

---

## [2026-05-29] Admin Flow Part 4 — Appointments, Staff Profile Edit, Invoice Create (Full-stack)

### Item 1 — Appointments Oversight
- **Backend** `controllers/admin/index.ts`: `getAdminAppointments` — queries Appointment with optional `?status`/`?date`/`?search` filters, joins Profile for patient_name/doctor_name, returns up to 200 sorted by `scheduled_at` desc. `cancelAdminAppointment` — validates `{ reason }` (Zod min 1), guards already-cancelled/completed (400), sets `status='cancelled'`+`cancel_reason`, creates Notification + `emitToUser` for both patient and doctor, `logAudit('cancel_appointment_admin')`.
- **Backend** `validations/admin.validation.ts`: `cancelAdminAppointmentSchema`
- **Backend** `routes/admin.routes.ts`: `GET /appointments`, `DELETE /appointments/:id`
- **Frontend** `types/index.ts`: `AdminAppointment` interface
- **Frontend** `services/admin.service.ts`: `getAppointments(filters?)`, `cancelAppointment(id, reason)` (DELETE with `{ data: { reason } }`)
- **Frontend** `app/dashboard/admin/appointments/page.tsx` (NEW): status tabs (All/Pending/Confirmed/CheckedIn/Completed/Cancelled), date picker, name search, table with Cancel button → `CancelModal` (required reason, two-step confirm), `DoctorKPIStrip` (Total/Active/Completed/Cancelled)
- **Frontend** `config/navItems.tsx`: Appointments nav item added after Staff Requests

### Item 2 — Staff Profile Edit
- **Backend** `controllers/admin/index.ts`: `updateUserProfileAdmin` — `Profile.findOneAndUpdate({ user: req.params.id }, { $set: {...} }, { new: true })`, 404 if not found, `logAudit('update_staff_profile')`
- **Backend** `validations/admin.validation.ts`: `updateUserProfileAdminSchema` (all optional: first_name, last_name, phone with Egyptian regex, department, specialization, shift enum)
- **Backend** `routes/admin.routes.ts`: `PATCH /users/:id/profile`
- **Frontend** `services/admin.service.ts`: `updateUserProfile(id, data)`
- **Frontend** `app/dashboard/admin/users/[id]/page.tsx`: `editingProfile` + `profileForm` states, "Edit" button on Personal card (staff only), inline form with department dropdown from `getDepartments()`, Save → updates local profile state

### Item 3 — Admin Invoice Create
- Backend already had `POST /admin/invoices` + `createAdminInvoice` controller + Zod schema — no backend changes
- **Frontend** `types/index.ts`: `CreateAdminInvoiceDto` interface
- **Frontend** `services/admin.service.ts`: `createAdminInvoice(data)`, `getPatients()` (GET /admin/users?role=patient&limit=200)
- **Frontend** `app/dashboard/admin/invoices/page.tsx`: "Create Invoice" button → inline `CreateInvoiceModal` (patient select from getPatients(), dynamic line items with `ITEM_CATEGORIES`, insurance coverage, notes); new invoice prepended + auto-selected in detail panel; subtitle changed from "Read-only view"

### Notes
- TS check (both repos): only pre-existing errors remain (radiology/lab/nurse — not introduced this session)
- `KPIStrip tone 'info'` error fixed by removing the tone prop entirely on the appointments page

---

## [2026-05-29] Admin Flow Part 3 — Real-time & Edge Cases (Full-stack)

### Item 1 — Revenue Chart Live Data
- **Frontend** `hooks/useAdmin.ts`: `getRevenueReport()` fetched on mount; `useSocketEvent('payment:received')` also calls `getRevenueReport().then(r => setRevenueByDay(r.by_day))`; `revenueByDay` + `pendingStaffCount` added to return object
- **Frontend** `app/dashboard/admin/page.tsx`: removed duplicate local state, destructures `revenueByDay`+`pendingStaffCount` from `useAdmin()`, passes `data={revenueByDay}` to RevenueChart

### Item 2 — Real-time Staff Request Alerts
- **Backend** `controllers/auth/index.ts` (registerStaff): added `emitToRole('admin', 'staff_request:new', { user_id, name, role })` after Notification.insertMany — preserved existing self-registration flow
- **Frontend** `hooks/useAdmin.ts`: `useSocketEvent<StaffRequestPayload>('staff_request:new')` → toast + `getStaffRequests('pending').then(r => setPendingStaffCount(r.total))`

### Item 3 — Admin Cannot View Passwords
- Already enforced by User model's `toJSON` transform (strips password). No changes needed.

### Item 4 — Role Change / Delete Self Guard
- **Backend** `controllers/admin/index.ts`: `changeRole` + `deleteUser` both check `req.params.id === req.user!.id` → 403
- **Frontend** `components/staff/admin/UsersTable.tsx`: `currentUserId?` prop, `isSelf` derived, role+delete buttons disabled with tooltip; `isNotActivated()` caution badge (password_changed===false && age > 48h)
- **Frontend** `app/dashboard/admin/users/page.tsx`: passes `currentUserId={currentUser?.id}` from `useAuth()`
- **Frontend** `app/dashboard/admin/users/[id]/page.tsx`: `isSelf` flag disables role assignment + delete button

### Item 5 — Insurance Cascade Deletion
- **Backend** `controllers/admin/index.ts` `deleteInsuranceCompany`: after deleting company, finds all affected patient profiles, clears `insurance_provider`+`insurance_discount_pct`, creates Notification + `emitToUser` for each affected patient

### Item 6 — Temp Password Flow (Admin-Created Accounts)
- **Backend** `models/User.ts`: `password_changed: { type: Boolean, default: true }`
- **Backend** `controllers/admin/index.ts` `createStaff`: User created with `password_changed: false` + random temp password; sends email with credentials
- **Backend** `services/auth.service.ts`: `makeTokens(id, role, ipc=true, pwc=true)` — 4th arg `pwc` added to access token payload; `login` + `refreshAccessToken` both pass `pwc: user.password_changed !== false`
- **Backend** `services/auth.service.ts`: new `changePassword(userId, newPassword)` — sets `password_changed=true`, re-issues tokens
- **Backend** `validations/auth.validation.ts`: `changePasswordSchema` (`{ body: { newPassword: z.string().min(8) } }`)
- **Backend** `controllers/auth/index.ts`: `changePassword` handler — validate, call service, `setAuthCookies`, `logAudit`, `sendSuccess`
- **Backend** `routes/auth.routes.ts`: `PATCH /change-password` (authenticate middleware)
- **Frontend** `middleware.ts`: `decodePayload` returns `{ role, ipc, pwc }`; if `!pwc && pathname !== '/auth/change-password'` → redirect; if `pwc` already changed and at change-password → next()
- **Frontend** `services/auth.service.ts`: `changePassword(newPassword: string)` → `PATCH /auth/change-password`
- **Frontend** `app/auth/change-password/page.tsx`: rewritten — `newPassword` + `confirmPassword` fields only (no old password), calls `authService.changePassword`, then `setUserFromToken()` + redirect to dashboard

---

## [2026-05-29] Cashier Flow Part 3 — Item 4: Edge Cases (Full-stack)

### Already handled (verified, no changes)
- Empty items guard: `createInvoiceSchema` uses `items: z.array(...).min(1)`.
- Already-paid guard: `payInvoice` + `partialPayInvoice` both return 400 if `status === 'paid'`.
- Partial exceeds total: `partialPayInvoice` returns 400 if `newTotal > invoice.total_due`.

### Gap 3 — Insurance always from InsuranceCompany (not cached profile)
- `newSiryan_backEnd/src/controllers/cashier/index.ts` — `createInvoice`: now resolves the provider name from `insurance_provider` (request body) or `profile.insurance_provider` (patient), then calls `InsuranceCompany.findOne({name, is_active:true}).select('discount_percentage')` and uses `company.discount_percentage / 100`. Falls back to `profile.insurance_discount_pct` only if the company record isn't found. Added `InsuranceCompany`, `Medication`, `mongoose` imports.

### Gap 5 — Daily report shows only this cashier's transactions
- `newSiryan_backEnd/src/controllers/cashier/index.ts` — `getDailyReport` `matchStage` now includes `issued_by: new mongoose.Types.ObjectId(req.user!.id)`. Aggregation pipelines require proper `ObjectId` type (not string) — hence the explicit cast.

### Gap 6 — Invoice cancellation with patient notification + stock reversal
- **Backend** (`controllers/cashier/index.ts`): new `cancelInvoice` handler — guards: paid → 400, already cancelled → 400. Sets `status:'cancelled'`, notifies patient (Notification + `notification:new` socket). Reverses stock for `status:'approved'` pharmacy orders (adds back each item's quantity to `Medication.stock_quantity`, resets order to `pending`, unsets `invoice`). Dispensed orders: just unsets `invoice`. Unsets `invoice` field on all linked Appointments, LabOrders, RadiologyOrders, RoomBookings so they reappear in pending list.
- **Backend** (`routes/cashier.routes.ts`): `PATCH /invoices/:id/cancel` registered (no request body, no extra schema needed).
- **Frontend** (`services/cashier.service.ts`): added `cancelInvoice(id)` → `PATCH /cashier/invoices/:id/cancel`.
- **Frontend** (`hooks/useCashierInvoice.ts`): added `cancelConfirm`, `setCancelConfirm`, `cancelInvoice` callback.
- **Frontend** (`app/dashboard/cashier/invoices/[id]/page.tsx`): inline two-step confirm UI — "Cancel invoice" (critical colour) → "Confirm cancel? / Yes, cancel / Keep". Only shown when `status` is `unpaid` or `partially_paid`.

### Notes
- BE `tsc` build: 0 errors. FE lint: clean on all changed files.
- Pre-existing `no-explicit-any` in `cashier.service.ts:16-17` (unchanged lines) unrelated.

## [2026-05-29] Cashier Flow Part 3 — Item 3: Invoice PDF Generation (Frontend)

Clicking "Export" on any invoice detail page now opens a formatted print window (dependency-free
"Save as PDF" via `window.print()`), reusing the same pattern as the daily report export.

### Changes
- `newSiryan_frontEnd/src/app/dashboard/cashier/invoices/[id]/page.tsx`
  - Added `exportInvoicePdf(invoice: CashierInvoice)` — builds a self-contained HTML doc containing: hospital name + logo placeholder; patient name, invoice #, date, status badge (colour-coded); itemised table (description, category, amount); insurance discount line + provider name when applicable; subtotal / total-due / amount-paid / remaining-balance summary (remaining coloured caution when > 0, positive when zero); payment method + payment date if the invoice is paid; notes line; generated-at footer. Opens in a `window.open` popup and calls `print()`.
  - Added "Export" ghost button (always visible, left of "Process payment"). Buttons grouped in a flex row.
  - Replaced stale `fmtLBP` references with `fmtEGP` throughout the file (currency standardisation).
  - Dropped unnecessary `(invoice as any).paid_at` casts — `paid_at` is already typed on `CashierInvoice`.

### Notes
- No new dependencies — same approach as `cashier/reports/page.tsx`'s `exportPdf`.
- FE lint: clean (0 errors on changed file). No backend changes.

## [2026-05-29] Cashier Flow Part 3 — Item 2: Real-time New Pending Payment Alert to Cashier (Full-stack)

When a pharmacy order is approved or a physical appointment is marked done, all cashiers now
get an instant alert (dashboard banner + persistent bell) and the pending-payments list refreshes.

### Backend
- `newSiryan_backEnd/src/services/notification.service.ts` (was a stub) — implemented `notifyCashiersOfPendingPayment({patientId, source, sourceId, description})`: resolves patient name from `Profile`, creates a persistent `Notification` per active cashier + `emitToUser(..., 'notification:new', ...)` (bell on every cashier page via `StaffShell`→`useNotifications`), then `emitToRole('cashier', 'payment:pending', {patient_id, patient_name, source, source_id, description})` for the live banner/refresh. Self-catching (never breaks caller).
- `newSiryan_backEnd/src/controllers/pharmacist/index.ts` — `approvePharmacyOrder` now calls the helper (`source:'pharmacy'`, "Approved pharmacy order"). (Existing `pharmacy:order:status` per-cashier emit + patient notification kept.)
- `newSiryan_backEnd/src/controllers/doctor/index.ts` — `createDiagnosis` captures `completedAppointmentType` from the completion `findOneAndUpdate`; when a visit completes and is **not** `online`, calls the helper (`source:'appointment'`, "Completed physical appointment"). Online visits are pre-paid (payment gate blocks completion until paid), so no alert.

### Frontend
- `newSiryan_frontEnd/src/types/index.ts` — added `PaymentPendingPayload`.
- `newSiryan_frontEnd/src/components/staff/cashier/PendingPaymentBanner.tsx` (new) — caution-toned banner (Wallet icon), "New payment pending for {patient_name}" + description, "View pending" + dismiss (mirrors `CheckedInBanner`).
- `newSiryan_frontEnd/src/app/dashboard/cashier/page.tsx` — subscribes to `payment:pending` via `useSocketEvent`, keeps a deduped (by `source:source_id`, max 5) alert list, renders banners above the KPI strip; "View pending" → `/dashboard/cashier/pending`.
- `newSiryan_frontEnd/src/hooks/useCashierPending.ts` — added `payment:pending` → `reload()` so the Pending page list updates automatically.

### Notes
- No model/route/validation changes — reused `emitToUser`/`emitToRole`, the per-role notification pattern, `useSocketEvent`/`useNotifications`.
- BE `tsc` build: 0 errors. FE lint: clean on changed files (pre-existing `no-empty-object-type` errors at `types/index.ts:843/845` are unrelated).
- Pre-existing currency inconsistency noted: cashier dashboard/reports still use `LBP` (`fmtLBP`) — not touched here; flagged for a follow-up sweep to EGP.

## [2026-05-29] Cashier Flow Part 3 — Item 1: Real-time Payment Notification to Admin (Full-stack)

When a cashier processes a payment (full **or** partial), all admins now get an instant
notification (persistent bell + live toast) and the revenue dashboard updates without refresh.

### Backend — `newSiryan_backEnd/src/controllers/cashier/index.ts`
- Added `resolvePatientName(patientId)` — looks up `Profile.first_name/last_name` (consistent with `createInvoice`); falls back to `'Patient'`.
- Added `notifyAdminsOfPayment({...})` — creates a persistent `Notification` per active admin + `emitToUser(..., 'notification:new', ...)` (drives the global bell on every admin page via `StaffShell`→`useNotifications`), then `emitToRole('admin', 'payment:received', {invoice_id, amount, patient_name, payment_method, status, total_due, is_partial})` for the live dashboard.
- `payInvoice`: patient name now from `resolvePatientName` (was `patient.username`); replaced the inline `emitToRole('payment:received')` with `notifyAdminsOfPayment({ isPartial:false })`.
- `partialPayInvoice`: **previously emitted nothing to admins** — now calls `notifyAdminsOfPayment({ isPartial: invoice.status !== 'paid' })` after the patient notification.

### Frontend
- `newSiryan_frontEnd/src/hooks/useAdmin.ts` — added `PaymentReceived` type + `useSocketEvent('payment:received', …)`: shows a toast (`success` for full / `info` for partial) and refetches `adminService.getDashboardStats()` so `total_revenue_today` stays authoritative (backend counts `status:'paid'` invoices by `total_due`, so a non-settling partial correctly leaves revenue unchanged).
- `newSiryan_frontEnd/src/app/dashboard/admin/page.tsx` — revenue card currency label `LBP` → `EGP` (backend uses EGP everywhere).

### Notes
- No model/route/validation changes — `payment:received` already existed; reused `emitToUser`/`emitToRole`, the `createInvoice` admin-notification pattern, and `useSocketEvent`/`useToast`.
- The admin bell needs no change: `StaffShell` already mounts `useNotifications` (listens `notification:new`).
- BE `tsc` build: 0 errors. FE lint: clean on both changed files (repo-wide pre-existing warnings unrelated).

## [2026-05-29] Cashier Flow Part 2 — Page 5: Daily Report + BUG-5 fix (Full-stack)

### Page 5: Daily Report (`/dashboard/cashier/reports`)
- `src/hooks/useCashierReport.ts` (new) — fetches `getDailyReport(date)`; `setDate` is wrapped to set loading in the event handler (keeps lint's no-setState-in-effect happy while still showing a spinner on date change).
- `src/app/dashboard/cashier/reports/page.tsx` (new) — date picker (max today), Total collected, By-payment-method + By-category breakdown cards, transaction list (reused `TodaysTransactions`), and **Export PDF** via a dependency-free print window (builds styled HTML + `window.print()`).
- `src/components/staff/cashier/TodaysTransactions.tsx` — added optional `title` prop so the report can reuse it.
- `src/config/navItems.tsx` — added "Daily Report" nav item to `cashierNav`. (Page-1 "Daily report" link now resolves.)

### BUG-5 fix (option a — manual invoice support)
- Backend `src/validations/cashier.validation.ts` — `invoiceItemLineSchema.source` now allows `'manual'`; `source_id` is optional.
- Backend `src/controllers/cashier/index.ts` — the "mark source records invoiced" loop skips `manual` items / missing `source_id`.
- `src/types/index.ts` — added `CreateInvoiceItemDto` + `CreateInvoiceDto`.
- `src/services/cashier.service.ts` — `createInvoice` now takes `CreateInvoiceDto` and POSTs the correct body.
- `src/hooks/useCashierDashboard.ts` — `createInvoice` signature → `CreateInvoiceDto`.
- `src/components/staff/cashier/CreateInvoiceModal.tsx` — rewritten: patient id + free-form line items (description, backend category enum, amount) → emits `{ patient_id, items:[{source:'manual', …}] }`. Hints that in-system charges should use the Pending page. **BUG-5 resolved.**

### Notes
- FE lint/tsc clean (tsc total unchanged); BE tsc 0 errors; BE lint clean for cashier files.
- **Cashier Part 2 frontend (Pages 1–5) is now complete.**

## [2026-05-29] Cashier Flow Part 2 — Page 4: Invoice Detail & Payment (Frontend)

New dedicated invoice-detail route `/dashboard/cashier/invoices/[id]` with full breakdown +
the reusable `PaymentModal`.

### Service
- `src/services/cashier.service.ts` — added `getCashierInvoice(id)` (single raw invoice; `getInvoiceById` doesn't enrich `patient_name`, so falls back to `patient.username`)

### Hook (new)
- `src/hooks/useCashierInvoice.ts` — loads one invoice, `{ invoice, loading, error, paymentOpen, setPaymentOpen, processPayment }`; processPayment routes full→`/pay`, partial→`/partial` and updates the loaded invoice.

### Page (new)
- `src/app/dashboard/cashier/invoices/[id]/page.tsx` — back link; header (patient, status badge, #id, date, method); items breakdown card (description + category + amount); insurance-discount line; notes; Total due / Paid / Remaining summary cards; "Process payment" → reused `PaymentModal` (method, Pay-full/Partial, amount, notes). Uses React 19 `use(params)` to unwrap the route promise. Loading / not-found states.

### Component
- `src/components/staff/cashier/InvoiceCard.tsx` — added an "Open" link to the detail route.

### Notes
- **BUG-5 reclassified:** can't be fixed frontend-only — backend requires `source` + `source_id` per item (no manual/other source), so free-form invoice creation needs a backend change or repointing the "New invoice" button at the Pending→Generate flow. Needs a product decision; left as-is.
- Lint/tsc clean; tsc total unchanged.

## [2026-05-29] Cashier Flow Part 2 — Page 3: Invoices (Frontend)

Rebuilt `/dashboard/cashier/invoices` to the spec: filter tabs (All/Unpaid/Paid/**Partial**),
patient-name search, card list with status + method badges, View-details expand, and a correct
Process-payment modal (full via `/pay`, partial via `/partial`). Fixes BUG-4 (tab filter now has
`partial`, not the dead `refunded`).

### Types
- `src/types/index.ts` — added `CashierInvoiceStatus`, `CashierPaymentMethod`, `CashierInvoiceItem`, `CashierInvoice`, `CashierPaymentInput` (raw invoice shape preserving `patient_name`, `amount_paid`, `partially_paid`, `mixed`)

### Service
- `src/services/cashier.service.ts` — added `getCashierInvoices({status?,date?})`, `payInvoiceFull(id, …)` (PATCH `/pay`), `payInvoicePartial(id, …)` (PATCH `/partial`, unwraps `{invoice, remaining_balance}`). All raw (no `normalizeInvoice`).

### Hook (new)
- `src/hooks/useCashierInvoices.ts` — list + tab filter (`all|unpaid|paid|partial`, mapped to backend statuses) + patient-name search + per-tab counts + `processPayment(id, input)` routing full/partial; reloads on pharmacy socket events.

### Components (new)
- `src/components/staff/cashier/InvoiceCard.tsx` — patient name, date, status + method `Badge`s, total/paid/remaining, Process-payment button (hidden when paid/cancelled), View-details expand (items + insurance line + totals + notes)
- `src/components/staff/cashier/PaymentModal.tsx` — method (cash/card/insurance/mixed), Pay-full / Partial toggle, amount (validated ≤ remaining), notes; remounted per invoice via `key` (no reset effect). Reusable for Page 4.

### Page
- `src/app/dashboard/cashier/invoices/page.tsx` — rewritten: header counts, tab bar, search input, card list with loading/error/empty states, `PaymentModal`.

### Cleanup (orphaned by this rewrite — deleted)
- `src/hooks/useCashier.ts`, `src/components/staff/cashier/{InvoiceTable,ProcessPaymentModal,GenerateConsolidatedInvoiceModal}.tsx` — no remaining importers. (`CreateInvoiceModal` kept — still used by Page 1; BUG-5 pending.)

### Notes
- BUG-4 resolved. The old `ProcessPaymentModal` (sent wrong `amount`/`bank_transfer` body) is gone; new `PaymentModal` sends the correct `amount_paid` + cash/card/insurance/mixed.
- Lint/tsc clean for all touched files; tsc total unchanged (pre-existing radiology/nurse errors only).

## [2026-05-29] Cashier Flow Part 2 — Page 2: Pending Payments (Frontend)

New `/dashboard/cashier/pending` page: lists patients with un-invoiced charges (checked-in
appointments + approved pharmacy orders + active room bookings) from `GET /cashier/pending`,
expandable per-patient breakdown, and per-patient "Generate invoice" → `POST /cashier/invoices`.

### Types
- `src/types/index.ts` — added `PendingItemType`, `PendingItem`, `PendingPatient`

### Service
- `src/services/cashier.service.ts` — added `getPending()` and `generateInvoiceFromPending(patientId, items)`. The latter maps each pending item's `type` → backend `source` + `category` and POSTs the **correct** createInvoice body (backend auto-computes insurance discount from the profile).

### Hook (new)
- `src/hooks/useCashierPending.ts` — fetches pending list, exposes `{ patients, loading, error, generatingId, generateInvoice, reload }`; `generateInvoice` returns a boolean and drops the patient from the list on success; reloads on `pharmacy:order:created/status`.

### Component (new)
- `src/components/staff/cashier/PendingPatientCard.tsx` — expandable card; collapsed shows name/charge-count/total + Generate button; expanded groups charges by type (Appointment / Pharmacy / Room / Lab / Radiology), shows insurance-discount line when applicable, subtotal, total due.

### Page (new)
- `src/app/dashboard/cashier/pending/page.tsx` — header + count/total, loading/error/empty states, list of `PendingPatientCard`; on successful generate, `router.push('/dashboard/cashier/invoices')`.

### Nav
- `src/config/navItems.tsx` — added "Pending" (`/dashboard/cashier/pending`, Inbox icon) to `cashierNav` between Payments and All Invoices.

### Notes
- Discovered pre-existing mismatch (logged as BUG-5): the existing `CreateInvoiceModal` (used by Pages 1 & 3) submits a frontend-shaped body (`line_items`, `total_amount`) but the backend `createInvoiceSchema` requires `items[{source, source_id, category, amount}]` — so manual invoice creation via that modal likely 422s. Page 2's generate flow sends the correct body and is unaffected. Fix the modal when building Page 4.
- Lint/tsc clean for all touched files.

## [2026-05-29] Cashier Flow Part 2 — Page 1: Main Dashboard (Frontend)

Rebuilt `/dashboard/cashier` to match the Part 2 spec. Previously it duplicated the `/invoices` page
(same `useCashier` + full `InvoiceTable`) and computed all numbers client-side from an unfiltered
`getInvoices()`. Now it sources summary + transactions from the real `/cashier/reports/daily` endpoint.

### Types
- `newSiryan_frontEnd/src/types/index.ts` — added `DailyTransaction` + `DailyReport` (raw, un-normalized report shapes; preserve `patient_name`, `mixed` method, `paid_at` that `normalizeInvoice` drops)

### Service
- `newSiryan_frontEnd/src/services/cashier.service.ts` — added `getDailyReport(date?)` (calls `/cashier/reports/daily`, returns raw `DailyReport` — NOT routed through `normalizeInvoice`)

### Hook (new)
- `newSiryan_frontEnd/src/hooks/useCashierDashboard.ts` — focused Page-1 hook; fetches daily report + invoices in parallel, derives 4 summary cards (collectedToday, pendingCount, paidTodayCount, partialPendingCount), exposes today's transactions + New-Invoice modal state/handler; reloads on `pharmacy:order:created/status`. `useCashier` left untouched so Page 3 is unaffected.

### Component (new)
- `newSiryan_frontEnd/src/components/staff/cashier/TodaysTransactions.tsx` — today's paid/partial transactions list (patient name, time, payment-method chip, amount_paid); Spinner loading + EmptyState empty states

### Page
- `newSiryan_frontEnd/src/app/dashboard/cashier/page.tsx` — rewritten: header "Dashboard", `DoctorKPIStrip` with the 4 spec cards, `TodaysTransactions`, `CreateInvoiceModal`. Quick actions = "New invoice" + "Daily report" link (→ `/dashboard/cashier/reports`, Page 5, pending). Removed the InvoiceTable, the Cash/Card/Insurance "Daily revenue summary" row, and the One-click/GenerateConsolidated modal.

### Notes
- Lint/tsc clean for all touched files (pre-existing repo-wide `no-explicit-any` + a few radiology/nurse tsc errors are unrelated).

## [2026-05-28] Cashier Flow Part 1 — Backend

### Schema Changes
- `newSiryan_backEnd/src/models/Invoice.ts` — added `amount_paid` (Number default 0), `notes` (String optional), `issued_by` (ObjectId ref User)
- `newSiryan_backEnd/src/models/Profile.ts` — added `insurance_discount_pct` (Number 0–1, default 0)

### Socket.io
- `newSiryan_backEnd/src/config/socket.ts` — each connection now joins `role:{role}` room; added `emitToRole(role, event, payload)` export

### Validation
- `newSiryan_backEnd/src/validations/cashier.validation.ts` — rewrote `createInvoiceSchema` (patient_id + items with source/source_id, insurance auto-calc); updated `payInvoiceSchema` (added amount_paid, notes); added `partialPaySchema`

### Controller
- `newSiryan_backEnd/src/controllers/cashier/index.ts` — added `getPendingPayments`, `partialPayInvoice`, `getDailyReport`, `getPatientHistory`; replaced `createInvoice` (auto insurance discount, marks source items, notifies patient + admins); enhanced `payInvoice` (amount_paid, notes, receipt notification, admin Socket.io); enhanced `getInvoices` (date filter, patient names)

### Routes
- `newSiryan_backEnd/src/routes/cashier.routes.ts` — registered GET `/pending`, PATCH `/invoices/:id/partial`, GET `/reports/daily`, GET `/patients/:patientId/history`; updated POST `/invoices` and PATCH `/invoices/:id/pay`

---

## [2026-05-28] Receptionist Flow Part 3 — Real-time & Edge Cases

### Item 1: Real-time Check-in Notification to Doctor
- `newSiryan_frontEnd/src/types/index.ts` — added `PatientCheckedInPayload`
- `newSiryan_frontEnd/src/components/doctor/CheckedInBanner.tsx` — new info-colored banner (UserCheck icon, "View appointment" button)
- `newSiryan_frontEnd/src/app/dashboard/doctor/page.tsx` — subscribes to `patient:checked_in` socket event, renders `CheckedInBanner` list

### Item 2: Real-time Cancellation/Reschedule Request to Receptionist
- `newSiryan_backEnd/src/controllers/doctor/index.ts` — `notifyReceptionists()` now accepts `socketPayload?` and emits to each receptionist; `cancelRequest` + `rescheduleRequest` query profiles for real names and pass `doctor:request:new` payload
- `newSiryan_frontEnd/src/types/index.ts` — added `DoctorRequestPayload`
- `newSiryan_frontEnd/src/components/staff/receptionist/DoctorRequestBanner.tsx` — new caution-colored banner with "Review" button
- `newSiryan_frontEnd/src/app/dashboard/receptionist/page.tsx` — subscribes to `doctor:request:new`, renders request alert banners
- `newSiryan_frontEnd/src/app/dashboard/receptionist/requests/page.tsx` — subscribes to `doctor:request:new`, prepends new request to list and switches to matching tab

### Item 3: Appointment Confirmation Notification Flow
- `newSiryan_backEnd/src/controllers/receptionist/index.ts` — added `User` + `sendEmail` imports; `confirmAppointment` now emits `notification:new` to patient + doctor via socket; sends branded HTML confirmation email to patient (fire-and-forget)

### Item 4: Edge Cases
- `newSiryan_backEnd/src/controllers/receptionist/index.ts` — `checkinPatient`: guards against cancelled/already-checked-in when `appointment_id` provided; `confirmAppointment`: changed to `findOneAndUpdate` with `$nin` status guard, returns descriptive error
- `newSiryan_backEnd/src/controllers/doctor/index.ts` — `cancelRequest`: if status is `checked_in`, emits `appointment:conflict` to all receptionists + creates warning notifications, returns 409 to doctor
- `newSiryan_frontEnd/src/types/index.ts` — added `AppointmentConflictPayload`
- `newSiryan_frontEnd/src/components/staff/receptionist/ConflictWarningBanner.tsx` — new critical-colored banner for doctor/checked-in conflicts
- `newSiryan_frontEnd/src/app/dashboard/receptionist/page.tsx` — subscribes to `appointment:conflict`, renders `ConflictWarningBanner`
- Medical records/diagnoses/prescriptions/lab results: already protected by `authorize()` middleware at router level — no changes needed

---

## [2026-05-28] Workspace Initialization
- created: `.claude/memory.md` — compressed global project state
- created: `.claude/architecture.md` — stack, auth flow, DB design, request pipeline
- created: `.claude/conventions.md` — styling, validation, component/hook patterns
- created: `.claude/current-task.md` — active task tracker
- created: `.claude/bugs.md` — bug tracker
- created: `.claude/changelog.md` — this file
- created: `.claude/todos.md` — pending work and tech debt
- created: `.claude/dependency-map.md` — system dependency relationships
- created: `.claude/feature-map.md` — feature inventory by role
- created: `.claude/file-index.md` — important file index
- created: `.claude/context-loader.md` — task-to-files routing guide
- created: `.claude/task-router.md` — task-to-system mapping
- created: `.claude/ownership.md` — system ownership map
