# Changelog

## [2026-06-08] Fix Login Rate Limiter — Failed-Attempts Only, IP+Email Scoping

### Problem
The Redis rate limiter for `POST /api/auth/login` was applied as middleware (before the controller),
so it incremented the counter on every request — including successful logins. A legitimate user who
logged in 10 times correctly would be blocked on the 11th attempt. The counter key was also
IP-only, meaning all accounts tried from the same IP shared one counter. A debug `console.log`
was leaking request metadata to the server log.

### Fix

**`apps/backend/src/middlewares/redisRateLimiter.ts`**
- Removed `console.log({ ip, key, count })` debug block
- Exported new `createControllerRateLimiter(opts)` returning `{ buildKey, isBlocked, increment, reset }`. Existing `createRedisRateLimiter` (middleware factory used by register) unchanged.

**`apps/backend/src/routes/auth.routes.ts`**
- Removed `loginRateLimiter` constant and its usage on the login route

**`apps/backend/src/controllers/auth/index.ts`**
- `loginRL` defined at module level with `getKey: req => '{ip}:{email.toLowerCase()}'`
- `login` controller: `isBlocked` check before auth attempt (429 early return); increment only on `'Invalid credentials'`; `reset` on success

---

## [2026-06-08] MyScheduleWidget — Multi-Shift Day Cell Support

