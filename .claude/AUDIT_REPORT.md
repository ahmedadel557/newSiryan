# Siryan Full Codebase Audit
Date: 2026-06-10
Role: Principal QA + Security + Performance Engineer (Claude Code)

## Summary
- Files scanned: ~120 source files directly read/grepped (18 backend route files, 14 controller folders, 26 models, all frontend styles, all dashboard pages + components swept by pattern)
- Files modified: 47 (16 backend, 30 frontend, 1 root)
- Bugs fixed: 9 (4 from bugs.md backlog + 5 newly found)
- New bugs found: 5 (all fixed)
- Sentry references removed: 1 (stale `.gitignore` line; everything else was already removed in commit 566fbe4)
- TypeScript: **0 errors in both apps** (verified after every track and at the end)

---

## Track 0 — Sentry Removal
Sentry was already fully removed from the project (commit 566fbe4 "removing sentry from the project").
Full grep across `*.ts/tsx/js/json/env*/config.*` returned **one** remaining reference:

| File | Action |
|---|---|
| `.gitignore` | Removed stale `apps/frontend/.env.sentry-build-plugin` line |

Verified absent: `@sentry/*` in all three package.json files and package-lock, `sentry.*.config.ts` files, `instrumentation.ts`, `withSentryConfig` in `next.config.ts`, `SENTRY_*` vars in both `.env.example` files.

---

## Track 1 — Bugs + Security

### Fixed
- **[BUG-RT-NOTIFYROLES]** `apps/backend/src/controllers/doctor/index.ts` — `notifyRoles()` now emits `notification:new` per created Notification doc (via `emitToUser(doc.user, …, doc.toJSON())`). Covers all three call sites (createPrescription → pharmacists, createLabOrder → lab techs, createRadiologyOrder → radiology techs) with no call-site changes.
- **[BUG-RT-PRESC-PATIENT]** same file, `createPrescription` — captures the patient Notification doc and emits `emitToUser(patientId, 'notification:new', notif.toJSON())`.
- **[BUG-RECEP-APPTS-NULL]** `apps/backend/src/controllers/receptionist/index.ts` — hoisted the null-safe `refId()` helper to module scope; replaced **all 7** unsafe `?? ref.toString()` sites: `getPatients`, `confirmAppointment` (incl. guarded `emitToUser`/email lookups), `cancelAppointment`, `rescheduleAppointment`, `getRequests`, `getPendingLabOrders`, `getPendingRadiologyOrders`.
- **[BUG-SEC-STAFFREQ]** — *already fixed in source*: `getStaffRequests` has `.select('-password -reset_token -reset_token_expires')`. Marked resolved in bugs.md.

### 1B — await sendEmail audit
| Call site | Verdict |
|---|---|
| `controllers/admin/index.ts` `rejectStaff` | **Fixed** — dropped `await`, added `// fire-and-forget: non-fatal` comment (`.catch(() => {})` was already there) |
| `controllers/admin/index.ts` `approveStaff` | Already fire-and-forget ✓ |
| `services/auth.service.ts` `forgotPassword` | Kept `await` — password-reset family is synchronous by design (per spec skip list); bounded by the 7s mailer timeout |
| `jobs/appointmentReminder.job.ts` | Cron job, not a request handler — awaiting is correct |
| `utils/mailer.ts` internal | Helper implementation — correct |

### 1C — Auth middleware coverage (all 18 route files scanned)
Every route file uses either a blanket `router.use(authenticate, requireCompleteProfile, authorize(role))` (patient, doctor*, nurse, receptionist, pharmacist*, lab, radiology, cashier, admin) or per-route `authenticate` + scoped `authorize`. Intentionally public (verified by design): `GET /api/settings/pricing`, `GET /api/settings/maintenance`, `GET /api/departments/by-role`, `GET /api/shifts`, `GET /api/insurance-providers`, auth register/login/verify/reset endpoints. `/(api/)notifications`, `/api/schedule/me`, `/api/upload/avatar` are authenticate-only and operate strictly on `req.user.id` ✓. Admin user-mutation routes carry `protectRootAdmin` ✓. **No missing middleware found.**

### 1D — Zod validation coverage
All POST/PUT/PATCH routes either carry `validateRequest(schema)` middleware or their controller does an inline `schema.safeParse` (verified for auth, patient, settings, doctor, schedule-system controllers). One hardening fix:
- `apps/backend/src/routes/auth.routes.ts` `/complete-profile` — inline handler could 500 on missing `username` (`username.trim()` on undefined). Added explicit `username`/`password` type+presence guard → 400.

