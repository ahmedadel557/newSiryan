# File Index

> NOTE: Paths below use the legacy `newSiryan_backEnd/` prefix from the original plan.
> The real location is `apps/backend/` (monorepo). New entries use the correct path.

## Frontend — Data layer: TanStack Query v5 (Admin + Cashier, 2026-06-02)
apps/frontend/src/lib/queryClient.ts                — singleton QueryClient (30s stale, 5min gc, retry policy)
apps/frontend/src/lib/queryKeys.ts                  — central key registry for admin + cashier queries
apps/frontend/src/providers/QueryProvider.tsx       — `'use client'` QueryClientProvider + devtools wrapper
apps/frontend/src/hooks/admin/useAdminUsers.ts            — users list + create/updateRole/toggleActive/delete/updateProfile
apps/frontend/src/hooks/admin/useAdminStaffRequests.ts    — staff requests + approve/reject (socket: staff_request:new)
apps/frontend/src/hooks/admin/useAdminAppointments.ts     — appointments + cancel mutation
apps/frontend/src/hooks/admin/useAdminInvoices.ts         — admin invoices + create (sockets: invoice:new, payment:received)
apps/frontend/src/hooks/admin/useAdminReports.ts          — revenue/ratings/occupancy/pharmacy/doctor (revenue subscribes to payment:received)
apps/frontend/src/hooks/admin/useAdminDashboardStats.ts   — stats + low-stock + payment:received toast
apps/frontend/src/hooks/admin/useAdminAuditLog.ts         — audit log (used by audit + audit-log pages)
apps/frontend/src/hooks/admin/index.ts                    — barrel export (re-exports UserRoleFilter)
apps/frontend/src/hooks/cashier/useCashierInvoices.ts     — list + payment/cancel (sockets: pharmacy:order:*)
apps/frontend/src/hooks/cashier/useCashierInvoice.ts      — single invoice + payment/cancel
apps/frontend/src/hooks/cashier/useCashierPending.ts      — pending list + generate (sockets: payment:pending, pharmacy:order:*)
apps/frontend/src/hooks/cashier/useCashierReport.ts       — daily report
apps/frontend/src/hooks/cashier/useCashierDashboard.ts    — summary + transactions + createInvoice
apps/frontend/src/hooks/cashier/index.ts                  — barrel export
(layout.tsx wraps QueryProvider outermost; 13 admin/cashier pages + OccupancySection + RevenueChart migrated; old useAdmin/useCashier* hooks deleted)

## Frontend — Doctor: Video Call + In-Call Chat (Part 3, 2026-06-02)
apps/frontend/src/hooks/useVideoCall.ts            — doctor call lifecycle (POST create → join → end)
apps/frontend/src/hooks/usePatientVideoCall.ts     — patient call lifecycle (GET token → join → leave)
apps/frontend/src/hooks/useInCallChat.ts           — Stream Chat channel keyed by callId (best-effort)
apps/frontend/src/components/doctor/video/ParticipantVideo.tsx  — headless track binding
apps/frontend/src/components/doctor/video/RemoteVideoTile.tsx   — remote participant + waiting state
apps/frontend/src/components/doctor/video/LocalVideoTile.tsx    — PiP local tile
apps/frontend/src/components/doctor/video/CallControls.tsx      — mic/camera/chat/end controls
apps/frontend/src/components/doctor/video/InCallChat.tsx        — custom chat panel
apps/frontend/src/components/doctor/video/CallStatusOverlay.tsx — connecting overlay
apps/frontend/src/components/doctor/video/VideoCallLayout.tsx   — composes the call UI (shared)
apps/frontend/src/app/dashboard/doctor/video/[appointmentId]/page.tsx   — doctor call page
apps/frontend/src/app/dashboard/patient/video/[appointmentId]/page.tsx  — patient call page
(service: doctor createVideoCall/endVideoCall, patient getVideoCallToken; AppointmentRow + online placeholder wired)

## Frontend — Doctor: Queue / Notes / Ratings / Notifications (Part 2, 2026-06-02)
apps/frontend/src/hooks/useDoctorQueue.ts        — today's queue (60s refresh + socket sync)
apps/frontend/src/hooks/useDoctorNotes.ts        — per-patient private notes CRUD
apps/frontend/src/hooks/useDoctorRatings.ts      — wraps doctorService.getMyRatings()
apps/frontend/src/components/doctor/RatingStars.tsx   — read-only star display
apps/frontend/src/components/doctor/QueueItem.tsx     — queue row + conditional Start-video button
apps/frontend/src/components/doctor/NoteEditor.tsx    — private-notes panel (used in NotesTab)
apps/frontend/src/app/dashboard/doctor/queue/page.tsx          — today's queue page
apps/frontend/src/app/dashboard/doctor/ratings/page.tsx        — my ratings page
apps/frontend/src/app/dashboard/doctor/notifications/page.tsx  — notifications page
apps/frontend/src/app/dashboard/doctor/video/[appointmentId]/page.tsx — Part 3 placeholder
(service methods getTodayQueue/notes CRUD/getVideoCallToken added to apps/frontend/src/services/doctor.service.ts)