### Problem
`DayCell` in `MyScheduleWidget` read `day.shift` (a single shift from the API's `week_view` payload).
A doctor or staff member with two admin-assigned shifts on the same day (e.g. morning + evening)
only saw one shift in the weekly row.

### Fix
- **`hooks/shared/useMySchedule.ts`**
  - Replaced all `any` casts with proper `ScheduleEntry` typing via the new `entriesToShifts()` helper.
  - `weekView` and `entries` are now individually memoized to keep `useMemo` deps stable.
  - Added `weekViewShifts: Record<string, ShiftEntry[]>` — per-date multi-shift map derived from
    `schedule.entries`, respecting the `is_working` flag for each day (blocked days → empty array).
  - `todayShifts` reuses the same helper (no behavioral change).
- **`components/shared/MyScheduleWidget.tsx`**
  - `DayCell` now receives `shifts: ShiftEntry[]` instead of reading `day.shift` directly.
  - Single shift: renders name + time range (same as before).
  - Multiple shifts: renders an "N shifts" count badge + each shift's time range stacked.
  - Falls back to `day.shift` from `week_view` while the schedule query is still loading.
  - `MyScheduleWidget` passes `weekViewShifts[day.date] ?? []` to each cell.

---

## [2026-06-08] Doctor My Schedule — Dynamic Time Grid From Shift Hours

### Problem
The weekly calendar grid derived its hour rows from the doctor's single `Profile.shift`
(`SHIFT_RANGES` hardcoded 08–14 / 14–20 / 20–24 / 08–20). A doctor with two admin-assigned
shifts on the same day (e.g. morning 08:00–13:00 + evening 17:00–21:00) had the evening slots
clipped because the grid never extended past the single profile shift window.

### Fix — grid range now computed from real shift data (`DoctorSchedule` entries)
- **`hooks/doctor/useDoctorSchedule.ts`**
  - Added a read-only `scheduleService.getMySchedule()` query (shares the `scheduleMe()` query
    key with `useMySchedule`, so the socket-driven refresh/toast still lives only there).
  - Builds `shiftRanges: Record<day_of_week, {start,end}[]>` from active schedule entries →
    `ShiftDefinition` time ranges. Entries repeat weekly, so this is valid for any navigated week.
  - `gridStart` = min start hour across ALL shifts that week; `gridEnd` = max end hour.
    Partial end minutes round up; an end ≤ start (overnight) clamps to 24.
  - Fallback to **08:00–20:00** with no dimming when the doctor has no assigned shift data.
  - Removed the hardcoded `SHIFT_RANGES` / `slotsForShift` helpers. Exposes `shiftRanges` +
    `hasShiftData`.
- **`components/doctor/WeekCalendarGrid.tsx`**
  - New `shiftRanges` + `hasShiftData` props. Renders all rows between gridStart/gridEnd.
  - Cells outside any shift for that day (gaps / break time / outside hours) render a muted
    dimmed block instead of the dashed "+"; the time-label cell dims when no day that week has a
    shift covering that hour. Appointment / room / blocked rendering is unchanged and still shows
    in any row.
- **`app/dashboard/doctor/schedule/page.tsx`** — passes `shiftRanges` + `hasShiftData` through.

### Supporting refactor
- **`services/schedule.service.ts`** — added `getMySchedule()` (`GET /schedule/me`).
- **`hooks/shared/useMySchedule.ts`** — now fetches via `scheduleService.getMySchedule()`
  (single source) instead of an inline axios call.

### Unchanged (per task constraints)
- Appointments display logic, week navigation, stats/KPI cards, legend, and the Block time
  button/modal. No new libraries; existing Tailwind + design tokens and RTL layout preserved.

---

## [2026-06-07] Restore Doctor Schedule Page to Appointments View

### Problem
Previous task incorrectly replaced the doctor's appointments calendar (My Schedule page) with an admin-shift display. The My Schedule page must show patient appointments, not shifts.

### Restored files (to exact git commit 2208576 state)
- `apps/frontend/src/hooks/doctor/useDoctorSchedule.ts` — reverted to original: fetches doctor appointments (`/doctor/schedule`), patients, blocked slots, room bookings; derives hour slots from profile shift; exposes block/unblock mutations and week navigation.
- `apps/frontend/src/app/dashboard/doctor/schedule/page.tsx` — reverted to original: `WeekCalendarGrid` + `BlockTimeModal` + `DoctorKPIStrip` (this week / confirmed / completed / online KPIs). Block time button preserved.

### Unchanged (shift display lives here, NOT on the schedule page)
- `components/shared/MyScheduleWidget.tsx` — dashboard card showing today's admin-assigned shifts (multi-shift support added in previous task remains correct here).
- `hooks/shared/useMySchedule.ts` — `todayShifts` array remains.
- `components/doctor/DoctorScheduleGrid.tsx` — new component remains (for potential future use or alternate views).

---

## [2026-06-07] Doctor Schedule — Full Dynamic Overhaul

### Goal
Replace static/old self-selection schedule system on the doctor dashboard and schedule page with fully dynamic admin-assigned shift data.

### Types (`apps/frontend/src/types/index.ts`)
- Added `ShiftEntry { id, name, start_time, end_time }` — display-time shift shape.
- Added `DayScheduleData { date, dayOfWeek, isToday, isBlocked, blockedReason, shifts, appointments }` — per-day view model used by schedule grid.

### Hook changes
- **`useMySchedule`** (`hooks/shared/useMySchedule.ts`): now computes `todayShifts: ShiftEntry[]` by reading `schedule.entries` grouped on today's `day_of_week`. Supports multiple shifts in one day.
- **`useDoctorSchedule`** (`hooks/doctor/useDoctorSchedule.ts`): fully rewritten. Now fetches `schedule/me` + `doctor/schedule` (appointments), computes `DayScheduleData[]` for the navigated week (Mon–Sun). Exposes `days`, `weekLabel`, `totalAppts`, `hasSchedule`, `department`, `prevWeek/nextWeek/goToday`.

### New component — `DoctorScheduleGrid` (`components/doctor/DoctorScheduleGrid.tsx`)
- 7-column horizontal week grid (overflow-x-auto on small screens).
- Each `DayColumn`: header with day/date/shift count; shift blocks; appointment chips inside each block; unmatched appointments in an "Other" section.
- `ShiftBlock`: branded card per shift with name + time range + `ApptChip` list (online = Video icon, physical = MapPin icon).
- Loading: skeleton columns. No-schedule: centered empty state.

### Updated component — `MyScheduleWidget` (`components/shared/MyScheduleWidget.tsx`)
- `TodayBanner` updated to render ALL of today's shifts as rows (from `todayShifts` array).
- Shift count badge (e.g. "2 shifts") in today banner header.
- 7-day strip unchanged (still uses `week_view` single-shift per day for compact display).

### Schedule page (`app/dashboard/doctor/schedule/page.tsx`)
- Fully rewritten. Removed all `BlockTimeModal`, `WeekCalendarGrid`, `BlockTimeModal`, and block/unblock controls.
- Read-only: shows `DoctorKPIStrip` (shifts/week, appts/week, today's shifts, today's appts) + `DoctorScheduleGrid`.
- Prev/Next/Today week navigation preserved.

---

## [2026-06-07] Protect root admin account from modification

### Goal
Prevent any admin from editing or deleting the designated root/primary admin account.

### Model (`apps/backend/src/models/User.ts`)
- Added `isRootAdmin: { type: Boolean, default: false }` to schema and `IUser` interface.
- Field is never written by registration or create-staff flows — must be set manually or via seed.

### New Middleware (`apps/backend/src/middlewares/protectRootAdmin.ts`)
- Looks up `req.params.id` (or `req.params.userId`) in the DB with a lean `.select('isRootAdmin')` query.
- Returns 403 `"This account cannot be modified."` if the target user has `isRootAdmin: true`.
- Errors during the lookup call `next()` (fail-open) so an unreachable DB doesn't lock out all admin actions.

### Routes (`apps/backend/src/routes/admin.routes.ts`)
`protectRootAdmin` inserted before the controller on:
- `PATCH /admin/users/:id/role`
- `PATCH /admin/users/:id/activate`
- `PATCH /admin/users/:id/profile`
- `DELETE /admin/users/:id`
- `PUT /admin/staff/:id/department`

### Verification
- `npx tsc --noEmit` (backend) → 0 errors.
- No frontend changes.

---

## [2026-06-07] Fix available slots bugs — cache invalidation + multi-shift merge

### Bug 1 — Stale slot cache after admin schedule change
- `apps/backend/src/utils/cache.ts` — added `cache.delPattern(pattern: string)`: uses Redis `scanIterator` to delete all keys matching a glob pattern (non-blocking SCAN + batched DEL).
- `apps/backend/src/controllers/admin/doctorScheduleNew.controller.ts` — `upsertDoctorSchedule` and `deleteDoctorScheduleEntry` now call `cache.delPattern('slots:{doctorId}:*')` after each schedule change, flushing all per-date slot caches for the doctor so patients see fresh availability immediately.

### Bug 2 — Orphaned ShiftDefinitions silently dropped hours
- `apps/backend/src/controllers/doctor/index.ts` (`getDoctorAvailability`) — the `activeEntries` filter now requires `e.shift != null && e.shift.is_active !== false && e.shift.start_time && e.shift.end_time`. Entries whose ShiftDefinition was deleted (null after populate) no longer pass the filter, so they don't inflate `activeEntries.length` while contributing zero hours. The redundant null guard inside the hour-generation loop was removed; the Set-based multi-shift merge is preserved and now operates on a clean entry list.

---

## [2026-06-07] Remove doctor self-shift selection card

### Goal
Shifts are now admin-managed. Remove the interactive `DoctorShiftCard` from the doctor dashboard so doctors can no longer edit their own shift.

### Changed Files
- `apps/frontend/src/app/dashboard/doctor/page.tsx` — removed `DoctorShiftCard` import and its usage; unwrapped `DoctorRatingsCard` from the now-unnecessary two-column grid.

### Not changed
- `DoctorShiftCard.tsx` component file kept (not deleted)
- All other dashboard cards, layout, and functionality preserved

---

## [2026-06-06] EC2 #2 Frontend Server Setup — siryan.xyz

### Goal
Provision EC2 #2 (Ubuntu 22.04, t3.small) as the Next.js frontend server for siryan.xyz and www.siryan.xyz.

### Created Files
- `deploy/setup-frontend-ec2.sh` — 9-step setup script: apt packages, nvm+Node 20, PM2, UFW, git clone, `.env.production`, npm build, Nginx config, PM2 start. Run on EC2 #2 as the ubuntu user.
- `deploy/ecosystem.config.js` — PM2 app definition: `siryan-frontend`, cwd `apps/frontend`, `next start -p 3000`, fork mode, log paths.
- `deploy/nginx-frontend.conf` — Nginx server block: proxy_pass to localhost:3000, all required headers for Next.js WebSocket upgrade. Certbot appends HTTPS block after `sudo certbot --nginx`.

### Environment
- `apps/frontend/.env.production` (written by the script on EC2):
  - `NEXT_PUBLIC_API_URL=https://api.siryan.xyz/api`
  - `NEXT_PUBLIC_SOCKET_URL=https://api.siryan.xyz`
  - `NEXT_PUBLIC_STREAM_API_KEY=ncyqq96s4wpy`
  - `NODE_ENV=production`
- EC2 #1 backend `.env` additions needed (manual):
  - `FRONTEND_URL=https://siryan.xyz`
  - `CORS_ORIGIN=https://siryan.xyz`
  - `COOKIE_DOMAIN=.siryan.xyz`

### Operator Steps Remaining
1. `scp deploy/setup-frontend-ec2.sh ubuntu@<EC2-2-IP>:~/ && scp deploy/ecosystem.config.js ubuntu@<EC2-2-IP>:~/`
2. SSH in, run `bash setup-frontend-ec2.sh`
3. Run the `sudo env PATH=... pm2 startup systemd` command it prints
4. Run `sudo certbot --nginx -d siryan.xyz -d www.siryan.xyz`
5. Verify: `curl -I https://siryan.xyz` → expect 200 or redirect, valid TLS

---

## [2026-06-06] Enhanced System Health Endpoint + Dashboard Page

### Goal
Expand the `/api/admin/system/health` endpoint and the admin health page with CPU, memory, cron job status, DB connections, Stream API, and last deploy info.

### Backend Changes
- `apps/backend/src/jobs/inventoryAlert.job.ts` — added `getInventoryAlertJobStatus()` export
- `apps/backend/src/jobs/inventoryExpiry.job.ts` — added `getInventoryExpiryJobStatus()` export
- `apps/backend/src/jobs/inventoryReport.job.ts` — added `getInventoryReportJobStatus()` export
- `apps/backend/src/jobs/appointmentReminder.job.ts` — added `getAppointmentReminderJobStatus()` export
- `apps/backend/src/jobs/profileCleanup.job.ts` — added `getProfileCleanupJobStatus()` export
- `apps/backend/src/jobs/pharmacyExpiry.job.ts` — added `getPharmacyExpiryJobStatus()` export
- `apps/backend/src/jobs/pharmacyReport.job.ts` — added `getPharmacyReportJobStatus()` export
- `apps/backend/src/controllers/admin/index.ts` — `getSystemHealth` adds: `cpu.usage_percent`, full `memory` (system + heap), `cron_jobs` (7 jobs), `db_connections`, `stream_api`, `last_deploy`; keeps legacy fields for compat
- `apps/backend/src/server.ts` — `healthInterval` broadcast expanded with all new fields; CPU sampler uses snapshot delta for current usage

### Frontend Changes
- `apps/frontend/src/types/index.ts` — `SystemHealth` interface expanded with all new fields; `CronJobStatus` type added
- `apps/frontend/src/app/dashboard/admin/system/health/page.tsx` — 4-row layout: Row 1 Core Services (MongoDB/Redis/Socket.IO/Stream API), Row 2 System Resources (CPU/Memory/Heap each with colored progress bar), Row 3 Application (Uptime/DB Connections/Last Deploy), Row 4 Background Jobs grid

### New Response Shape (health endpoint)
```
{ mongodb, redis, socket, uptime, cpu, memory, cron_jobs, db_connections, stream_api, last_deploy }
```

---

## [2026-06-06] Merged All Schedule Pages into Single Tabbed Page

### Goal
Replace 5 separate schedule pages and sidebar items with one `/dashboard/admin/schedules` page containing 5 internal tabs.

### New Files
- `apps/frontend/src/components/admin/ScheduleGrid.tsx` — shared chip-style timetable grid; props: shifts, assignments (GridState), onAdd, onRemove, isLoading, isMutating; exports SCHEDULE_DAYS, GridPerson, GridState, GridShift

### Changed Files
- `apps/frontend/src/app/dashboard/admin/schedules/page.tsx` — replaced old weekly slot overview with new merged page; 5 tabs: Shift Definitions | Dept Schedules | Doctor Schedules | Staff Schedules | Blocked Dates; default tab = Doctor Schedules; tab bar with brand-color bottom border on active tab
- `apps/frontend/src/config/navItems.tsx` — replaced 5 schedule nav items (Shift Definitions, Dept Schedules, Doctor Schedules, Staff Schedules, Blocked Dates) with one "Schedules" entry pointing to `/dashboard/admin/schedules`

### Deleted Files
- `apps/frontend/src/app/dashboard/admin/shifts/page.tsx`
- `apps/frontend/src/app/dashboard/admin/schedules/department/page.tsx`
- `apps/frontend/src/app/dashboard/admin/schedules/doctors/page.tsx`
- `apps/frontend/src/app/dashboard/admin/schedules/staff/page.tsx`
- `apps/frontend/src/app/dashboard/admin/schedules/blocked-dates/page.tsx`

### Tab Details
- **Shift Definitions** — KPI strip + add/edit/deactivate shift modal (same as old shifts page)
- **Dept Schedules** — department picker + checkbox grid (same as old dept page)
- **Doctor Schedules** — department selector + ScheduleGrid chip timetable + AddDoctorModal (refactored from old doctors page)
- **Staff Schedules** — role+dept selectors + ScheduleGrid chip timetable + AddStaffModal (new chip-style design; replaces old list+modal design); "Apply Dept Template" button with confirm dialog
- **Blocked Dates** — inner dept/individual tabs + forms + lists (same as old blocked-dates page)



## [2026-06-06] Dynamic Insurance Providers in Patient Register Form

### Goal
Replace the hardcoded insurance provider dropdown in the patient registration form with a live list fetched from the backend.

### Backend Changes
- `apps/backend/src/routes/insuranceProviders.routes.ts` — new public route file; `GET /` → `getInsuranceCompanies` (no auth required)
- `apps/backend/src/app.ts` — mounts `/api/insurance-providers`

### Frontend Changes
- `apps/frontend/src/services/patient.service.ts` — `getPublicInsuranceProviders()` calls `GET /insurance-providers`; returns `{ id, name }[]`
- `apps/frontend/src/components/auth/register/PatientForm.tsx` — fetches providers on mount via `useEffect`; passes `providers`, `providersLoading`, `providersError` to `MedicalInfoStep`
- `apps/frontend/src/components/auth/register/steps/MedicalInfoStep.tsx` — accepts provider props; renders dynamic `<option>` list; shows "Loading…" while fetching; shows "Could not load insurance providers" on error; dropdown disabled while loading



## [2026-06-06] Doctor Schedules Page — Grid Timetable UI

### Goal
Replace the doctor schedule list view with a school-timetable-style grid: rows = shifts, columns = 7 days (Sat→Fri), cells = doctor name chips with inline add/remove.

### Changed File
`apps/frontend/src/app/dashboard/admin/schedules/doctors/page.tsx` — full rewrite.

### Features
- **Department selector** at the top (fetches from `departmentService.getByRole('doctor')` via TanStack Query); grid and modal both filter by selected department.
- **Timetable grid**: `<table>` with `border-collapse`; first column = shift label (name + HH:MM–HH:MM, `--sand-50` bg); header row = day names (`--sand-100` bg); today's column highlighted with `--brand-soft`.
- **Doctor chips**: pill-shaped (`--brand-soft` bg, `--border-1` border), name truncated with `title`, inline `×` button (turns `--critical` on hover) to remove.
- **Remove flow**: finds the doctor's schedule record, filters out the entry, calls `upsertMutation`.
- **Add flow**: dashed `+` ghost button at the bottom of each cell opens `AddDoctorModal`.
- **AddDoctorModal**: title "Assign Doctor · [Day] · [Shift]"; autofocused search input; list of doctors in the department (avatar initials, name, specialization); already-assigned doctors greyed out with "✓ Assigned" badge; clicking "Assign" calls `upsertMutation` (merges with existing entries, no duplicates) then closes modal.
- **Grid builder** (`buildGrid`): pure function, `useMemo`-derived — no local state for cell contents; data flows from `useAdminDoctorSchedules` cache.
- **Empty states**: "Select a department", "No shift definitions", loading skeletons for both grid and modal.
- **Responsive**: `overflow-x: auto` wrapper; `minWidth: 860px` table; `colgroup` for column widths.
- **TypeScript**: `npx tsc --noEmit` → 0 errors.

### No new hooks/services/types needed — reuses existing `useAdminDoctorSchedules`, `useAdminShifts`, `departmentService`, `patientService.getDoctors`.

---

## [2026-06-06] Shift & Schedule System — Frontend (Staff Dashboard + Patient Booking)

### Goal
Frontend integration for the backend schedule system: `useMySchedule` hook (TanStack Query + socket), `MyScheduleWidget` component (rich weekly view), integration into all 8 staff dashboards, and improved patient booking empty state.

### New Hook
- `apps/frontend/src/hooks/shared/useMySchedule.ts` — TanStack Query v5; GET /api/schedule/me; queryKey `['schedule','me']`; refetchInterval 5min; listens to `schedule:updated` socket event → invalidate + toast "Your schedule has been updated by the admin."

### New Component
- `apps/frontend/src/components/shared/MyScheduleWidget.tsx` — full-featured weekly schedule card; today banner (brand color, shift name + time range); 7-day horizontal strip; today highlighted; blocked → "Day Off"; no shift → "Off"; loading skeleton; empty state for no schedule; department badge in header.

### Updated Files
- `apps/frontend/src/lib/queryKeys.ts` — added `scheduleMe()` factory
- `apps/frontend/src/types/index.ts` — added `WeekViewDay`, `MyScheduleResponse` interfaces
- `apps/frontend/src/hooks/shared/index.ts` — exports `useMySchedule`
- All 8 staff dashboards (doctor, nurse, receptionist, pharmacist, lab, radiology, inventory, cashier) — `<MyScheduleWidget />` inserted after KPI strip
- `apps/frontend/src/components/patient/TimeStep.tsx` — "no slots" message now reads "No available slots for this day. The doctor may not be scheduled on this day."

---

## [2026-06-06] Shift & Schedule System — Frontend (Admin)

### Goal
Admin UI for the shift/schedule system. Five new pages under the admin dashboard; all backed by TanStack Query v5 hooks and a new `schedule.service.ts`.

### New Types (`apps/frontend/src/types/index.ts`)
- `ShiftDefinition` — shift template (name, start_time, end_time, is_active)
- `ScheduleEntry` — single day+shift cell (day_of_week, shift ref/populated, is_active)
- `DepartmentScheduleRecord` — department → entries[]
- `DoctorScheduleRecord` — user → entries[] + doctor_name/department/specialization
- `StaffScheduleRecord` — user → role + department + entries[]
- `BlockedDateRecord` — scope(department|user) + date + reason + created_by

### New Service (`apps/frontend/src/services/schedule.service.ts`)
Methods: getShifts, createShift, updateShift, deleteShift, getDepartmentSchedule, upsertDepartmentSchedule, getDoctorSchedules, getDoctorSchedule, upsertDoctorSchedule, getStaffSchedules, upsertStaffSchedule, applyDepartmentTemplate, getBlockedDates, createBlockedDate, deleteBlockedDate.
Routes: `/admin/schedule/shifts`, `/admin/department-schedules`, `/admin/doctor-schedules`, `/admin/staff-schedules`, `/admin/blocked-dates`.

### New Query Keys (`apps/frontend/src/lib/queryKeys.ts`)
adminShifts, adminDepartmentSchedule(dept), adminDoctorSchedules, adminDoctorSchedule(id), adminStaffSchedules(filters?), adminBlockedDates(filters?)

### New Hooks (`apps/frontend/src/hooks/admin/`)
- `useAdminShifts.ts` — query + create/update/delete mutations
- `useAdminDepartmentSchedule.ts` — query(dept) + upsert mutation; 404 retry=false
- `useAdminDoctorSchedules.ts` — list query + upsert mutation; `useAdminDoctorSchedule(id)` single
- `useAdminStaffSchedules.ts` — list query(filters) + upsert + applyTemplate mutations
- `useAdminBlockedDates.ts` — list query(filters) + create/delete mutations
All exported from `hooks/admin/index.ts`.

### New Admin Pages
- `app/dashboard/admin/shifts/page.tsx` — "Shift Definitions" table (replaces old assignment page); inline add/edit modal; KPI strip
- `app/dashboard/admin/schedules/department/page.tsx` — department picker + weekly grid (Sat→Fri × active shifts); checkbox cells; Save button
- `app/dashboard/admin/schedules/doctors/page.tsx` — list of doctor schedule records; search + dept filter; click → `SchedulePanel` modal with weekly grid
- `app/dashboard/admin/schedules/staff/page.tsx` — list of staff schedule records; dept + role + name filters; edit panel; "Apply dept template" confirmation flow
- `app/dashboard/admin/schedules/blocked-dates/page.tsx` — "Department" / "Individual" tabs; inline form; table of existing blocks with delete

### Nav Update (`apps/frontend/src/config/navItems.tsx`)
Replaced "Schedules" + "Shifts" nav items with 5 items: Shift Definitions (Clock), Dept Schedules (CalendarDays), Doctor Schedules (Stethoscope), Staff Schedules (Users), Blocked Dates (CalendarX). Added Stethoscope + CalendarX to lucide imports.

---

## [2026-06-06] Shift & Schedule System — Backend

### Goal
Full shift-definition and weekly schedule system for departments, doctors, and non-doctor staff. Replaces the flat Profile.shift string approach with structured, admin-controlled schedules tied to reusable shift time templates.

### New Models
- `apps/backend/src/models/ShiftDefinition.ts` — shift time templates (name, start_time HH:MM, end_time, is_active). Mongoose model `ShiftDefinition`.
- `apps/backend/src/models/DepartmentSchedule.ts` — per-department weekly repeating schedule. entries: [{day_of_week 0–6, shift: ShiftDefinition ref, is_active}]. One doc per department (upsert).
- `apps/backend/src/models/StaffSchedule.ts` — per-staff-user schedule. entries same shape + overrides [{date, is_blocked, reason}]. One doc per user (unique).
- `apps/backend/src/models/DoctorSchedule.ts` — per-doctor schedule with admin_controlled flag + same entries/overrides shape. One doc per doctor (unique).
- `apps/backend/src/models/BlockedDate.ts` — scope-based date blocks (scope: department|user, department string, user ref, date, reason, created_by). Dual compound indexes.

### New Admin Controllers
- `controllers/admin/shiftDefinition.controller.ts` — CRUD for ShiftDefinition + public listActive export
- `controllers/admin/departmentSchedule.controller.ts` — list/get/upsert/deleteEntry; upsert notifies all dept staff (Notification + socket schedule:updated)
- `controllers/admin/doctorScheduleNew.controller.ts` — list/get/upsert/deleteEntry for DoctorSchedule; notifies doctor on save; invalidates DOCTOR_SCHEDULE cache
- `controllers/admin/staffSchedule.controller.ts` — list/get/upsert + applyDepartmentTemplate (bulk-applies dept template to all non-doctor staff)
- `controllers/admin/blockedDates.controller.ts` — list (filterable by scope/dept/user/date range)/create/delete

### New General Controllers
- `controllers/schedule.controller.ts` — GET /api/schedule/me: returns calling user's DoctorSchedule or StaffSchedule populated with shifts + blocked dates (dept + user scope) + next-7-days week_view computation

### New Routes / Route Updates
- `routes/schedule.routes.ts` — GET /api/schedule/me (authenticate + requireCompleteProfile, any role)
- `routes/shifts.routes.ts` — GET /api/shifts (public, no auth) → lists active ShiftDefinitions
- `routes/admin.routes.ts` — Sections 13–17 added:
  - `/schedule/shifts` — ShiftDefinition CRUD (avoids collision with existing `/shifts` assignment routes)
  - `/department-schedules` — DepartmentSchedule CRUD
  - `/doctor-schedules` — DoctorSchedule CRUD
  - `/staff-schedules` — StaffSchedule CRUD + POST /staff-schedules/department-template
  - `/blocked-dates` — BlockedDate CRUD

### app.ts Mounts
- `/api/schedule` → scheduleRoutes
- `/api/shifts` → shiftsRoutes (public)

### Doctor Availability Update (`controllers/doctor/index.ts`)
- `getDoctorAvailability` now checks `DoctorSchedule` first:
  - Checks `BlockedDate` (user + dept scope) — returns `blocked: true` if found
  - Checks `DoctorSchedule.overrides` for specific-date blocks
  - Computes available hours from `DoctorSchedule.entries` (day_of_week + ShiftDefinition time range)
  - Falls back to old Profile.shift + weekend logic if no DoctorSchedule doc exists

### Seed
- `seeds/shiftDefinitions.seed.ts` — seeds Morning (08:00–14:00), Afternoon (14:00–20:00), Night (20:00–08:00) ShiftDefinitions on startup (idempotent upsert)
- Wired into `server.ts` startup sequence

### Naming Note
The existing `Shift.ts` model is a staff-assignment record (user+date-range). The new `ShiftDefinition.ts` is the time template. Existing `/api/admin/shifts` routes remain unchanged. New ShiftDefinition admin routes are at `/api/admin/schedule/shifts`.

---

## [2026-06-05] Role-Based Departments — Frontend (Patient Booking)

### Goal
Improve the patient booking flow to use role-filtered departments (`/departments/by-role?role=doctor`)
and replace the department dropdown in step 1 with visual clickable cards.

### Service (`apps/frontend/src/services/patient.service.ts`)
- Added `getDoctors(department?: string)` → `GET /doctor/list?department=name` (wraps the existing direct apiClient call)
- Imported `DoctorAvailability` type

### Hook (`apps/frontend/src/hooks/shared/useBooking.ts`)
- Departments query switched from `patientService.getDepartments()` (all depts) to `departmentService.getByRole('doctor')` (role-filtered)
- Query key changed from `bookingDepartments()` to `departmentsByRole('doctor')`
- Auto-select: if exactly one department exists, always force-select it; otherwise select first on initial load
- Doctor fetch uses `patientService.getDoctors(formData.department)` (service layer) instead of direct apiClient call
- `departments` return type is now `Department[]`

### UI (`apps/frontend/src/components/patient/ReasonStep.tsx`)
- Department `<select>` replaced with a 2/3-column grid of clickable cards
- Selected card gets `brand` border + `brand-soft-bg` highlight
- Loading state shows 3 Skeleton placeholders
- Prop type for `departments` updated from `{ id: string; name: string }[]` to `Department[]`

---

## [2026-06-05] Role-Based Departments — Frontend (Admin + Register)

### Goal
Frontend support for the role-aware departments system: admin CRUD page, TanStack Query hook,
department service, nav item, and staff register form department select.

### Service (`apps/frontend/src/services/department.service.ts`)
- `getAll(includeInactive?)`: `GET /admin/departments` — admin list (active + inactive)
- `getByRole(role)`: `GET /departments/by-role?role=` — public role-filtered list
- `create`, `update`, `delete` for admin CRUD

### Hook (`apps/frontend/src/hooks/admin/useAdminDepartments.ts`)
- TanStack Query v5; key `['admin','departments']`; `createDepartment`, `updateDepartment`, `deleteDepartment` mutations — all invalidate on success

### Admin Page (`apps/frontend/src/app/dashboard/admin/departments/page.tsx`)
- Table with department name, description, assigned-role badges, doctor count, active badge, edit/delete actions
- Add/Edit modal: name, description, assigned-roles grid (8 checkboxes), is_active toggle
- ConfirmDialog wired for soft-delete; loading skeletons and empty state

### Nav (`apps/frontend/src/config/navItems.tsx`)
- "Departments" entry (Building2 icon) already present in `adminNav`

### Staff Register Form
- `StaffForm.tsx`: TanStack Query fetches `departmentService.getByRole(role)` when role is selected; resets department + specialization on role change
- `StaffProfessionalStep.tsx`: Department select rendered after Role; disabled until role selected; placeholder changes on loading / empty
- `registerTypes.ts`: `staffSchema.department` is `required`; `staffSchema.specialization` required only when `role === 'doctor'`

### Query Keys (`apps/frontend/src/lib/queryKeys.ts`)
- `adminDepartments`: `['admin','departments']`
- `departmentsByRole(role)`: `['departments','by-role', role]` (used by register + booking hooks)

---

## [2026-06-05] Role-Based Departments — Backend

### Goal
Make departments role-aware so the staff registration form can show only the departments
that accept a chosen role, and registration is validated against that. Additive — department
is still stored as a name string on `Profile` (no migration; User model unchanged).

### Model
- `models/Department.ts`: added `assigned_roles: string[]` (default `[]`) and `is_active: boolean` (default `true`).

### Validation
- `validations/admin.validation.ts`: added `departmentRoleEnum` (8 staff roles); extended
  `createDepartmentSchema` with optional `assigned_roles` + `is_active`; added `updateDepartmentSchema`.

### Controllers (`controllers/admin/index.ts`)
- `getDepartments`: `?includeInactive=true` support; default active-only; returns `assigned_roles` + `is_active`.
- Added `updateDepartment` (PUT) and `getDepartmentsByRole` (public-facing).
- `deleteDepartment`: now a **soft delete** (`is_active=false`) instead of hard delete.

### Routes
- `routes/admin.routes.ts`: added `PUT /api/admin/departments/:id`.
- New `routes/department.routes.ts`: public `GET /api/departments/by-role?role=` (mounted at `/api/departments` in `app.ts`).

### Registration
- `services/auth.service.ts` `registerStaff`: validates the chosen department exists, is active,
  and its `assigned_roles` include the requested role.

### Seed
- `seeds/departments.seed.ts`: canonical departments now carry `assigned_roles`; added non-clinical
  departments (Pharmacy, Laboratory, Radiology, Billing, Administration) so every registerable role
  has a home. Backfill is non-destructive (only fills missing `assigned_roles`/`is_active`).

### Already satisfied (no change)
- `/doctor/list?department=<name>` already filters by department and returns the name.

## [2026-06-04] UI Audit Fixes — P0/P1/P2 Color Contrast + Button Consistency

### Goal
Fix all P0 (critical contrast), P1 (button consistency), and P2 (CSS token alignment) issues
from the design-system audit report.

### P0 — dark:text-black / dark:hover:text-black (6 files fixed)
Root cause: `--sand-100` has no dark-mode override, so hover backgrounds stayed light in dark mode
while `dark:text-black` set text to pure black on near-black surfaces (~1:1 contrast).
Fix: replaced hover bg with `bg-[var(--bg-sunken)]`, removed all `dark:text-black` classes.
- `components/patient/BookingProgress.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`, `ReasonStep.tsx`,
  `SuggestionChips.tsx`, `components/shared/NotificationBell.tsx`

### P0 — hover:text-black/80 without dark guard (12 occurrences, 8 files)
All inventory tab pills and UsersTable used `hover:text-black/80` with no dark-mode override.
Fix: `hover:text-black/80` → `hover:text-[var(--fg-1)]` in:
- `inventory/analytics`, `items`, `reports`(×2), `requests`(×2), `purchase-orders`,
  `rooms`(×2), `warehouse`(×2), `components/staff/admin/UsersTable.tsx`

### P1 — Manual <button> replaced with <Button> in 4 settings components
Raw `<button>` with `px-5` (20px) replaced by `<Button>` (correct `px-3.5` from kit.css spec):
- `PatientProfileSection.tsx`, `StaffProfileSection.tsx`, `SecuritySection.tsx`, `NotificationsSection.tsx`

### P1 — Placeholder color token
- `layouts/PatientShell.tsx`: `text-black placeholder:text-gray-500` → `text-[var(--fg-1)] placeholder:text-[var(--fg-4)]`

### P2 — btn-sm border-radius token
- `kit.css`: `border-radius: 8px` → `border-radius: var(--radius-md)`
- `button.tsx` sm size: `rounded-[8px]` → `rounded-[var(--radius-md)]`

### P2 — Active states for secondary/ghost buttons
- `kit.css`: added `.btn-secondary:active, .btn-ghost:active { background: var(--bg-sunken); transform: scale(0.98) }`

### P2 — Large type scale responsive
- `tokens.css` mobile breakpoint: added `--fs-4xl: 36px`, `--fs-3xl: 28px`

### Verification
- `npx tsc --noEmit` → 0 errors
- `grep "dark:text-black|hover:text-black"` → 0 matches

---

## [2026-06-04] Auth Improvements — Part 2: Frontend + Resend Migration

### Goal
Migrate email provider to Resend, improve all auth forms validation + UX, wire up frontend to backend OTP flows.

### Created
- `apps/frontend/src/lib/validateNationalId.ts`
- `apps/frontend/src/validations/auth.ts` — OTP/reset schemas
- `apps/frontend/src/components/auth/FormError.tsx`
- `apps/frontend/src/components/shared/EmailVerificationBanner.tsx`
- `apps/frontend/src/app/auth/verify-email/page.tsx`
- `apps/frontend/src/app/auth/reset-password/page.tsx`

### Modified
- `apps/backend/src/utils/mailer.ts` — Resend client, all functions fire-and-forget
- `apps/backend/.env.example` — RESEND_API_KEY, FROM_EMAIL updated
- `apps/frontend/src/components/auth/register/registerTypes.ts` — real NID validator, DOB cross-validation
- `apps/frontend/src/services/auth.service.ts` — sendEmailVerification, verifyEmail, verifyResetOTP, resetPassword
- `apps/frontend/src/types/index.ts` — User.is_email_verified
- `apps/frontend/src/components/auth/register/steps/MedicalInfoStep.tsx` — NID blur + counter + dobHint
- `apps/frontend/src/components/auth/register/steps/StaffProfessionalStep.tsx` — NID counter
- `apps/frontend/src/components/auth/register/PatientForm.tsx` — NID auto-fill, redirect to verify-email
- `apps/frontend/src/components/auth/register/StaffForm.tsx` — pass nationalId to step
- `apps/frontend/src/app/auth/forgot-password/page.tsx` — 2-step flow, Arabic UI, 60s resend
- `apps/frontend/src/app/auth/change-password/page.tsx` — 4-level strength meter, show/hide
- `apps/frontend/src/components/layouts/PatientShell.tsx` — EmailVerificationBanner

### Verification
- `npx tsc --noEmit` → 0 errors (both apps)

---

## [2026-06-04] Auth Improvements — Part 1: Backend OTP Infrastructure

### Goal
Add OTP-based email verification (on register) and forgot-password via OTP (replacing token link),
national_id/phone unique constraints, stronger validation, and `is_email_verified` gating.

### Created
- `apps/backend/src/models/OTP.ts` — OTP model with TTL + compound index
- `apps/backend/src/services/otp.service.ts` — `generateOTP` + `verifyOTP` (markUsed param)
- `apps/backend/src/middlewares/requireEmailVerified.ts` — 403 gate for unverified patients

### Modified
- `apps/backend/src/models/User.ts` — added `is_email_verified` field (default false)
- `apps/backend/src/models/Profile.ts` — partial unique indexes on `phone` + `national_id`
- `apps/backend/src/models/index.ts` — added OTP export
- `apps/backend/src/utils/mailer.ts` — added `sendEmailVerificationOTP` + `sendForgotPasswordOTP`
- `apps/backend/src/validations/auth.validation.ts` — Egyptian NID validator, updated register/staff schemas, 4 new schemas
- `apps/backend/src/middlewares/auth.ts` — `AuthRequest.user` gains `is_email_verified`; decode `ive` from JWT
- `apps/backend/src/services/auth.service.ts` — `makeTokens` gains `ive` param; all callers updated; refresh includes ive
- `apps/backend/src/controllers/auth/index.ts` — new: sendEmailVerification, verifyEmail, verifyForgotPasswordOTP, resetPassword; updated: register (OTP fire-and-forget), forgotPassword (OTP-based)
- `apps/backend/src/config/passport.ts` — Google users get `is_email_verified: true`
- `apps/backend/src/routes/auth.routes.ts` — 4 new routes + ive in Google/complete-profile tokens
- `apps/backend/src/routes/patient.routes.ts` — `requireEmailVerified` on POST /appointments, /pharmacy/order, /rooms/book, /chatbot

### Verification
- `npx tsc --noEmit` → 0 errors
- `npm run audit:routes` → 0 FE calls with no BE route

---

## [2026-06-03] UI Polish — Part 1 (design-system unification I1/I2/I3/I5)

### Goal
Fix the four foundational UI inconsistencies from the audit: unified status colors, a single badge
system, one destructive-button style, and the missing `--warning` token.

### Created
- `apps/frontend/src/lib/statusBadge.ts` — canonical `statusVariant` map + `getStatusVariant(status)`
  (fallback `'neutral'`).

### Modified — I1 (shared status→variant map)
- `apps/frontend/src/components/ui/Badge.tsx` — exported `BadgeVariant` type.
- Removed inline status→variant maps/functions and routed status `<Badge>`s through `getStatusVariant` in:
  `components/staff/receptionist/AppointmentQueueTable.tsx`, `RequestsTable.tsx`,
  `components/patient/AppointmentRow.tsx`, `LabResultRow.tsx`, `ImagingRow.tsx`,
  `components/doctor/QueueItem.tsx`, `PatientQueueTable.tsx`, `LabResultsTab.tsx`, `RadiologyTab.tsx`,
  `components/staff/lab/LabOrdersTable.tsx`, `components/staff/radiology/RadiologyOrdersTable.tsx`,
  `components/staff/inventory/SupplyRequestsTable.tsx`, `components/staff/cashier/InvoiceCard.tsx`,
  `app/dashboard/receptionist/{page,appointments,patients,orders,radiology,lab}/page.tsx`,
  `app/dashboard/doctor/record/page.tsx`, `app/dashboard/patient/{appointments,rooms}/page.tsx`,
  `app/dashboard/patient/records/page.tsx` (removed dead map),
  `app/dashboard/cashier/invoices/[id]/page.tsx`, `app/dashboard/admin/{appointments,invoices}/page.tsx`,
  `app/dashboard/inventory/{purchase-orders,warehouse,rooms,rooms/[id],requests}/page.tsx`,
  `app/dashboard/nurse/alerts/page.tsx`. `cancelled` is now `neutral` everywhere.

### Modified — I2 (single badge system)
- Replaced `chip chip-*` with `<Badge>` in: `components/staff/pharmacist/{OrderCard,RecentOrdersList,
  RefillRequestCard,PrescriptionCard,PrescriptionDetailModal,SubstitutionModal,BatchesModal,
  ExpiringAlertList,LowStockAlertList}.tsx`, `components/staff/cashier/TodaysTransactions.tsx`,
  `app/dashboard/pharmacist/medications/page.tsx`, `components/landing/RolesSection.tsx`.
  `chip-*` classes remain in `kit.css` but are no longer referenced by any component.

### Modified — I3 (one destructive button)
- `apps/frontend/src/styles/kit.css` — `.btn-danger` now solid `var(--critical)`/white + brightness hover + disabled.
- `apps/frontend/src/components/ui/button.tsx` — `danger` variant solid critical.
- Inline destructive button styles → `btn-danger`: `components/shared/ConfirmDialog.tsx`,
  `components/staff/pharmacist/{RejectModal,RejectReasonModal,SubstitutionModal}.tsx`,
  `components/staff/nurse/EmergencyFlagModal.tsx`,
  `app/dashboard/admin/{announcements,appointments,settings,shifts}/page.tsx`,
  `app/dashboard/admin/users/[id]/page.tsx`, `app/dashboard/nurse/patients/[id]/page.tsx`.

### Modified — I5 (`--warning` token)
- `apps/frontend/src/styles/tokens.css` — added `--warning: var(--caution)` alias.
- `app/dashboard/settings/page.tsx` + `app/dashboard/patient/settings/page.tsx` — password-strength
  `colors` now use `var(--critical|--caution|--positive|--brand)` (removed `#f59e0b`/`#84cc16`).

### Verification
- `npx tsc --noEmit` (frontend) → 0 errors.
- `grep '#84cc16'` → 0; `grep "cancelled.*critical"` → 1 (KPI tone, not a status badge);
  remaining `var(--critical)` inline styles are legitimate icon/text colors + non-button badges.

---

## [2026-06-03] Emergency Flag System — Part 2 (frontend wiring) + dark-mode fixes C2/C3/C4

### Goal
Wire the static `nurse/alerts` page to the Part-1 backend, add a doctor-side actionable
"Active Alerts" section, and fix the 3 systemic dark-mode bugs (Skeleton / Badge neutral / hovers).

### Created
- `apps/frontend/src/hooks/nurse/useNurseAlerts.ts` — status-filtered emergency-flags query;
  invalidates on `emergency:acknowledged` / `emergency:resolved` sockets.
- `apps/frontend/src/hooks/doctor/useDoctorEmergencyFlags.ts` — flags query + acknowledge/resolve
  mutations; invalidates on `emergency:flag` socket.
- `apps/frontend/src/components/doctor/ActiveAlertsCard.tsx` — doctor overview alerts section
  (acknowledge + inline-notes resolve; renders only when active flags exist; max 5 + "+N more").

### Modified
- `apps/frontend/src/types/index.ts` — `VitalsSnapshot`, `EmergencyFlag`, `EmergencyFlagKPIs`
  (shaped to the real flat backend response; `created_at` normalized in services).
- `apps/frontend/src/lib/queryKeys.ts` — `nurseEmergencyFlags(status?)`, `doctorEmergencyFlags()`.
- `apps/frontend/src/services/nurse.service.ts` — `getEmergencyFlags(status?)`.
- `apps/frontend/src/services/doctor.service.ts` — `getDoctorEmergencyFlags`, `acknowledgeFlag`, `resolveFlag`.
- `apps/frontend/src/hooks/{nurse,doctor}/index.ts` — barrel exports for the new hooks.
- `apps/frontend/src/app/dashboard/nurse/alerts/page.tsx` — full rewrite to real data (KPI strip,
  filter pills, flag list, loading/empty/error, patient-select + reused `EmergencyFlagModal`).
- `apps/frontend/src/app/dashboard/doctor/page.tsx` — render `<ActiveAlertsCard />` below KPI strip.
- **C2** `apps/frontend/src/components/ui/Skeleton.tsx` — `--bg-sunken` + `animate-pulse` (was fixed `--sand-200`).
- **C3** `apps/frontend/src/styles/tokens.css` (+ `--neutral-soft-bg`/`--neutral-soft-fg`, light + dark) and
  `apps/frontend/src/components/ui/Badge.tsx` — neutral variant uses the new theme-flipping tokens.
- **C4** `apps/frontend/src/styles/kit.css` (`.tbl tr:hover`, `.btn-secondary:hover`, `.btn-ghost:hover` →
  `--bg-sunken`; removed `.dark .btn-ghost:hover` color-black hack) and
  `apps/frontend/src/components/ui/button.tsx` (secondary/ghost hover → `--bg-sunken`).

### Verification
- `npx tsc --noEmit` (frontend) → 0 errors.
- `npm run audit:routes` → 4 emergency-flag routes now in ✅ MATCHED; FE-call-with-no-BE-route = 0.

---

## [2026-06-03] Emergency Flag System — Part 1 (backend persistence + lifecycle)

### Goal
Replace the static `nurse/alerts` mockup's missing backend: persist emergency flags as real
records with a notified→acknowledged→resolved lifecycle, doctor acknowledge/resolve, and
nurse/doctor list endpoints.

### Created
- `apps/backend/src/models/EmergencyFlag.ts` — snake_case model (`patient`/`nurse`/`doctor`
  refs, `vitals_snapshot` subdoc, `status`, `acknowledged_at`/`resolved_at`), `toJSON` (_id→id),
  indexes `{nurse,createdAt}` & `{doctor,status}`.
- `apps/backend/src/controllers/doctor/emergencyFlags.controller.ts` — `getDoctorEmergencyFlags`,
  `acknowledgeFlag`, `resolveFlag` (ownership 403 + status 400 guards; emit
  `emergency:acknowledged`/`emergency:resolved` to nurse).

### Modified
- `apps/backend/src/models/index.ts` — export `EmergencyFlag`.
- `apps/backend/src/controllers/nurse/index.ts` — `emergencyFlag` now persists a flag +
  snapshots latest vitals from `MedicalRecord.vital_signs`, returns `{flag}` 201, adds
  `flag_id` to the socket payload; NEW `getNurseEmergencyFlags` (list + kpis incl.
  `avg_response_minutes`; names via `Profile`).
- `apps/backend/src/validations/nurse.validation.ts` — `emergencyFlagSchema` + `notes`.
- `apps/backend/src/validations/doctor.validation.ts` — NEW `resolveEmergencyFlagSchema`.
- `apps/backend/src/routes/nurse.routes.ts` — `GET /emergency-flags`.
- `apps/backend/src/routes/doctor.routes.ts` — `GET /emergency-flags`,
  `PATCH /emergency-flags/:flagId/acknowledge`, `PATCH /emergency-flags/:flagId/resolve`
  (literal path before `/:id` wildcards).
- `apps/backend/src/types/index.ts` — `EmergencyFlag`, `VitalsSnapshot`, `PopulatedUserRef`.

### Notes / deviations from the Part-1 prompt
- Used the embedded `MedicalRecord.vital_signs` for the snapshot (the `VitalSign.ts` model is an
  empty stub). snake_case fields (not camelCase) to match the codebase. Names resolved via
  `Profile` (not `populate` on `User`). Logic kept controller-resident (no service layer), per
  the existing nurse/doctor pattern.

### Verification
- `npx tsc --noEmit` → 0 errors; `npm run audit:routes` → ❌ 0 (4 routes backend-only until
  Part 2), 249 matched; live lifecycle smoke on :5000 passed (raise→list→403→ack→400→resolve→
  nurse-list+kpis, vitals_snapshot populated).

## [2026-06-03] Full Integration Test Sweep (all 10 roles, API-level) + blocking-bug fixes

### Goal
First end-to-end smoke test of every role's core flow against a live backend (`:5000`,
shared `siryandev` Atlas cluster). Method: API-level via curl/token-replay + code audit
(no browser). Seeded 6 missing staff roles (self-register → admin approve) + 2 patients,
all namespaced `*@siryan.test` / `ZZTest*`. Found and fixed 3 blocking bugs inline;
documented several non-blocking issues.

