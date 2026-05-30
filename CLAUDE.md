# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Commands

Run from the repo root (Turborepo orchestrates both apps):

```bash
npm run dev      # start backend + frontend in parallel (hot reload)
npm run build    # build both apps (backend tsc → dist/, frontend next build)
npm run lint     # lint both apps
```

Run a single app:

```bash
npm run dev --filter=@siryan/backend
npm run dev --filter=@siryan/frontend
```

Each app also has its own scripts runnable from its directory — see [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md) and [apps/frontend/CLAUDE.md](apps/frontend/CLAUDE.md) for per-app details.

No test suite is configured in either app.

## Environment Setup

Copy `.env.example` (repo root) for reference. Each app needs its own file:

- `apps/backend/.env` — server vars (Mongo, Redis, JWT, SendGrid, Google OAuth, etc.)
- `apps/frontend/.env.local` — only `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`

The backend seeds an `admin` user and an `inventory_manager` user on every startup using `ADMIN_*` and `INVENTORY_MANAGER_*` env vars. These seeds are idempotent.

## Architecture

### Apps

| App | Package | Stack | Port |
|---|---|---|---|
| `apps/backend` | `@siryan/backend` | Express + TypeScript + Mongoose + Socket.IO | 5000 |
| `apps/frontend` | `@siryan/frontend` | Next.js 16 App Router + TypeScript + Tailwind v4 | 3000 |

### Auth Flow Across Both Apps

Auth is cookie-based. The backend issues HttpOnly cookies (`access_token` 15 min, `refresh_token` 7 days). The frontend Next.js middleware (`apps/frontend/src/middleware.ts`) reads the `access_token` cookie on every request, decodes it with `jose`, and enforces routing:

```
JWT claim: role  → /dashboard/[role]/
JWT claim: ipc=false → /auth/complete-profile
User flag: password_changed=false → /auth/change-password  (staff first login)
```

The frontend axios client (`src/services/api.client.ts`) has a 401 interceptor that silently calls `/api/auth/refresh` and retries once before redirecting to `/auth/login`.

Google OAuth (`/api/auth/google` → `/api/auth/google/callback`) lives entirely on the backend; on success it sets cookies and redirects to `FRONTEND_URL/auth/callback`.

### Real-Time (Socket.IO)

The backend creates a single Socket.IO server in `apps/backend/src/config/socket.ts`, authenticated via JWT. It uses `@socket.io/redis-adapter` for horizontal scaling. The frontend connects via `NEXT_PUBLIC_SOCKET_URL` in `StaffShell`, `PatientShell`, and `AvatarUpload` components.

### Ten Roles

`patient`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `inventory_manager`, `lab_technician`, `radiology_technician`, `cashier`, `admin`. Every role has a completely isolated dashboard subtree on the frontend (`/dashboard/[role]/`) and backend routes gated by `authorize(...roles)` middleware. Adding a new role requires changes in both `src/types/index.ts` (frontend) and `src/middlewares/auth.ts` + relevant routes (backend).

### Response Contract

All backend responses use `sendSuccess` / `sendError` helpers and share the shape:

```ts
{ success: boolean, message: string, data: any }
```

Frontend services type responses as `ApiResponse<T>` or `PaginatedResponse<T>` and normalize `_id → id` locally.

### Frontend Design System

Tailwind v4 is for layout utilities only (flex, grid, spacing). Visual styles come from a custom CSS token layer:

- `src/styles/tokens.css` — CSS custom properties (brand color `--forest-600` = #235347, semantic aliases, dark-mode flips)
- `src/styles/kit.css` — utility classes (`.btn`, `.card`, `.badge`, `.input`, etc.)

Do **not** use shadcn's CSS variable imports (`@layer base` with `--background`, `--foreground`, etc.) — those were removed in favour of the custom token system. Use `yup` for frontend validation; `zod` is used only on the backend.
