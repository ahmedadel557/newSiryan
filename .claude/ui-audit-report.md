# UI / UX Audit — All Role Dashboards (2026-06-03)

**Scope:** `tokens.css`, `kit.css`, all 12 `components/ui/*`, all 7 `components/shared/*`,
and the 98 `app/dashboard/**` pages (read-only audit; nothing changed).

**Method:** Full read of the design system + every UI/shared component; systemic greps
across the dashboard tree for hardcoded colors, status maps, state coverage, dead buttons,
and table overflow; targeted reads of representative pages to verify heuristics.

**Headline:** Color discipline is excellent — **0 hardcoded Tailwind color classes** anywhere,
and almost everything routes through CSS-var tokens. The real problems are: (1) several
**foundational components don't adapt to dark mode** (they hardcode light `--sand-*` values),
so the issue is amplified everywhere they're used; (2) **two parallel design systems** for
badges/modals/buttons cause visual inconsistency; (3) at least one page (`nurse/alerts`) is a
**static mockup**; and (4) a scattering of **dead buttons**.

> Confidence notes: component-level findings were read directly (high confidence). Page-level
> "dead button" and "table overflow" findings are partly heuristic (grep) — the ones cited with
> line numbers were verified by reading; the broader lists are flagged "verify per page."

---

## 🔴 Critical (breaks usability or looks broken)

> **Update 2026-06-03 (Emergency Flag Part 2):** C1, C2, C3, C4 are all **✅ FIXED**. See
> `changelog.md` / `bugs.md` (UI-C1…UI-C4) for the resolutions.

### C1 — `nurse/alerts` is a static mockup, not wired to the backend  — ✅ FIXED (2026-06-03)
- **File:** `app/dashboard/nurse/alerts/page.tsx:21–54`
- **What's wrong:** The `flags` array is **hardcoded fake data** (invented patients "Hadi
  Mansour", "Tania Bou-Khalil", "Omar Ghattas", "Karim Saadeh", fake vitals/times/statuses).
  Only `patients[1]`/`patients[4]` names are pulled from the hook as a veneer. All KPIs
  (`activeCount`, `pendingCount`, …) are computed from this fake array, the empty state
  (line 98) can never trigger, and the **Filter / "Raise new flag" / View** buttons
  (lines 88–91, 128) have no handlers.
- **Should be:** Drive from a real nurse-alerts/emergency-flags query (the nurse emergency-flag
  endpoint exists on the backend); wire the action buttons or remove them.

### C2 — `Skeleton` component doesn't adapt to dark mode (used app-wide)  — ✅ FIXED (2026-06-03)
- **File:** `components/ui/Skeleton.tsx:10` — `bg-[var(--sand-200)] opacity-50`
- **What's wrong:** `--sand-200` (#e7e2d6) is a fixed light beige. In dark mode every skeleton
  loader renders as a pale blob on dark surfaces. Same issue in inline skeletons, e.g.
  `nurse/medications/page.tsx:55–56` (`bg-[var(--sand-100)]`).
- **Should be:** Use a token that flips with theme (e.g. `--bg-sunken` or `--border-1`), or add a
  `.dark` override.

### C3 — `Badge` `neutral` variant is light in dark mode (23+ usages)  — ✅ FIXED (2026-06-03)
- **File:** `components/ui/Badge.tsx:15` — `neutral: 'bg-[var(--sand-100)] text-[var(--fg-2)]'`
- **What's wrong:** `kit.css` defines a `.dark .chip-neut` override (line 220), but the **React
  `<Badge>` uses the raw `bg-[var(--sand-100)]` arbitrary value**, so it never gets that
  override. `neutral` is the most-used variant (23+ call sites incl. every "cancelled"/meta
  chip) → light gray chips on dark surfaces.
- **Should be:** Add a dark-aware token for the neutral chip background (mirror `.dark .chip-neut`:
  `rgba(255,255,255,0.08)`), or have Badge emit the `chip chip-neut` classes that already have
  the override.

### C4 — Hover states flash light in dark mode (all tables + secondary/ghost buttons)  — ✅ FIXED (2026-06-03)
- **Files:**
  - `kit.css:364` — `.tbl tr:hover td { background: var(--sand-50) }` (every `.tbl` table)
  - `kit.css:67,74` — `.btn-secondary:hover` / `.btn-ghost:hover` → `var(--sand-100)`
  - `components/ui/button.tsx:16–17` — `secondary`/`ghost` `hover:bg-[var(--sand-100)]`
- **What's wrong:** All fixed light values; in dark mode every table-row hover and every
  secondary/ghost button hover flashes a light background. The kit's `.dark .btn-ghost:hover`
  patch (kit.css:102) even forces `color: black` on a light bg — a visible hack, and it doesn't
  cover `.btn-secondary` or the React `Button`.
- **Should be:** Hover backgrounds should reference a theme-flipping token (e.g. `--bg-sunken`)
  with a proper `.dark` value.

---

## 🟡 Important (inconsistent or missing key feedback)