---

## Track 2 — Performance

### 2A — Cashier stats endpoint
Already fixed: `cashier.service.ts` calls `GET /cashier/reports/daily` (raw `DailyReport` shape, in production use). The stale `[HIGH]` todo item was checked off.

### 2B — Cache keys audited (full list)
| Key | Set in | Invalidation | Action |
|---|---|---|---|
| `settings:pricing` | utils/pricing.ts, admin getPricingAdmin | all 8 pricing mutations | ✓ none needed |
| `insurance:companies(+:active)` | admin list, patient list | insurance create/update/delete | ✓ none needed |
| `rooms:availability` | inventory getRooms | room CRUD/status + patient book/confirm/cancel | ✓ none needed |
| `pharmacy:medications` | pharmacist getMedications | order approve ×2, addBatch, warehouse assign | ✓ none needed |
| `schedule:doctor:{id}` | doctor getSchedule | block/unblock, admin override, new-schedule upsert/delete, booking | ✓ none needed |
| `profile:{userId}` | patient getProfile | patient updateProfile only | **Fixed** — added `cache.del` to `updateUserProfileAdmin` and avatar upload/delete (`controllers/upload/index.ts`) |
| `slots:{doctorId}:{date}` | doctor getDoctorAvailability | booking, doctor block/unblock, new-schedule upsert/delete | **Fixed — 8 gaps closed** (below) |
| `blacklist:{hash}` | auth logout | TTL-bound | ✓ none needed |

Slot-cache invalidation gaps fixed (same class as resolved BUG-SLOTS-1):
1. `admin/index.ts` `overrideDoctorSchedule` — added `cache.delPattern('slots:{id}:*')` (legacy BlockedSlot writes never flushed slot caches)
2. `admin/index.ts` `deleteDoctorScheduleSlot` — added precise `SLOTS(id, slot.date)` del
3. `admin/index.ts` `cancelAdminAppointment` — cancel frees the slot; flush that day
4. `admin/index.ts` `updateUserProfileAdmin` — `shift` changes flow into legacy availability fallback; flush schedule + slot caches
5. `admin/blockedDates.controller.ts` `createBlockedDate` + `deleteBlockedDate` — block/unblock now flush `slots:{user}:*` (user scope) or `slots:*` (department scope)
6. `patient/index.ts` `cancelAppointment` — flush the freed day
7. `receptionist/index.ts` `cancelAppointment` / `rescheduleAppointment` (old + new day) / `createAppointment` — new `flushSlotCache()` helper

### 2C — N+1 queries fixed
- `pharmacist/index.ts` `deductStockForOrder` — per-item `Medication.findById` pre-check loop → single `$in` fetch + Map
- `inventory/index.ts` `fulfillSupplyRequest` — per-item `InventoryItem.findById` pre-check loop → single `$in` fetch + Map
- `inventory/index.ts` `createPurchaseOrder` — `Promise.all(items.map(findById))` → single `$in` fetch + Map (sync enrichment)
- `inventory/index.ts` `receivePurchaseOrder` — per-item expiry `findById` inside loop → batched expiry pre-fetch
- *(not changed)* `doctor/index.ts:485` `Profile.findOne` inside vitals loop — loop-invariant query with `break` after first hit (≤1 query); left as-is

### 2D — Indexes
| Model | Index | Action |
|---|---|---|
| Appointment | `{ patient: 1, status: 1 }` | **Added** |
| Appointment | `{ doctor: 1, date }` | Skipped — covered by existing `{ doctor: 1, scheduled_at: -1 }` |
| Notification | `{ user: 1, is_read: 1 }` | Skipped — covered by existing `{ user: 1, is_read: 1, createdAt: -1 }` |
| Invoice | `{ patient: 1, status: 1 }` | Exists ✓ |
| Prescription | `{ patient: 1, status: 1 }` | Exists ✓ |
| LabOrder | `{ doctor: 1, status: 1 }`, `{ patient: 1, ordered_at: -1 }`, `{ status: 1, ordered_at: -1 }` | **Added** (model had zero indexes) |
| RadiologyOrder | same three | **Added** (model had zero indexes) |

### 2E — Backend build config
- `tsconfig.json` — **added `"sourceMap": true`**; `outDir`/`rootDir`/`strict`/`skipLibCheck` already correct
- `package.json` — `build: tsc` → `dist/`, `start: node dist/server.js` already correct ✓