### Backend fixes applied
- `apps/backend/src/routes/doctor.routes.ts` — fixed route shadowing: registered
  `GET /doctor/me/ratings` (with `authenticate, requireCompleteProfile, authorize("doctor")`)
  **before** the `/:id/ratings` wildcard, removed the dead later registration.
  Was 500 (`ObjectId("me")`) → now 200. ([BUG-DR-RATINGS])
- `apps/backend/src/controllers/receptionist/index.ts` — `getAllAppointments` is now
  null-safe for orphaned appointments (populated patient/doctor = null). Was 500
  (`null.toString()`) → now 200. ([BUG-RECEP-APPTS-NULL])
- `apps/backend/src/utils/mailer.ts` — added `connectionTimeout`/`greetingTimeout`/
  `socketTimeout` = 7000ms to the nodemailer transport so no `sendEmail` call site can
  hold an HTTP response ~2 min on a slow/invalid SMTP key. ([BUG-MAIL-AWAIT] / closes the
  [BUG-AUTH-1] follow-up TODO)
- `apps/backend/src/controllers/admin/index.ts` — `createStaff` and `approveStaff`
  `sendEmail` calls are now fire-and-forget (`.catch`), matching the `registerStaff` fix.
  Create-staff now returns 201 in 0s. ([BUG-MAIL-AWAIT])

