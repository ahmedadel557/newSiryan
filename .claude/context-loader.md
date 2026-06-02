# Context Loader

Defines which files to read for each task type. Load ONLY these — avoid reading unrelated files.

## Auth Tasks
- newSiryan_backEnd/src/routes/auth.ts
- newSiryan_backEnd/src/controllers/auth/
- newSiryan_backEnd/src/services/auth.service.ts
- newSiryan_backEnd/src/middlewares/authenticate.ts
- newSiryan_backEnd/src/config/passport.ts
- newSiryan_frontEnd/src/middleware.ts
- newSiryan_frontEnd/src/services/auth.service.ts
- newSiryan_frontEnd/src/context/AuthContext.tsx
- newSiryan_frontEnd/src/app/auth/ (relevant page)

## Patient Feature Tasks
- newSiryan_frontEnd/src/app/dashboard/patient/[feature]/
- newSiryan_frontEnd/src/components/patient/
- newSiryan_frontEnd/src/hooks/usePatient*.ts (relevant hook)
- newSiryan_frontEnd/src/services/patient.service.ts
- newSiryan_backEnd/src/routes/patient.ts
- newSiryan_backEnd/src/controllers/patient/
- newSiryan_backEnd/src/services/patient.service.ts (if exists)

## Doctor Feature Tasks
- apps/frontend/src/app/dashboard/doctor/[feature]/
- apps/frontend/src/components/doctor/
- apps/frontend/src/hooks/useDoctor*.ts
- apps/frontend/src/services/doctor.service.ts
- apps/backend/src/routes/doctor.routes.ts
- apps/backend/src/controllers/doctor/        (index.ts = existing features; video/notes/queue.controller.ts = Part 1)
- apps/backend/src/services/doctor.service.ts  (video, notes, today-queue)
- apps/backend/src/validations/doctor.validation.ts
- apps/backend/src/config/stream.ts            (Stream Video client)

## Admin Tasks
- newSiryan_frontEnd/src/app/dashboard/admin/
- newSiryan_frontEnd/src/components/staff/admin/
- newSiryan_backEnd/src/routes/admin.ts
- newSiryan_backEnd/src/controllers/admin/
- newSiryan_backEnd/src/models/User.ts + AuditLog.ts

## Backend API Tasks (new route/endpoint)
- apps/backend/src/app.ts (route mounting)
- apps/backend/src/routes/[domain].routes.ts
- apps/backend/src/controllers/[domain]/
- apps/backend/src/services/[domain].service.ts (note: most existing controllers hold their own logic; appointment.service.ts is a stub)
- apps/backend/src/validations/[domain].validation.ts
- apps/backend/src/models/[Model].ts (relevant models)
- apps/backend/src/utils/response.ts (sendSuccess / sendError)

## Styling / UI Tasks
- newSiryan_frontEnd/src/styles/tokens.css
- newSiryan_frontEnd/src/styles/kit.css
- newSiryan_frontEnd/src/app/globals.css
- Component file being modified

## Database / Model Tasks
- newSiryan_backEnd/src/models/[Model].ts
- newSiryan_backEnd/src/config/database.ts
- newSiryan_backEnd/src/seeds/ (if seeding related)

## Real-time / Notifications Tasks
- newSiryan_backEnd/src/config/socket.ts
- newSiryan_frontEnd/src/services/socket.client.ts
- newSiryan_frontEnd/src/hooks/useSocketEvent.ts
- newSiryan_frontEnd/src/hooks/useNotifications.ts
- newSiryan_frontEnd/src/components/shared/NotificationBell.tsx

## Billing / Cashier Tasks
- newSiryan_frontEnd/src/app/dashboard/cashier/
- newSiryan_frontEnd/src/services/cashier.service.ts
- newSiryan_backEnd/src/routes/cashier.ts (or billing.ts)
- newSiryan_backEnd/src/services/billing.service.ts
- newSiryan_backEnd/src/models/Invoice.ts + InvoiceItem.ts
- newSiryan_backEnd/src/utils/pricing.ts