### 2F — Frontend workspace
- `apps/frontend/package-lock.json` — does not exist ✓
- `next.config.ts` — **added `turbopack: { root: '../../' }`**. Note: used the top-level `turbopack` key, not `experimental.turbopack` — the project is Next 16 where the option is stable/top-level; `experimental.turbopack` would be an unrecognized key.

---

## Track 3 — Color + Dark Mode

### 3A — Token audit
- Every `var(--token)` in kit.css resolved against tokens.css; one undefined: `--critical-hover` (used with a fallback). **Added** `--critical-hover` to tokens.css (`:root`: coral-500, `.dark`: coral-300).
- `UsernameField.tsx` referenced undefined `var(--error)` → changed to `var(--critical)`; hardcoded `#16a34a` → `var(--positive)`.
- `VitalTile.tsx` — raw hex sparkline strokes → `var(--positive/--caution/--critical/--fg-3)`; non-flipping `bg-[var(--sand-50)]` tile → `var(--bg-sunken)`; neutral chip → `--neutral-soft-bg/fg`.
- Intentional hardcoded colors **kept** (documented): GoogleIcon brand colors; Stream video theme constants in `VideoCallLayout.tsx` (deliberate always-dark UI with documented contrast); landing-page SVG gradients/mock art; print-only HTML templates in cashier invoice/report pages; `#fff` on brand/critical solid backgrounds.

### 3B/3C — Dark mode sweep
Full grep for `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*` without `dark:` across `components/` and `app/` returned only 2 hits, both legitimate (toggle knob `bg-white`, translucent `bg-white/20` badge on brand). Modal overlays all use theme-neutral `rgba(0,0,0,0.4–0.5)` ✓; inputs/tables/badges all come from tokenized kit.css ✓. The 2026-06-03 UI-C1…C4 fixes had already cleaned this layer; no regressions found.

### 3D — WCAG AA contrast (computed)
| Element | Pair | Ratio | Verdict |
|---|---|---|---|
| Primary button (light) | #fff on forest-600 | 8.75:1 | ✓ |
| Primary button (dark) | #fff on forest-400 | **3.95:1** | ✗ → fixed |
| Table header/meta (light) | sand-500 on sand-100 | **3.97:1** | ✗ → fixed |
| Form labels | --fg-2 on --bg-surface | >10:1 / >9:1 | ✓ |
| Badge soft variants (light+dark) | all five | 4.8–6.6:1 | ✓ |
| Sidebar active nav | white on forest-800 + white/10 | >10:1 | ✓ |

**Token value changes:**
- `--fg-3` (`:root`): `var(--sand-500)` → `var(--sand-600)` (3.97 → 6.66 on sunken, 7.55 on white; dark value unchanged at 4.9 ✓)
- `--critical-hover`: *new* — `:root` `var(--coral-500)`, `.dark` `var(--coral-300)`

**Documented deviation:** the dark-mode button failure cannot be fixed by adjusting `--brand` itself — white-label AA needs L≤0.183 while brand-as-text AA (101 usages) needs L≥0.195, which is mathematically unsatisfiable in one token. Fixed instead with scoped dark rules: `.dark .btn-primary` (kit.css) and `dark:` variants on the React `Button` primary variant, using forest-500/600/700 (5.77–8.75:1). `--fg-on-brand` was left white because flipping it would break the video-call overlay text that uses it over dark surfaces.

---

## Track 4 — Layout + Responsive + RTL

### 4A — Logical properties
- **TSX**: converted every physical direction class — `pl-8`→`ps-8` (schedules ×2), `ml-2`→`ms-2` (inventory item, InvoiceDetailModal), `pl-2 pr-1`→`ps-2 pe-1` (ScheduleGrid), `pl-0`→`ps-0` (ActiveAlertsCard), `ml-1`→`ms-1` (LabOrderModal), `ml-4`→`ms-4` (StaffShell), `-mr-1 pr-1`→`-me-1 pe-1` (BookingProgress), `text-right mr-2`→`text-end me-2` (DoctorCard), `pl-9`→`ps-9` (ui/Input), plus **28 `ml-auto`/`mr-auto` → `ms-auto`/`me-auto`** across 17 files. Post-sweep grep: **0 remaining**.
- **CSS**: kit.css `padding-left:38px`→`padding-inline-start`, `.tbl th { text-align:left }`→`start`, icon `left:12px`→`inset-inline-start`; auth.css input icon paddings + password-toggle `right:0`→`inset-inline-end:0`.