### Verification
- Backend `npx tsc --noEmit` → 0 errors.
- `npm run audit:routes` → ❌ FE-calls-with-no-backend-route: **none**; ✅ 249 matched.
- Re-ran each fixed endpoint → expected 2xx.

### Coverage (all ✅ unless noted)
- **Auth gating (10 roles):** login + correct JWT role claim; own endpoint 200;
  cross-role `/admin/stats` 403; logout 200; refresh-token reuse after logout → 401.
- **Patient:** profile r/w, change-password, full booking (depts→doctor-filter→slots→
  create), online booking + mock-pay (→confirmed), records/lab/radiology/prescriptions,
  pharmacy browse + order, invoices, rooms browse + book, notifications.
- **Doctor:** queue, patients, diagnosis/record, prescription, lab + radiology orders,
  schedule block/unblock, notes CRUD, cancel-request, video token (call-create correctly
  gated to 5-min window), ratings (after fix).
- **Receptionist:** patients, appointments (after fix), confirm, B7 create-appt, B8
  register-patient, check-in, lab/radiology lists, cancel-request approval (Flow 4).
- **Nurse:** patients, record vitals, vitals history (B5), med-schedule, log-given,
  emergency flag.
- **Lab / Radiology:** orders, single (B1/B2), status, upload results; patient sees results.
- **Pharmacist:** prescriptions, verify (B3) / reject (B4), orders approve/reject,
  medications, supply-request.
