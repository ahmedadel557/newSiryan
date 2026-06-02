# Project Memory

## System
NewSiryan — hospital management platform. Full-stack monorepo.
- `newSiryan_backEnd/` — Node.js + Express + TypeScript + MongoDB + Redis
- `newSiryan_frontEnd/` — Next.js 16 + App Router + TypeScript

## RBAC
10 roles: `patient`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `inventory_manager`, `lab_technician`, `radiology_technician`, `cashier`, `admin`

## Auth
JWT stored as HttpOnly cookies (`access_token` 15min, `refresh_token` 7d). Payload: `{ id, role, ipc, pwc }`. Google OAuth via Passport. Incomplete profiles → short-lived token only.
- `ipc` = is_profile_complete; `pwc` = password_changed (false on admin-created accounts)
- `makeTokens(id, role, ipc=true, pwc=true)` in `auth.service.ts`
- Middleware redirects `!pwc` users to `/auth/change-password` before any other page
- `POST /auth/change-password` — `{ newPassword }`, sets `password_changed=true`, re-issues tokens

**Two staff registration flows (both coexist):**
1. Self-registration `POST /auth/register`: status=pending, password_changed=true, emits `staff_request:new` to admin
2. Admin-creation `POST /admin/users`: status=active, password_changed=false, temp password emailed, no approval needed

## Stream Video + Chat (Doctor system, 2026-06-02) — ALL 3 PARTS COMPLETE
- Backend (P1): `src/config/stream.ts` (`@stream-io/node-sdk`, `getStreamClient()` 503 if unconfigured),
  models `VideoCall`/`DoctorNote`, `services/doctor.service.ts` (video get-or-create/end/token, notes, queue).
  Routes: `POST /api/doctor/video/call/:appointmentId` (doctor opens — getOrCreate Stream call),
  `POST /api/doctor/video/call/:callId/end`, `GET /api/doctor/video/token/:appointmentId` (doctor+patient).
  Env: `STREAM_API_KEY`/`STREAM_API_SECRET`. Server `generateUserToken` valid for both Video AND Chat.
- Frontend (P3): `@stream-io/video-react-sdk` 1.37.4 + `stream-chat` (NO `stream-chat-react`).
  Custom UI only — `<StreamVideo>`/`<StreamCall>` headless providers + `useCallStateHooks`;
  video rendered via `call.bindVideoElement`/`bindAudioElement` (NO ParticipantView/SpeakerLayout/StreamTheme).
  Hooks: `useVideoCall` (doctor), `usePatientVideoCall` (patient), `useInCallChat`. Components in
  `components/doctor/video/`. Pages: `/dashboard/{doctor,patient}/video/[appointmentId]`.
  `apiKey` comes from the token response (env `NEXT_PUBLIC_STREAM_API_KEY` is fallback only).
- IMPORTANT: project icons are **lucide-react** (not react-icons); data fields are snake_case.
- E2E needs real Stream creds; in-call chat needs the Chat product enabled on the Stream app.

## Backend State
- Entry: `src/server.ts` → Mongo → seed → Redis → cron → initSocket → attachRedisAdapter → listen
- 14 route files, 14 controller folders, 8 service files, 25 Mongoose models
- Validation: Zod. Response helpers: `sendSuccess` / `sendError`
- 3 cron jobs: inventoryAlert, appointmentReminder, profileCleanup
- Audit logging is fire-and-forget (never blocks)

## Redis Integration (2026-05-30) — ALL PARTS COMPLETE
- `src/config/cacheTtl.ts` — TTL constants + CACHE_KEYS namespaced factory
- `src/utils/cache.ts` — `cache.get<T> / set / del` — always try/catch, never throws, returns null on Redis error
- `src/middlewares/redisRateLimiter.ts` — `createRedisRateLimiter({ keyPrefix, max, windowSeconds, getKey? })` factory
- `src/config/socket.ts` — `attachRedisAdapter()` uses `redisClient.duplicate()` for sub client; graceful if Redis down

