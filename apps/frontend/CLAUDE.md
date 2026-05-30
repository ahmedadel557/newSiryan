# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `newSiryan_frontEnd/`:

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # ESLint (Next.js + TypeScript rules)
```

There is no test suite configured. No `npm test` command exists.

## Environment

Requires `NEXT_PUBLIC_API_URL` set in `.env.local` pointing to the backend base URL (e.g. `http://localhost:5000/api`). The API client (`src/services/api.client.ts`) reads this at runtime.

## Architecture

### Routing & Auth

Next.js App Router. All protected routes live under `/dashboard/[role]/`. The middleware (`src/middleware.ts`) reads the `access_token` JWT cookie and enforces strict role isolation — each role can only access its own `/dashboard/[role]/*` subtree. Two JWT claims matter:

- `role` — determines which dashboard segment the user is redirected to
- `ipc` (is profile complete) — if false, user is redirected to `/auth/complete-profile`

Staff who log in for the first time are flagged via `password_changed: false` and redirected to `/auth/change-password`.

### Data Flow

```
Page → custom hook (src/hooks/) → service (src/services/) → apiClient (axios)
```

- **Services** (`src/services/*.service.ts`) — one per role/domain, call `apiClient`, normalize `_id → id` from backend responses via a local `normalize()` helper.
- **Hooks** (`src/hooks/use*.ts`) — wrap service calls with `useState`/`useEffect`, expose loading/error/data to pages.
- **Pages** — thin orchestration; pull from hooks, pass data to feature components.

API responses are typed as `ApiResponse<T>` or `PaginatedResponse<T>` (see `src/types/index.ts`).

The axios client (`src/services/api.client.ts`) has a 401 interceptor that attempts a silent token refresh then retries; on second failure it redirects to `/auth/login`.

### Component Organization

```
src/components/
  ui/              # shared primitives (Button, Card, Input, Modal, Toast, etc.)
  doctor/          # doctor-specific feature components
  staff/
    nurse/
    pharmacist/
    receptionist/
    lab/
    radiology/
  shared/          # cross-role shared components (DashboardShell, Sidebar, etc.)
```

Each role's dashboard layout (`src/app/dashboard/[role]/layout.tsx`) wraps pages in a sidebar + shell pulled from `src/config/navItems.tsx` via `roleNavMap`.

### Types

All domain types live in one file: `src/types/index.ts`. This includes entities (`User`, `Profile`, `Appointment`, `MedicalRecord`, etc.) and DTOs (`LoginDto`, `BookAppointmentDto`, etc.). Import from `@/types`.

### Design System

Custom CSS design system — **not** Tailwind component classes:

- `src/styles/tokens.css` — all CSS custom properties (colors, type scale, spacing, radius, shadows, motion). Brand color: `--brand: var(--forest-600)` (#235347 forest green). Semantic aliases: `--bg-page`, `--fg-1`, `--border-1`, `--positive`, `--caution`, `--critical`, `--info`.
- `src/styles/kit.css` — utility component classes (`.btn`, `.btn-primary`, `.card`, `.badge`, `.input`, layout shells, etc.).
- `src/styles/tokens.css` also defines semantic text classes: `.t-h1` through `.t-eyebrow`, `.t-mono`, `.t-numeric`.
- Dark mode: `.dark` class on `<html>` (managed by `next-themes`). All semantic tokens flip in `.dark {}` in `tokens.css`.

Tailwind v4 is used for layout utilities (flex, grid, spacing, etc.). Do **not** use shadcn v4 CSS variable imports — those were removed in favor of the custom token system. Validation uses **yup**, not zod.

### Roles

Ten roles with separate dashboards: `patient`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `inventory_manager`, `lab_technician`, `radiology_technician`, `cashier`, `admin`. The `Role` type and all routing maps live in `src/types/index.ts` and `src/middleware.ts`.