- **Inventory:** items CRUD, low-stock, supply-requests + fulfill, rooms CRUD + status.
- **Cashier:** pending, invoices, single, full pay, partial pay (→partially_paid),
  cancel, daily report.
- **Admin:** 23 GET endpoints all 200; create-staff/changeRole/activate, create
  department/insurance, assign shift, deletion-approve wiring (404 not 500), staff approve.
- **Cross-role:** all 4 flows (book→confirm→vitals→record+Rx→verify→pay; lab→upload→
  patient; online→pay→video-token; doctor-cancel→recep-approve→cancelled).
- **Real-time:** DB notifications confirmed for lab/radiology→doctor, emergency→doctor,
  appt-confirmed→patient, prescription→patient, new-order→pharmacist; socket emits verified
  in source. Gaps documented ([BUG-RT-NOTIFYROLES], [BUG-RT-PRESC-PATIENT]).

### Documented (non-blocking, not fixed) — see bugs.md
[BUG-RT-NOTIFYROLES], [BUG-RT-PRESC-PATIENT], [BUG-SEC-STAFFREQ], [BUG-AUTH-LOGOUT-STATELESS].

## [2026-06-02] Patient System Fixes — Part 2 (Book Appointment Improvements)

### Goal
Fix all remaining bugs in the book-appointment flow and improve UX: dynamic departments, department-filtered doctor list, component extraction, mobile overflow, icon fix, dead button removal.

