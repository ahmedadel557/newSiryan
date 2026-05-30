# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `newSiryan_backEnd/`:

```bash
npm run dev      # start dev server with nodemon (ts-node, hot reload)
npm run build    # compile TypeScript → dist/
npm run start    # run compiled output (production)
npm run lint     # ESLint on src/
```

No test suite is configured.

## Environment

Copy `.env.example` to `.env`. Required vars:

| Var | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_EXPIRES_IN` | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default `7d`) |
| `FRONTEND_URL` | Used for CORS origin and OAuth redirects |
| `COOKIE_SECURE` | Set `"true"` in production (HTTPS) |
| `COOKIE_SAME_SITE` | `"lax"` for dev, `"none"` for cross-site prod |
| `FROM_EMAIL` | Nodemailer sender address |
| `UPLOAD_PATH` | Local file upload directory |

## Architecture

### Entry Point & Startup

`src/server.ts` bootstraps in order: MongoDB → global Mongoose `toJSON` transform → dev-only seeds → `seedAdmin()` + `seedInventoryManager()` (idempotent, always run) → Redis → cron jobs → `app.listen()`.

The global `toJSON` transform (set on the Mongoose connection in `server.ts`) converts `_id → id` and strips `__v` for all models. Individual models like `User` add their own `toJSON` on top to also strip `password`, `reset_token`, etc.

### Request Lifecycle

```
Request → helmet/cors/morgan → cookieParser → rateLimiter
        → route → [authenticate] → [authorize(...roles)] → [validateRequest(schema)]
        → controller → service → Mongoose
        → sendSuccess / sendError / next(err) → errorHandler
```

- **`authenticate`** (`src/middlewares/auth.ts`) — reads JWT from `access_token` cookie or `Authorization: Bearer` header. Attaches `{ id, role, is_profile_complete }` to `req.user`.
- **`authorize(...roles)`** — checks `req.user.role` against allowed list; returns 403 otherwise.
- **`validateRequest(schema)`** — Zod schema validates `{ body: req.body }`. Returns 422 with the first error message on failure.
- **`sendSuccess(res, data, message?, status?)`** / **`sendError(res, message, status?)`** — all responses go through these helpers (`src/utils/response.ts`). Shape: `{ success: boolean, message: string, data: any }`.

### Layers

```
src/
  routes/        # Express routers — wire URL + middleware chains
  controllers/   # Request handlers — parse req, call service, call sendSuccess/sendError
  services/      # Business logic — Mongoose queries, cross-model operations
  models/        # Mongoose schemas + interfaces
  middlewares/   # authenticate, authorize, validateRequest, rateLimiter, errorHandler
  validations/   # Zod schemas (one file per role/domain)
  utils/         # audit, cookies, mailer, response helpers
  config/        # database, redis, passport (Google OAuth), multer upload
  jobs/          # node-cron scheduled tasks
  seeds/         # idempotent DB seeders
  types/         # Shared TypeScript types
```

### Auth & Cookies

JWTs are stored as HttpOnly cookies (`access_token` = 15 min, `refresh_token` = 7 days). The JWT payload carries `{ id, role, ipc }` where `ipc` = `is_profile_complete`. Middleware maps `ipc → req.user.is_profile_complete`.

Google OAuth (`/api/auth/google` → `/api/auth/google/callback`) uses Passport + `passport-google-oauth20`. On success it sets cookies and redirects to `/auth/callback` with query params. If the Google user hasn't completed their profile (`ipc = false`), only a short-lived access token is issued (no refresh token) until `/auth/complete-profile` is called.

### Models

One Mongoose model per concept. All use `{ timestamps: true }`. Key relationships:

- `Profile` has a 1:1 `user` ObjectId ref — covers both patients and staff (same model, different fields populated).
- `User.post('findOneAndDelete')` cascades Profile deletion automatically.
- `MedicalRecord → Prescription → PrescriptionItem` (separate models, joined by ID).
- `SupplyRequest → Shipment → WarehouseEntry` (inventory fulfillment chain).

### Cron Jobs

Three scheduled jobs in `src/jobs/`:

| Job | Schedule | Purpose |
|---|---|---|
| `inventoryAlert.job` | `0 0 * * *` (daily midnight) | Finds low-stock medications + items, sends one notification per inventory_manager (deduped per day) |
| `appointmentReminder.job` | Scheduled | Sends appointment reminder notifications |
| `profileCleanup.job` | Scheduled | Removes orphaned incomplete profiles |

### Audit Logging

`logAudit(params)` in `src/utils/audit.ts` writes to the `AuditLog` collection. It is fire-and-forget (`.catch(() => {})`) — never blocks the response. Call it from controllers for admin actions.

### File Uploads

Multer config in `src/config/upload.ts`. Uploaded files are served statically at `/api/uploads/` with `Cross-Origin-Resource-Policy: cross-origin` header so the frontend can load them cross-origin.

### Validation

Zod schemas live in `src/validations/`. Each file is named `[domain].validation.ts`. Schemas are wrapped in `{ body: z.object({...}) }` because `validateRequest` passes `{ body: req.body }` to `schema.safeParse()`.

### Seeds

`src/seeds/admin.seed.ts` and `src/seeds/inventoryM.seed.ts` run on every startup (idempotent — check for existing user before creating). Doctor/medication/supplier seeds only run in `NODE_ENV=development`.