## Backend — Doctor: Video / Notes / Queue (Part 1, 2026-06-02)
apps/backend/src/config/stream.ts
- Guarded Stream `StreamClient` singleton (`@stream-io/node-sdk`); `getStreamClient()` throws 503 if unconfigured
apps/backend/src/models/VideoCall.ts
- Maps an appointment to a Stream call (status waiting/active/ended, started/ended timestamps)
apps/backend/src/models/DoctorNote.ts
- Doctor-private per-patient notes (optional appointment link)
apps/backend/src/services/doctor.service.ts
- First real service: video get-or-create/end/token, notes CRUD, today-queue (throws status-bearing errors)
apps/backend/src/controllers/doctor/video.controller.ts
- createVideoCall, endVideoCall, getVideoToken (thin → doctor.service)
apps/backend/src/controllers/doctor/notes.controller.ts
- createNote, getNotes, updateNote, deleteNote (thin → doctor.service)
apps/backend/src/controllers/doctor/queue.controller.ts
- getTodayQueue (thin → doctor.service)

## Backend — Entry & Config
newSiryan_backEnd/src/server.ts
- bootstraps Mongo → seed → Redis → cron jobs → Express listen

newSiryan_backEnd/src/app.ts
- Express app setup, middleware registration, route mounting

newSiryan_backEnd/src/config/database.ts
- Mongoose connection

newSiryan_backEnd/src/config/redis.ts
- Redis client setup

newSiryan_backEnd/src/config/passport.ts
- Google OAuth Passport strategy

newSiryan_backEnd/src/config/socket.ts
- Socket.io server initialization

newSiryan_backEnd/src/config/upload.ts
- Multer configuration (serves at /api/uploads/)

## Backend — Middleware
newSiryan_backEnd/src/middlewares/authenticate.ts
- JWT cookie verification, populates req.user

newSiryan_backEnd/src/middlewares/authorize.ts
- Role-based access control

newSiryan_backEnd/src/middlewares/validateRequest.ts
- Zod schema validation on req.body

newSiryan_backEnd/src/middlewares/errorHandler.ts
- Central error handler

## Backend — Utilities
newSiryan_backEnd/src/utils/response.ts
- sendSuccess / sendError helpers (used by ALL controllers)

newSiryan_backEnd/src/utils/audit.ts
- Fire-and-forget audit logging

newSiryan_backEnd/src/utils/mailer.ts
- Nodemailer email sending

newSiryan_backEnd/src/utils/pricing.ts
- Billing/pricing calculations

## Backend — Services (business logic)
newSiryan_backEnd/src/services/auth.service.ts
newSiryan_backEnd/src/services/appointment.service.ts
newSiryan_backEnd/src/services/billing.service.ts
(+ 5 more service files for other domains)

## Frontend — Core
newSiryan_frontEnd/src/middleware.ts
- JWT decode, role routing enforcement, redirect logic

newSiryan_frontEnd/src/types/index.ts
- ALL domain types (User, Profile, Appointment, MedicalRecord, etc.)

newSiryan_frontEnd/src/app/globals.css
- Imports tokens.css, kit.css, Tailwind base

## Frontend — Services & API
newSiryan_frontEnd/src/services/api.client.ts
- Axios instance with 401 interceptor and token refresh

newSiryan_frontEnd/src/services/socket.client.ts
- Socket.io client connection

newSiryan_frontEnd/src/services/auth.service.ts
newSiryan_frontEnd/src/services/patient.service.ts
newSiryan_frontEnd/src/services/doctor.service.ts
(+ 11 more service files, one per role/domain)

## Frontend — Design System
newSiryan_frontEnd/src/styles/tokens.css
- All CSS custom properties (colors, type scale, spacing, radius, shadows, motion)

newSiryan_frontEnd/src/styles/kit.css
- Utility component classes (.btn, .card, .badge, .input, layout shells)

## Frontend — Navigation
newSiryan_frontEnd/src/config/navItems.tsx
- roleNavMap: sidebar navigation items per role