### Cache keys in use (all in CACHE_KEYS):
- `settings:pricing` (1h) — admin pricing settings; invalidated on any price/lab/radiology CRUD
- `schedule:doctor:{id}` (15min) — doctor's own schedule; invalidated on block/unblock/admin override
- `slots:{doctorId}:{date}` (5min) — available appointment slots; invalidated on booking/block/unblock
- `pharmacy:medications` (30min) — medication list; invalidated on order approve + warehouse stock assign
- `insurance:companies` (1h) — full list for admin; `insurance:companies:active` (1h) — active-only for patient
- `rooms:availability` (5min) — unfiltered room list; invalidated on create/update/status/delete/booking
- `profile:{userId}` (10min) — patient profile; invalidated on updateProfile
- `blacklist:{sha256(token)}` (TTL = token remaining expiry) — logout token blacklist

### Rate limits (Redis-backed, fallback to allow on Redis down):
- `POST /api/auth/login` — 10/15min/IP
- `POST /api/auth/register` + `/register/staff` — 5/1h/IP
- `POST /api/patient/chatbot` — 20/1h/userId

## Socket.io Event Catalog (Backend → Frontend)
| Event | Emitter | Receiver | Payload |
|---|---|---|---|
| `notification:new` | all controllers | any user | `Notification` document JSON |
| `patient:checked_in` | receptionist/checkinPatient | doctor | `PatientCheckedInPayload` |
| `doctor:request:new` | doctor/cancelRequest + rescheduleRequest | all receptionists | `DoctorRequestPayload` |
| `appointment:conflict` | doctor/cancelRequest (checked_in guard) | all receptionists | `AppointmentConflictPayload` |
| `emergency:flag` | nurse controller | doctor | `EmergencyFlagPayload` |
| `lab:order:completed` | lab controller | doctor | `LabOrderCompletedPayload` |
| `radiology:order:completed` | radiology controller | doctor | `RadiologyOrderCompletedPayload` |
| `appointment:status` | multiple | doctor | appointment update |
| `pharmacy:order:created` | pharmacy | receptionist | — |
| `room:booking:requested` | room booking | — | — |
| `invoice:created` | cashier/createInvoice | patient | `{ id, total_due, item_count }` |
| `invoice:new` | cashier/createInvoice | role:admin | `{ id, total_due, patient_name }` |
| `payment:received` | cashier/payInvoice + partialPayInvoice (via `notifyAdminsOfPayment`) | role:admin | `{ invoice_id, amount, patient_name, payment_method, status, total_due, is_partial }` |
| `notification:new` (payment) | cashier/payInvoice + partialPayInvoice (via `notifyAdminsOfPayment`) | each active admin | persistent `Notification` (title 'Payment Received'/'Partial Payment Received') |
| `payment:pending` | pharmacist/approvePharmacyOrder + doctor/createDiagnosis (physical) via `notifyCashiersOfPendingPayment` | role:cashier | `{ patient_id, patient_name, source:'pharmacy'\|'appointment', source_id, description }` |
| `notification:new` (pending) | same as `payment:pending` | each active cashier | persistent `Notification` (title 'New payment pending') |
| `staff_request:new` | auth/registerStaff (self-registration) | role:admin | `{ user_id, name, role }` |
| `pharmacy:order:approved` | pharmacist/approvePharmacyOrder + approvePrescriptionOrder | role:admin | `{ order_id, patient_id, total, type:'otc'\|'prescription' }` |
| `inventory:low_stock` | pharmacist/sendLowStockAlerts | inventory_manager (per-user) + role:pharmacist | `{ medication_id, name, stock_quantity, threshold, severity }` |
| `pharmacy:expiry_alert` | pharmacyExpiry.job (8AM cron) | role:pharmacist | `{ items: [{ name, expiry_date, type, urgent }] }` |
| `pharmacy:expiry_alert_urgent` | pharmacyExpiry.job (8AM cron) | role:pharmacist | `{ items: [...] }` — only items with expiry ≤7 days |