> **Update 2026-06-03 (UI Polish Part 1):** I1, I2, I3, I5 are all **✅ FIXED**. See `changelog.md` /
> `current-task.md` (UI Polish Part 1). Remaining open: I4, I6, I7, I8.

### I1 — Same status renders a different color across dashboards ("cancelled")  — ✅ FIXED (2026-06-03)
- **What's wrong:** `pending` is consistently `caution` everywhere ✅, but `cancelled` diverges:
  - `critical` (red): `doctor/record/page.tsx:20`, `receptionist/appointments/page.tsx:28`,
    `patient/appointments/page.tsx:54`, `patient/rooms/page.tsx`, `inventory/purchase-orders`
  - `neutral` (gray): `patient/records/page.tsx:26`, `patient/appointments/page.tsx:70`
    (a *second* map in the same file), `cashier/invoices/[id]/page.tsx:154`
- **Should be:** One shared status→variant map (e.g. `lib/statusBadge.ts`) imported everywhere,
  so a cancelled item looks identical in every role.

### I2 — Two parallel badge systems (chip-* CSS vs `<Badge>` component)  — ✅ FIXED (2026-06-03)
- **What's wrong:** ~45 uses of `chip chip-*` classes (kit.css) and ~47 uses of `<Badge
  variant>` coexist. Pharmacist components use the chip-class system
  (`components/staff/pharmacist/OrderCard.tsx:5`, `RecentOrdersList.tsx:5`,
  `RefillRequestCard.tsx:5` → `'chip chip-caut'`), while everyone else uses `<Badge>`. Same
  output, two mechanisms — and only one (`chip-*`) has the dark-mode overrides (see C3).
- **Should be:** Standardize on `<Badge>` (and fix its dark mode), retire the `chip-*` duplicates
  or make Badge delegate to them.

### I3 — Three competing destructive-button styles  — ✅ FIXED (2026-06-03)
- **What's wrong:**
  - `.btn-danger` soft style — used in **1** file (`components/staff/inventory/InventoryTable.tsx`)
  - `<Button variant="danger">` soft style (`components/ui/button.tsx:18`)
  - inline solid `style={{ background: 'var(--critical)', color: '#fff' }}` — used in **~14**
    files (`admin/announcements:241`, `admin/appointments:95`, `admin/settings:320`,
    `admin/shifts:319`, `admin/users/[id]:458`, `nurse/patients/[id]:493`,
    `components/shared/ConfirmDialog.tsx:52`, several pharmacist modals, etc.)
- **Should be:** Pick one destructive treatment (the solid `--critical` is the de-facto winner)
  and make `.btn-danger` / `<Button variant="danger">` match it, then use the class everywhere.

### I4 — Inconsistent confirmation for destructive actions (3 modal patterns)  — ✅ FIXED (2026-06-04)
- **What's wrong:** A shared `ConfirmDialog` exists and is good (disabled+"Processing…" state,
  danger styling) but is used in only **2** pages (`admin/departments`, `admin/users`). Other
  destructive flows roll **bespoke inline modals** (`admin/announcements`, `admin/shifts`,
  `admin/settings`, `admin/users/[id]`, `patient/billing` cash modal:141, etc.), and some
  delete/cancel handlers may fire with no confirm at all (needs per-file check:
  `inventory/suppliers`, `inventory/items`, `admin/insurance`, `admin/invoices`,
  `receptionist/appointments`).
- **Should be:** Route all confirm-needing actions through `ConfirmDialog`.

### I5 — Reference to a non-existent token (`--warning`) → hardcoded fallback colors  — ✅ FIXED (2026-06-03)
- **Files:** `app/dashboard/settings/page.tsx:29` and `app/dashboard/patient/settings/page.tsx:32`
  - `const colors = ['var(--critical)', 'var(--warning, #f59e0b)', '#84cc16', 'var(--brand)']`
- **What's wrong:** `--warning` **is not defined** in `tokens.css` (the token is `--caution`), so
  it always falls back to the hardcoded `#f59e0b`; `#84cc16` (lime) is fully hardcoded. This is a
  password-strength meter — its colors bypass the token system and won't adapt to dark mode.
- **Should be:** Use `var(--critical)`, `var(--caution)`, `var(--positive)`, `var(--brand)`.

### I6 — Dead / non-functional buttons (confirmed)  — ✅ FIXED (2026-06-04)
- **Files (verified by reading):**
  - `nurse/medications/page.tsx:35–41` — "Print MAR" and "Bulk mark given" (no onClick)
  - `patient/billing/page.tsx:82–89` — "Insurance details" and "Pay outstanding" (no onClick)
  - `nurse/alerts/page.tsx:88–91,128` — Filter / Raise new flag / View (no onClick) [see C1]
- **Heuristic (verify per page):** several admin pages (`compliance`, `reports`, `users/[id]`,
  `appointments`) show buttons with no handler — confirm whether intentional placeholders.
- **Should be:** Wire or remove; if "coming soon," show a `disabled` state (as `patient/billing`
  correctly does for the payment methods).