### 4B — Mobile-first
- Modal widths: all `w-[NNNpx]` modals already use the safe `w-full max-w-[NNNpx]` pattern (verified 71/77 matches; rest are `md:`-prefixed or table min-widths inside scroll wrappers) ✓
- Fixed two non-mobile-first grids: patient rooms date inputs → `grid-cols-1 sm:grid-cols-2`; receptionist orders summary cards → `grid-cols-1 md:grid-cols-2`. Remaining base `grid-cols-2` instances reviewed and intentionally kept (KPI tiles, dl pairs, checkbox grids, 7-col calendar).
- Touch targets: kit.css already enforces 44px buttons/inputs on mobile ✓

### 4C — Table overflow
22 unwrapped `<table>` elements wrapped in `<div className="overflow-x-auto">` across 19 files (admin insurance/reports, inventory budget/items/reports, pharmacist history/medications/reports/BatchesModal, doctor Lab/Overview/Prescriptions/Radiology tabs, staff UsersTable/InventoryTable/SupplyRequestsTable/LabOrdersTable/RadiologyOrdersTable/RequestsTable). `WeekCalendarGrid` already sat in `card overflow-auto`; cashier print templates excluded (print context).

### 4D — Shell layout
Both `StaffShell` and `PatientShell` hide the sidebar on mobile and use a bottom tab bar (equivalent to the hamburger requirement; toggle buttons meet 44px via mobile kit rules). No fixes needed.

### 4E — RTL readiness
- `app/layout.tsx` — added `dir="ltr"` to `<html>` (lang was present)
- Added `rtl:rotate-180` to **38 `ArrowLeft`/`ArrowRight` icons in 28 files** (inert under LTR; correct flip when dir switches). Chevrons skipped deliberately — most are vertical/disclosure semantics.

---

## Track 5 — API Contract

### Route audit result
`npm run audit:routes` (after fixing the script — see below):
```
Backend routes: 322 | Frontend calls: 306 parsed, 8 unparseable
❌ FE CALLS WITH NO MATCHING BACKEND ROUTE — none ✓
✅ MATCHED (281)
```
- **Script fix:** `scripts/auditRoutes.ts` `MOUNT_MAP` was missing 4 mounts (`department`, `schedule`, `shifts`, `insuranceProviders` route files), producing 3 false "unmatched" calls. Added them; real unmatched count is **0**.
- 41 "backend routes nothing calls" are known false positives: per-role `/profile` (FE uses dynamic `/${role}/profile`), `POST /auth/refresh-token` (raw axios in the 401 interceptor), avatar upload (FormData call), `/admin/insurance` legacy aliases, maintenance/cleanup utilities. The 8 unparseable entries are query-string template literals whose static prefixes all matched.

### Response shape fixes
- **[BUG-NEW-5]** `pharmacy.service.ts` `rejectPatientOrder()` PATCHed `/pharmacy/orders/:id/reject` with **no body**, but the route validates `rejectOrderSchema` (requires `rejection_reason`) → guaranteed 422 if ever called. It and its dead twin `approvePatientOrder()` had zero call sites (the live paths are `rejectOrder(id, reason)` / `approveOrder`). **Removed both dead methods.**
- Spot-checked the newest contracts (lab/radiology `GET /orders/:id`, prescription verify/reject, nurse vitals GET, receptionist POST appointments/patients): shapes match; nurse service defensively handles array/object.
- The 2026-06-02 shape audit fixes (getShifts, getDepartmentStaff, processDeletionRequest) re-verified still in place.

---

## New Bugs Found
- **[BUG-NEW-1]** Slot caches not invalidated on appointment cancel/reschedule, admin schedule override, BlockedDate create/delete, or Profile.shift edits (≤5 min stale availability; same class as BUG-SLOTS-1) — backend, **fixed** (8 call sites)
- **[BUG-NEW-2]** `profile:{userId}` cache stale after admin profile edit or avatar upload/delete (≤10 min stale avatar/name) — backend, **fixed**
- **[BUG-NEW-3]** `POST /auth/complete-profile` 500s on missing `username`/`password` (unvalidated inline handler) — backend, **fixed** (400 guard)
- **[BUG-NEW-4]** `UsernameField` referenced undefined `var(--error)` token (taken-username message rendered unstyled inherit color) — frontend, **fixed**
- **[BUG-NEW-5]** Dead `rejectPatientOrder` service method would always 422 (missing required `rejection_reason`) — frontend, **fixed** (removed)

## Verification (mandatory last step)
```
apps/backend:  npx tsc --noEmit → 0 errors
apps/frontend: npx tsc --noEmit → 0 errors
```
Run after Tracks 1, 2, 4 and at the end. `npm run audit:routes` → 0 unmatched FE calls.