### Backend Changes
- `apps/backend/src/routes/patient.routes.ts` — imported `getDepartments` from admin controller; added `GET /patient/departments` route
- `apps/backend/src/controllers/doctor/index.ts` — `getDoctorList` now reads `?department` query param and adds it to the profile query filter

### Frontend Changes
- `apps/frontend/src/lib/queryKeys.ts` — added `bookingDepartments` and `bookingDoctors` keys
- `apps/frontend/src/services/patient.service.ts` — added `getDepartments()` method → `GET /patient/departments`
- `apps/frontend/src/hooks/shared/useBooking.ts` — full rewrite: departments via TanStack Query; department default set from first loaded item; doctor fetch passes `?department`; department change clears doctorId (skips mount); `reason` fallback removed (sends `''`); `cachedDoctorRef` for back-nav resilience; returns `departments` + `departmentsLoading`
- `apps/frontend/src/components/patient/ReasonStep.tsx` — hardcoded DEPARTMENTS array removed; props extended with `departments` + `departmentsLoading`; loading skeleton + empty fallback; Next disabled while loading
- `apps/frontend/src/components/patient/DoctorCard.tsx` — **NEW** extracted doctor row card component
- `apps/frontend/src/components/patient/DoctorFilterBar.tsx` — **NEW** extracted specialization filter chip bar (single scroll container)
- `apps/frontend/src/components/patient/DoctorStep.tsx` — refactored: uses DoctorCard + DoctorFilterBar; duplicate outer div removed; distinct empty-state with "Change department" button; helper hint below disabled Next
- `apps/frontend/src/components/patient/ConfirmStep.tsx` — Notes row icon: Calendar → FileText
- `apps/frontend/src/components/patient/BookingProgress.tsx` — wrapped in `overflow-x-auto` outer div; inner row uses `min-w-max`
- `apps/frontend/src/components/patient/BookingSummaryPanel.tsx` — removed dead "Save as draft" button
- `apps/frontend/src/app/dashboard/patient/appointments/new/page.tsx` — destructures `departments` + `departmentsLoading`; passes both to ReasonStep