### I7 — Duplicate settings page  — ✅ FIXED (2026-06-04)
- **Files:** `app/dashboard/settings/page.tsx` and `app/dashboard/patient/settings/page.tsx`
- **What's wrong:** Near-identical (same `colors` array, same structure). Two copies will drift.
- **Should be:** One shared settings component; role pages render it.

### I8 — Tables without horizontal-overflow handling (mobile)  — ✅ FIXED (2026-06-04)
- **What's wrong:** 28 table-bearing files have no `overflow-x` wrapper, so wide tables clip /
  force body scroll on phones. Verified examples (the table component itself has no wrapper):
  `components/staff/receptionist/AppointmentQueueTable.tsx`,
  `components/staff/nurse/NursePatientTable.tsx`,
  `components/staff/pharmacist/PrescriptionQueueTable.tsx` & `DispenseHistoryTable.tsx`,
  `components/doctor/PatientQueueTable.tsx`, and pages
  `admin/audit-log`, `admin/invoices`, `admin/staff-requests`,
  `receptionist/{appointments,lab,orders,radiology}`, `lab/completed`, `radiology/completed`.
  (Exclude `cashier/invoices/[id]` & `cashier/reports` — those `<table>`s are inside generated
  **print HTML**, not responsive UI.)
- **Should be:** Wrap each table in `overflow-x-auto` (the pattern already used in the other
  ~33 files), or switch to a card/stacked layout under `sm`.

---

## 🟢 Minor (polish / nice-to-have)

- **G1 — Two Avatar implementations.** `kit.css .avatar` uses fixed `--forest-100/700`;
  `components/ui/Avatar.tsx:30` uses adaptive `--brand-soft-bg/--brand`. Consolidate on the
  component.
- **G2 — Light chips/boxes in dark mode (minor surfaces):** `TagInput.tsx:50` tag chips
  (`--sand-100`), `patient/billing/page.tsx:117,168` (`--sand-50`/`--sand-100` boxes),
  `.btn-danger:hover → --coral-100` (kit.css:81). Same class as C3/C4 but lower traffic.
- **G3 — AvatarUpload "Remove photo" has no confirmation** (`AvatarUpload.tsx:162`). Low stakes
  (toast on success) but it's a destructive action firing on a single click.
- **G4 — MaintenanceOverlay hardcodes amber hex** (`components/shared/MaintenanceOverlay.tsx`
  #b45309/#d97706/#fbbf24/#92400e). It's a theme-agnostic warning banner so this is largely
  by-design, but it bypasses `--caution*` tokens and won't shift in dark mode.
- **G5 — AuthShell decorative gradients use primitive hex** (`AuthShell.tsx:6–8`). Acceptable
  (decorative login art matching the forest scale); noting for completeness.
- **G6 — ThemeToggle has no `aria-label`** (`ThemeToggle.tsx`), only a `title`. Add an aria-label.
- **G7 — NotificationBell bell-button dark hover hack** (`NotificationBell.tsx:189`):
  `hover:bg-[var(--sand-100)] dark:hover:text-black` — light bg + black text on hover in dark.
  Works but is a patch, same root cause as C4.
- **G8 — Hardcoded ward/context strings:** `nurse/medications/page.tsx:31` ("Cardiology ward"),
  `nurse/alerts` KPIs — cosmetic copy not derived from data.

---

## ✅ Confirmed-good (not issues — documented so they aren't re-flagged)

- **Cashier print/PDF hex** (`cashier/invoices/[id]/page.tsx:31–128`, `cashier/reports/page.tsx:39–43`):
  these `#hex`/inline styles live inside **generated standalone print HTML** (a new-window
  invoice/report document), which is intentionally a fixed light theme. Not app UI — leave as is.
- **`Spinner`, `Toast`, `ModalSheet`, `Input`, `Divider`, `ui/Avatar`, `ConfirmDialog`** all use
  theme tokens correctly and handle their states (Spinner uses `--border-2`/`--brand`; Toast uses
  soft tokens; Input has error/disabled; ConfirmDialog has loading/disabled).
- **State coverage is mostly present via child components.** Many pages flagged "no loading/empty"
  by grep actually delegate to components that handle it (e.g. `patient/billing` → `InvoiceList`
  has `isLoading`; `NotificationBell` has an empty state; `nurse/medications` has skeleton +
  EmptyState). `pharmacist/dispensed` is a `redirect()` (no states needed).

---

## Suggested fix order
1. **C2–C4 + I2** — fix dark mode at the source: add theme-flipping tokens for skeleton bg,
   neutral chip, and hover surfaces; make `<Badge>` dark-aware. One change set clears most
   dark-mode breakage across all roles.
2. **C1 + I6** — wire `nurse/alerts` to real data; wire or remove dead buttons.
3. **I1 + I3 + I4** — centralize the status→variant map, the destructive-button style, and
   confirmation via `ConfirmDialog`.
4. **I5, I7, I8** — fix the `--warning` token misuse, de-dupe the settings page, add table
   overflow wrappers.