## Frontend — Layout
newSiryan_frontEnd/src/app/layout.tsx
- Root layout: next-themes provider, font setup

newSiryan_frontEnd/src/components/shared/
- DashboardShell, Sidebar, NotificationBell, AuthShell

## Frontend — Real-time Banner Components
newSiryan_frontEnd/src/components/doctor/CheckedInBanner.tsx
- Info-colored banner: patient checked in → shown on doctor dashboard (patient:checked_in)

newSiryan_frontEnd/src/components/doctor/EmergencyAlertBanner.tsx
- Critical-colored banner: nurse emergency flag → shown on doctor dashboard

newSiryan_frontEnd/src/components/doctor/LabResultBanner.tsx
- Positive-colored banner: lab/radiology results ready → shown on doctor dashboard

newSiryan_frontEnd/src/components/staff/receptionist/DoctorRequestBanner.tsx
- Caution-colored banner: doctor cancel/reschedule request → shown on receptionist dashboard

newSiryan_frontEnd/src/components/staff/receptionist/ConflictWarningBanner.tsx
- Critical-colored banner: doctor tried to cancel a checked-in patient → shown on receptionist dashboard

## Frontend — Hooks (Role-based, TanStack Query v5)

All hooks are in `apps/frontend/src/hooks/`. The folder structure after Part 1–3 migration:

```
hooks/
  index.ts              ← root barrel (conflict-safe aliases for QueueFilter clash)
  admin/                ← 7 TanStack hooks + index.ts (useAdminUsers, useAdminStaffRequests, etc.)
  cashier/              ← 5 TanStack hooks + index.ts
  doctor/               ← 5 TanStack hooks + index.ts (useDoctor, useDoctorNotes, useDoctorQueue, useDoctorRatings, useDoctorSchedule)
  patient/              ← 7 TanStack hooks + index.ts (usePatientAppointments, usePatientBilling, usePatientProfile, usePatientRecord, usePatientRecords, usePatientRequests, usePharmacy)
  nurse/                ← 1 TanStack hook + index.ts (useNurse — fan-out query)
  receptionist/         ← 1 TanStack hook + index.ts (useReceptionist — 4 parallel queries)
  pharmacist/           ← 8 TanStack hooks + index.ts
  lab/                  ← 1 TanStack hook + index.ts (useLab)
  radiology/            ← 1 TanStack hook + index.ts (useRadiology)
  inventory/            ← 7 hooks + index.ts (6 focused + useInventory combining wrapper)
  shared/               ← 14 non-TanStack hooks + index.ts (useAuth, useToast, useSocketEvent,
                           useNotifications [TanStack], useChatbot, useMediaQuery, useBooking,
                           useVideoCall, usePatientVideoCall, useInCallChat, useRooms,
                           useSettings, useUsernameCheck, useWaitingEstimate)
```

Import from: `@/hooks/[role]` or `@/hooks` (root). Old `@/hooks/useXxx` barrel files deleted.

Key files:
apps/frontend/src/hooks/index.ts                   — root barrel (all roles)
apps/frontend/src/hooks/shared/useSocketEvent.ts   — Generic useSocketEvent<T>(event, handler)
apps/frontend/src/hooks/shared/useNotifications.ts — TanStack Query (refetchInterval 30s, socket → setQueryData)
apps/frontend/src/lib/queryKeys.ts                 — ALL query key factories (admin through notifications/chatbot)
apps/frontend/src/lib/queryClient.ts               — Singleton QueryClient
apps/frontend/src/providers/QueryProvider.tsx      — QueryClientProvider wrapper

## Backend — Role-Based Departments (2026-06-05)
apps/backend/src/models/Department.ts            — + assigned_roles: string[], is_active: boolean
apps/backend/src/routes/department.routes.ts     — NEW public route: GET /api/departments/by-role?role=
apps/backend/src/controllers/admin/index.ts      — + updateDepartment, getDepartmentsByRole; getDepartments(?includeInactive); deleteDepartment now soft-delete
apps/backend/src/validations/admin.validation.ts — departmentRoleEnum; create/updateDepartmentSchema (assigned_roles, is_active)
apps/backend/src/routes/admin.routes.ts          — + PUT /api/admin/departments/:id
apps/backend/src/services/auth.service.ts        — registerStaff validates department active + role-allowed
apps/backend/src/seeds/departments.seed.ts       — assigned_roles per dept + Pharmacy/Laboratory/Radiology/Billing/Administration; non-destructive backfill
apps/backend/src/app.ts                          — mounts /api/departments
(department stays a NAME string on Profile; User model unchanged; /doctor/list already filters by department name)
