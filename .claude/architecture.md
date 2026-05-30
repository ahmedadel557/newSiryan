# Architecture

## Stack

| Layer | Backend | Frontend |
|---|---|---|
| Runtime | Node.js + TypeScript | Next.js 16 (App Router) |
| Framework | Express.js | React 19 |
| Database | MongoDB (Mongoose) + Redis | — |
| Auth | JWT + Passport (Google OAuth) | jose (JWT decode) |
| Validation | Zod | yup |
| File uploads | Multer → `/api/uploads/` | — |
| Real-time | Socket.io server | Socket.io client |
| Email | Nodemailer | — |
| Styling | — | Tailwind v4 + custom CSS tokens |

## Backend Request Pipeline
```
helmet → cors → morgan → cookieParser → rateLimiter
→ [authenticate] → [authorize(...roles)] → [validateRequest(schema)]
→ controller → service → Mongoose / Redis
→ sendSuccess / sendError → errorHandler
```

## Frontend Data Flow
```
Page → hook (src/hooks/) → service (src/services/*.service.ts) → apiClient (axios)
```
- 401 interceptor: silent token refresh → on failure → redirect to /auth/login
- Services normalize MongoDB `_id` → `id`

## Auth Flow
1. POST `/api/auth/login` → set `access_token` + `refresh_token` cookies
2. FE middleware reads `access_token` cookie → decodes `role`, `ipc`
3. `ipc=false` → redirect to `/auth/complete-profile`
4. `password_changed=false` (staff) → redirect to `/auth/change-password`
5. Role mismatch → 403 / redirect

## Routing (Frontend)
- `/` — landing page
- `/auth/*` — public auth pages
- `/dashboard/[role]/*` — role-isolated dashboards
- Middleware enforces: each role can ONLY access `/dashboard/[role]/`

## Database Design (key relationships)
- `User` 1:1 `Profile` (covers both patients and staff)
- `Appointment` → `User` (patient + doctor)
- `MedicalRecord` → `User` (patient) + `User` (doctor)
- `Invoice` → `Appointment` (billing entry point)
- `Prescription` → `MedicalRecord`
- `LabOrder` / `RadiologyOrder` → `MedicalRecord`

## Deployment Notes
- Backend compiles TypeScript → `dist/` via `npm run build`, runs with `npm run start`
- Frontend: standard Next.js build + start
- Env: `NEXT_PUBLIC_API_URL` (FE) connects to backend base URL