## Key Backend Patterns
- Notifications: `Notification.create(...)` + `emitToUser(userId, 'notification:new', notif.toJSON())`
- Broadcast to role: `emitToRole(role, event, payload)` — emits to `role:{role}` socket room (all connected users of that role)
- `emitToUser(userId, event, payload)` — emits to `user:{userId}` socket room
- Email: `sendEmail(to, subject, html).catch(() => {})` — always fire-and-forget, never blocks response

## Invoice / Billing
- `Invoice` model: `amount_paid` (default 0), `notes?`, `issued_by?` (cashier ObjectId) — added 2026-05-28
- `Profile` model: `insurance_discount_pct` (0–1, default 0) — auto-discount calc on invoice creation
- `User` model: `password_changed` (Boolean, default true) — false on admin-created accounts
- Insurance flow: `insurance_coverage = subtotal × profile.insurance_discount_pct`, `total_due = subtotal - coverage`
- Cashier — all parts complete (Parts 1–3). Admin invoices: `POST /admin/invoices` (admin creates manual invoice with patient + line items + insurance coverage).

## Admin Module — ALL PARTS COMPLETE (Parts 1–6 + Part 3 Full Feature Set) (2026-05-29)
Key guards:
- Admin cannot change own role or delete own account (403); cannot deactivate own account (403)
- Insurance cascade: deleting InsuranceCompany clears all patient profiles + notifies each patient
- Admin-created accounts: `password_changed=false` → JWT `pwc` claim → middleware redirect to change-password page
- `UsersTable` accepts `currentUserId?` prop; self-action buttons (edit role, deactivate, delete) disabled in UI
- "Not yet activated" caution badge: `password_changed===false && age > 48h`
- `deleteLabTest` / `deleteRadiologyScan`: blocked (409) if pending LabOrder/RadiologyOrder references the test/scan
- `assignShift`: blocked (409) if staff already has a shift overlapping the requested period
- `approveDeletion`: blocked (400) if patient has pending appointments or unpaid/partial invoices

Admin endpoints (backend `/api/admin/`):
- Users CRUD + role/status/profile edit (`PATCH /users/:id/profile`)
- Staff requests approve/reject
- Insurance CRUD (with cascade delete)
- Departments CRUD + `PUT /staff/:id/department` + `GET /departments/:id/staff`
- Appointments oversight: `GET /appointments` + `DELETE /appointments/:id`
- Invoices: `GET /invoices` + `POST /invoices`
- Reports: revenue, ratings, doctors, occupancy, pharmacy
- Audit log
- Doctor schedules: `GET/PUT/DELETE /doctors/:id/schedule`, `GET /schedules`
- Shifts: full CRUD + `GET /shifts/today` (grouped by department)
- Pricing: `GET/PUT /settings/pricing` + lab/radiology item CRUD (8 routes); public `GET /api/settings/pricing` (no auth, Redis 1h TTL)
- Announcements: `POST/GET/DELETE /announcements` (Socket.io broadcast + Notifications on create)
- Maintenance: `POST/DELETE/GET /system/maintenance` (Redis `system:maintenance` key + Socket.io `system_maintenance`/`system_online`)
- Email templates: `GET/PUT /email-templates/:name`
- GDPR: `POST /export/patient/:id` (JSON or pdfkit PDF), `GET/PATCH /deletion-requests/:id/approve|reject`
- System health: `GET /system/health` (mongo/redis/socket/uptime/memory), `GET /system/logs`

New models: Shift, PricingSettings, Announcement, EmailTemplate, DeletionRequest
New seeds: pricingSettings.seed.ts, emailTemplates.seed.ts (7 templates)
New middleware: maintenanceMode.ts (Redis-backed 503, bypasses /api/admin + /api/auth)
New dependency: pdfkit + @types/pdfkit