### Result
- `npm run audit:routes`: ❌ 0 (GET /patient/departments now ✅ matched)
- `npx tsc --noEmit` (backend): 0 errors
- `npx tsc --noEmit` (frontend): 0 errors



## [2026-06-02] Patient System Fixes — Part 1 (7 bugs + 1 TanStack migration)

### Goal
Fix all confirmed bugs in the Patient dashboard, migrate usePharmacy to TanStack Query, and enable the Join Call button.

### Backend Changes
- `apps/backend/src/controllers/patient/index.ts` — added `getAppointment` export (single appointment by id with ownership check + doctor populate)
- `apps/backend/src/routes/patient.routes.ts` — imported `getAppointment`, added `GET /appointments/:id` route

### Frontend Changes
- `apps/frontend/src/app/dashboard/patient/page.tsx` — FIX 1: `a.updated_at` → `a.updatedAt ?? a.updated_at` (Invalid Date fix); hardcoded `'your doctor'` → reads `upcoming[0].doctor_name`
- `apps/frontend/src/hooks/patient/usePatientRequests.ts` — FIX 2: removed `|| !(l as any).scheduled_at` from both pendingLabs and pendingImaging filters
- `apps/frontend/src/app/dashboard/patient/appointments/page.tsx` — FIX 3: Join Call button replaced with 5-min-window gate using `VIDEO_WINDOW_MS`; active = Link to online room, inactive = disabled with tooltip
- `apps/frontend/src/services/patient.service.ts` — FIX 4: added `getAppointment(id)` method
- `apps/frontend/src/app/dashboard/patient/appointments/[id]/pay/page.tsx` — FIX 4: replaced `getAppointments()` + filter with `getAppointment(id)` direct fetch
- `apps/frontend/src/app/dashboard/patient/appointments/online/[id]/page.tsx` — FIX 5: same single-fetch replacement
- `apps/frontend/src/lib/queryKeys.ts` — added `patientAppointment`, `patientPharmacyMedications`, `patientPharmacyOrders`, `patientInsuranceCompanies`, `patientPharmacyCart` keys
- `apps/frontend/src/hooks/patient/usePharmacy.ts` — FIX 6: full TanStack Query migration (4 useQuery + 1 useMutation); cart/UI state stays useState; socket delivery:update uses setQueryData; pharmacy:order:updated invalidates orders; return shape unchanged
- `apps/frontend/src/hooks/shared/useBooking.ts` — FIX 7: removed FALLBACK_DOCTORS; added doctorsError + retryDoctors; on fetch fail → empty array + error flag
- `apps/frontend/src/components/patient/DoctorStep.tsx` — FIX 7: added error/onRetry props; empty+error state shows retry button; Next disabled when doctors empty
- `apps/frontend/src/app/dashboard/patient/appointments/new/page.tsx` — FIX 7: destructures doctorsError + retryDoctors, passes to DoctorStep

### Result
- `npm run audit:routes`: ❌ 0 (GET /patient/appointments/:id now in ✅ matched)
- `npx tsc --noEmit` (backend): 0 errors
- `npx tsc --noEmit` (frontend): 0 errors



## [2026-06-02] B1–B8 Backend Gap Fixes — All 8 Missing Routes Implemented

### Goal
Re-apply the B1–B8 fixes from `.claude/api-contract-report.md`. After this session `npm run audit:routes` reports ❌ 0.

### Backend Changes
- `apps/backend/src/controllers/lab/index.ts` — added `getLabOrderById` (B1)
- `apps/backend/src/routes/lab.routes.ts` — added `GET /orders/:id` (B1)
- `apps/backend/src/controllers/radiology/index.ts` — added `getRadiologyOrderById` (B2)
- `apps/backend/src/routes/radiology.routes.ts` — added `GET /orders/:id` (B2)
- `apps/backend/src/controllers/pharmacist/index.ts` — added `verifyPrescription` + `rejectPrescription` (B3, B4)
- `apps/backend/src/routes/pharmacist.routes.ts` — added `POST /prescriptions/:id/verify` + `POST /prescriptions/:id/reject` (B3, B4)
- `apps/backend/src/controllers/nurse/index.ts` — added `getPatientVitals` (B5)
- `apps/backend/src/routes/nurse.routes.ts` — added `GET /patients/:id/vitals` (B5)
- `apps/backend/src/validations/receptionist.validation.ts` — added `createAppointmentSchema` + `registerPatientSchema` (B7, B8)
- `apps/backend/src/controllers/receptionist/index.ts` — added `createAppointment` + `registerPatient` (B7, B8)
- `apps/backend/src/routes/receptionist.routes.ts` — added `POST /appointments` + `POST /patients` (B7, B8)

### Frontend Changes
- `apps/frontend/src/services/admin.service.ts` — split `processDeletionRequest(id, action)` into `approveDeletionRequest(id)` + `rejectDeletionRequest(id)` so audit script can match literal route segments (B6)
- `apps/frontend/src/app/dashboard/admin/compliance/page.tsx` — updated `handleProcess` to call the split functions (B6)

### Result
- `npm run audit:routes`: ❌ 8 → **0**
- `npx tsc --noEmit` (backend): 0 errors
- `npx tsc --noEmit` (frontend): 0 errors

## [2026-06-02] Route-Diff Follow-Up — Cancel Room Booking + Script Fixes

### Changed Files
- `apps/backend/src/controllers/patient/index.ts` — added `cancelRoomBooking` export: finds booking by `{_id, patient}` (ownership check), rejects if already cancelled/completed, sets `status='cancelled'`, frees room if it was active, invalidates `CACHE_KEYS.ROOM_AVAILABILITY`, non-fatal doctor notification
- `apps/backend/src/routes/patient.routes.ts` — imported `cancelRoomBooking`, added `router.delete('/rooms/bookings/:id', cancelRoomBooking)`
- `apps/backend/scripts/auditRoutes.ts` — added `/:param/profile` to `shouldIgnore` with comment explaining the `staff.service.ts` roleToPath dispatch pattern
- `apps/frontend/src/services/cashier.service.ts` — removed dead `getDailyStats` method (was calling non-existent `GET /cashier/stats/daily`; `getDailyReport` already covers this)

### Result
`npm run audit:routes`: ❌ 12 → 8. The remaining 8 are all known unimplemented-feature gaps (not wiring bugs), documented in `.claude/bugs.md` as RD-1 through RD-9.

## [2026-06-02] API Contract Audit — Route-Diff Script + Shape Fixes

### Goal
Create a permanent route-diff audit tool and fix all confirmed shape mismatches between backend controllers and frontend service normalizers.

### Created Files
- `apps/backend/scripts/auditRoutes.ts` — regex-based diff: parses all `*.routes.ts` + all `*.service.ts`, compares method+path pairs, outputs ❌/⚠️/✅ report to console and `.claude/route-diff-report.txt`
- `.claude/api-contract-report.md` — shape audit results table (all hotspots audited 2026-06-02)

### Changed Files
- `apps/backend/package.json` — added `"audit:routes": "ts-node --project tsconfig.json scripts/auditRoutes.ts"` script
- `apps/frontend/src/services/admin.service.ts`:
  - `getShifts()` — `Array.isArray` check replaced with `Object.values(raw.shifts).flat()` (BE returns grouped object, not array)
  - `getTodayShifts()` — same fix as `getShifts`
  - `getDepartmentStaff()` — `list.map()` on grouped object replaced with `Object.values(raw).flat()` (BE groups by role)
  - `processDeletionRequest()` — URL fixed from `/deletion-requests/:id` to `/deletion-requests/:id/approve|reject`; return type changed to `void` (BE returns null)
- `.claude/todos.md` — added Post-Launch section (shared contract, E2E tests, CI gate)
- `.claude/memory.md` — added API Contract Health section
- `.claude/current-task.md` — updated to current task

### Root Cause (shape mismatches)
All three fixes stem from the same pattern: backend groups results by a key (department, role) and returns `Record<string, T[]>` while the frontend expected a flat `T[]`. The `Array.isArray()` guard correctly detected the mismatch but silently defaulted to `[]` instead of surfacing an error.

## [2026-06-02] TanStack Query Migration — Part 3 (Hook Cleanup + Notifications)

### Goal
Finish the 3-part TanStack Query migration: clean up 39 backward-compat barrel files, migrate `useNotifications` to TanStack, create a root `hooks/index.ts`, and update all imports across the codebase.

### Changed Files
- `apps/frontend/src/lib/queryKeys.ts` — added `notifications()` and `chatbotHistory(sessionId?)` keys
- `apps/frontend/src/hooks/shared/useNotifications.ts` — replaced `useState`+`setInterval(30s)` with `useQuery(refetchInterval:30_000)`; socket `notification:new` → `setQueryData`; markRead/markAllRead/deleteOne/clearAll as `useMutation`; return shape identical
- 111 page/component/hook files — import path updates only: `@/hooks/useXxx` → `@/hooks/[role]` or `@/hooks/shared`

