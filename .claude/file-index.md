# File Index

> NOTE: Paths below use the legacy `newSiryan_backEnd/` prefix from the original plan.
> The real location is `apps/backend/` (monorepo). New entries use the correct path.

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

## Frontend — Hooks (Real-time)
newSiryan_frontEnd/src/hooks/useSocketEvent.ts
- Generic hook: useSocketEvent<T>(event, handler) — registers/cleans up socket listener

newSiryan_frontEnd/src/hooks/useNotifications.ts
- Manages notification state; listens to notification:new; polls every 30s as fallback