Admin real-time (full catalog):
- `payment:received` → RevenueChart self-fetches (no longer via useAdmin); useAdmin.ts toast only
- `staff_request:new` → toast + pending count refetch (useAdmin.ts)
- `announcement:new` → urgent priority: prominent dismissable banner in StaffShell; normal: bell only. Socket payload now includes full announcement data (`_id`, `createdAt`, `target_roles`, `is_urgent`, `created_by.name`).
- `pricing_updated` → broadcast to ALL roles; patient booking page shows toast; admin settings shows refresh banner
- `system_maintenance` → StaffShell: non-admin gets full-screen MaintenanceOverlay, admin gets dismissable caution banner; also emitted to socket on connect if Redis key exists
- `system_online` → clears MaintenanceOverlay
- `schedule:updated` → StaffShell: doctor-role shows toast "schedule updated by admin"; also via notification:new bell
- `department:updated` → emitted to affected user on department reassignment
- `health_update` → admin health page updates cards (60s interval from server.ts)
- `health_alert` → admin health page: critical toast + reload (triggered on mongoose disconnect)

## Self-fetching Dashboard Components (Admin)
- `OccupancySection` — self-fetches `getOccupancyReport()` on mount; maps `by_type` Record to bar rows; no props needed
- `RevenueChart` — self-fetches `getRevenueReport({ from: last-7-days })` on mount; listens to `payment:received` for live update; no props needed
- Both own their own loading skeletons and error states

## Frontend State
- App Router. Pages are thin — pull from hooks, pass to components
- Data flow: Page → hook → service → apiClient (axios with 401 interceptor)
- **Admin + Cashier modules use TanStack Query v5** (added 2026-06-02). Singleton `queryClient`
  in `src/lib/queryClient.ts`; key registry in `src/lib/queryKeys.ts`; `QueryProvider` in
  `src/providers/QueryProvider.tsx` wraps the app outermost in `app/layout.tsx`. Per-concern
  hooks live in `src/hooks/admin/*` and `src/hooks/cashier/*` (barrel `index.ts` in each).
  Defaults: `staleTime: 30s`, `gcTime: 5min`, no retry on 401/403/404, no refetch-on-focus,
  mutation retry off. Mutations use `mutate`/`mutateAsync`; pages read `mutation.isPending`.
  Socket callbacks invalidate via the **singleton** `queryClient` (not `useQueryClient()`).
  Other modules still use `useState`+`useEffect`+manual `reload()`.
- Design: custom CSS tokens + kit.css. Tailwind v4 for layout only. NOT shadcn CSS classes.
- Validation: `yup` (not zod)
- All types: `src/types/index.ts`
- Dark mode: `next-themes` (`.dark` class on `<html>`)
- Socket.io client for real-time notifications

## Real-time Pattern (Frontend)
- `useSocketEvent<T>(event, handler)` — stable listener; handler stored in `handlerRef.current`; effect deps are `[event]` only (NOT `[event, handler]`). This prevents listener teardown/re-registration on every render.
- Do NOT call `showToast` or any other `setState` inside a `setX(prev => ...)` updater — React may call updaters during render. Call side-effects after the `setState` call at the event-handler level.
- Socket dedup pattern: when a socket event and an HTTP response both add the same item, guard both with `if (prev.some(a => a.id === data.id)) return prev`.
- Socket payloads arrive raw (`_id` not `id`) — normalize with `{ ...raw, id: raw._id ?? raw.id }` before storing.
- Banner state: `useState<(Payload & { id: string })[]>([])` — prepend on event, filter on dismiss
- `getSocket()` — singleton socket client, auto-connects with credentials

## No test suites. Run `npm run lint` before commits.

## API Contract Health
- Global Mongoose toJSON transform (_id→id) in server.ts:33 — all res.json() responses use id not _id
- Frontend normalizes defensively: `{ ...d, id: d._id ?? d.id }` in every service
- Shape mismatches fixed (2026-06-02): getShifts/getTodayShifts (grouped→flat), getDepartmentStaff (grouped→flat), processDeletionRequest (wrong URL fixed)
- Route-diff script: `cd apps/backend && npm run audit:routes` — re-run after adding new routes
- Shape-fallback hotspots audited (2026-06-02) — see .claude/api-contract-report.md
- Post-launch: shared contract (packages/contracts) + E2E tests — tracked in todos.md