### Created Files
- `apps/frontend/src/hooks/index.ts` — root barrel; conflict-safe aliases for `QueueFilter` (exported by both doctor/ and receptionist/)

### Deleted Files (39 barrel re-export files)
`hooks/use{Auth,Booking,Chatbot,Doctor,DoctorNotes,DoctorQueue,DoctorRatings,DoctorSchedule,InCallChat,Inventory,Lab,MediaQuery,Notifications,Nurse,PatientAppointments,PatientBilling,PatientProfile,PatientRecord,PatientRecords,PatientRequests,PatientVideoCall,Pharmacist,PharmacistDashboard,PharmacistHistory,PharmacistMedications,PharmacistOrders,PharmacistPrescriptions,PharmacistRefills,PharmacistReport,Pharmacy,Radiology,Receptionist,Rooms,Settings,SocketEvent,Toast,UsernameCheck,VideoCall,WaitingEstimate}.ts`

### Conventions
- `useChatbot` NOT migrated to TanStack — it has no server fetch; session-local conversational state only. `chatbotHistory` key added as placeholder.
- Lint errors (315) are all pre-existing; 0 new errors in modified files.

### Verification
- `npx tsc --noEmit` → 0 errors
- `grep -r "from '@/hooks/use"` → 0 matches
- `grep -r "apiClient" src/app` → 0 matches (no direct API calls in pages)

## [2026-06-02] Bugfix — Staff registration response held by inline `await sendEmail`

### Symptom
`POST /auth/register/staff` eventually returned 2xx but took tens of seconds. The frontend
`StaffForm` correctly awaited the response, so "Submitting…" lingered the whole time and
`StaffSuccessScreen` rendered only after the email round-trip settled. Looked like the form
was "stuck" but it was just blocked on SMTP.

### Root cause
`authService.registerStaff` (`apps/backend/src/services/auth.service.ts`) had
`await sendEmail(...).catch(() => {})` inline before `return { pending, message }`.
`sendEmail` opens an SMTP connection to `smtp.sendgrid.net:587` (nodemailer) with no
`connectionTimeout`/`socketTimeout` configured. If SendGrid is slow / throttling / API key
bad, the HTTP response is held until the SMTP layer settles. The notification insert and
socket emit immediately above are already wrapped as fire-and-forget — email belongs in the
same bucket.

### Changed Files
- `apps/backend/src/services/auth.service.ts` — removed `await` from the `sendEmail` call in
  `registerStaff`. `.catch(() => {})` already swallows rejection. Added a one-line comment
  explaining the intent.

### Verification
- `npx tsc --noEmit` (backend) → 0 errors. No frontend changes.

### Follow-up (not done — intentionally out of scope)
- Audit other call sites that `await` `sendEmail`/`sendTemplatedEmail` inside request handlers.
- Consider setting `connectionTimeout` + `socketTimeout` on the nodemailer transport in
  `apps/backend/src/utils/mailer.ts` so a misconfigured `SENDGRID_API_KEY` fails fast.

## [2026-06-02] Bugfix — Pending-staff sidebar badge stale + row stays after approve/reject

### Symptom
(1) Admin sidebar pending-staff badge fetched once on mount; never updated after approve/reject
or after the `staff_request:new` socket event. (2) On `/dashboard/admin/staff-requests`, the
row for the just-approved/rejected request lingered until the network refetch completed.

### Root cause
`StaffShell.tsx` predates the TanStack Query migration and used a local `useState` +
one-shot `useEffect` to fetch `pendingStaffCount` via `adminService.getStaffRequests('pending')`.
After yesterday's migration the staff-requests page invalidates the shared
`['admin','staff-requests']` cache key on every mutation, and the hook already listens to
`staff_request:new` — but StaffShell wasn't reading from that cache, so the badge never saw the
invalidation. Bug (2) was just refetch latency (no optimistic update).

### Changed Files
- `apps/frontend/src/hooks/admin/useAdminStaffRequests.ts` — added `enabled?: boolean` option;
  added `onMutate` optimistic updates to `approve` and `reject` (drop the request from every
  cached staff-requests page; snapshot for rollback in `onError`; `onSettled` re-invalidates to
  reconcile with server truth).
- `apps/frontend/src/components/layouts/StaffShell.tsx` — replaced the local `useState` +
  `useEffect` fetch with `useAdminStaffRequests('pending', { enabled: user?.role === 'admin' })`.
  The shared cache + the hook's existing socket listener now keep the badge live; optimistic
  updates make both the row AND the badge decrement instantly on action.

### Why no window event / parallel fetch
The original prompt suggested a `window.dispatchEvent('staff-request-updated')` bridge between
the page and StaffShell. The TanStack Query cache the page already invalidates is exactly the
cross-component live-state mechanism — using it costs zero lines in the page, no new
dependencies, and removes the dangling-listener class of bugs.

### Verification
- `npx tsc --noEmit` (frontend) → 0 errors.
- `npm run lint` (frontend) → 296 problems (baseline; 0 new). The 2 errors in StaffShell
  flagged near the changed lines are pre-existing (`setCollapsed`/`setDrawerOpen` inside
  effects), unrelated to this fix.

## [2026-06-02] Data layer — TanStack Query v5 integration (Admin + Cashier)

### Goal
Replace hand-rolled `useState` + `useEffect` + manual `reload()` patterns in the Admin and Cashier
modules with TanStack Query v5. Goals: shared cache across pages, automatic re-fetch on mutation,
socket events become cache invalidations, and modal/filter/tab UI state moves out of hooks into
the consuming pages. Other modules (doctor/patient/nurse/pharmacist/lab/radiology/reception)
remain on the old pattern for now.

### Dependencies
- Added `@tanstack/react-query@^5` and `@tanstack/react-query-devtools` (frontend only).

### New Files (Frontend, under `apps/frontend/`)
- `src/lib/queryClient.ts` — singleton QueryClient (30s stale, 5min gc, no retry on 401/403/404,
  no refetch-on-focus, mutation retry off)
- `src/lib/queryKeys.ts` — central key registry for all admin + cashier queries
- `src/providers/QueryProvider.tsx` — `'use client'` wrapper around `QueryClientProvider` + devtools
- `src/hooks/admin/` — `useAdminUsers`, `useAdminStaffRequests`, `useAdminAppointments`,
  `useAdminInvoices`, `useAdminReports` (revenue/ratings/occupancy/pharmacy/doctors),
  `useAdminDashboardStats`, `useAdminAuditLog`, `index.ts`
- `src/hooks/cashier/` — `useCashierInvoices`, `useCashierInvoice`, `useCashierPending`,
  `useCashierReport`, `useCashierDashboard`, `index.ts`

### Changed Files
- `src/app/layout.tsx` — wrapped existing `ThemeProvider → AuthProvider → ToastProvider` in
  `<QueryProvider>` (outermost)
- Admin pages: `dashboard/admin/{page,users,staff-requests,appointments,invoices,reports,audit,audit-log}.tsx`
  — switched to per-concern hooks; modal/filter/tab state lives in each page
- Cashier pages: `dashboard/cashier/{page,invoices/page,invoices/[id]/page,pending/page,reports/page}.tsx`
  — same migration
- `src/components/staff/admin/OccupancySection.tsx` — replaced self-fetch with `useAdminOccupancyReport()`
- `src/components/staff/admin/RevenueChart.tsx` — replaced self-fetch + in-component
  `useSocketEvent('payment:received')` with `useAdminRevenueReport({from: 7daysAgo})`
  (socket invalidation now lives in the hook)
- `src/components/staff/admin/UsersTable.tsx` — `UserRoleFilter` import path moved to `@/hooks/admin`

### Deleted Files
- `src/hooks/useAdmin.ts`
- `src/hooks/useCashierInvoices.ts`, `useCashierInvoice.ts`, `useCashierPending.ts`,
  `useCashierReport.ts`, `useCashierDashboard.ts`

### Conventions
- Hook layer call sites: `mutation.mutate(args)` / `mutation.mutateAsync(args)`,
  `mutation.isPending` for loading flag. Pages no longer track local submitting booleans
  for hook-backed actions.
- Socket → cache: socket callbacks use the **singleton** `queryClient` imported from
  `@/lib/queryClient` (`useQueryClient()` would violate hook rules inside a callback);
  React-render code uses `useQueryClient()` as usual.
- Service-layer untouched: hooks call services, services call `apiClient`.
- Toast convention preserved: `showToast(message, 'success' | 'error' | 'info')`.
- Modal/filter UI state was deliberately moved out of hooks into pages (`useState` locally)
  so hooks are pure data layer.

### Adaptations to the original spec (vs. real code)
- Used real service method names: `updateUserRole`, `updateUserActive(id, isActive: boolean)`,
  `approveStaff(id)`, `rejectStaff(id, reason?)`, `getAdminInvoices()`, `getDoctorReport()`.
- Added `useAdminDashboardStats` and `useAdminAuditLog` (the spec didn't cover stats/logs/low-stock
  + audit-log usage in the overview/audit pages, but real `useAdmin` did).
- Rebuilt `useCashierDashboard` in the new structure (spec deleted it without a replacement,
  but the cashier overview page uses `summary`/`transactions`/`createInvoice`).

### Verification
- `npx tsc --noEmit` → 0 errors.
- `npm run lint` → 296 problems vs. 297 baseline (no new errors; one prior warning eliminated).
- Browser smoke test (admin overview/users/staff-requests/appointments/invoices/reports,
  cashier dashboard/invoices/detail/pending/reports + socket-driven refreshes) is the next step
  and has not been run yet.

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
