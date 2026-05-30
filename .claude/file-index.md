# File Index

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
