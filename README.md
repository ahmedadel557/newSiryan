# Siryan — Hospital Management System

A full-stack, role-based hospital management platform built with **Next.js 16** and **Express + TypeScript**. Siryan covers the complete operational lifecycle of a hospital — from patient registration and appointment booking through pharmacy, inventory, billing, and administration.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4, Socket.IO client |
| Backend | Express.js, TypeScript, Mongoose (MongoDB), Socket.IO, Redis |
| Auth | JWT (HttpOnly cookies), Google OAuth 2.0 (Passport.js) |
| Email | SendGrid |
| Validation | Zod (backend) · Yup (frontend) |
| Monorepo | Turborepo + npm workspaces |

---

## Roles

The system has ten distinct roles, each with a fully isolated dashboard:

| Role | Account Created By | Key Capabilities |
|---|---|---|
| **Patient** | Self-registration | Book appointments, pharmacy orders, room bookings, chatbot |
| **Doctor** | Admin | View assigned patients, write diagnoses, prescriptions, lab/radiology orders |
| **Nurse** | Admin | Record vitals, log medication administration, send emergency flags |
| **Receptionist** | Admin | Check-in patients, approve doctor cancellation/reschedule requests |
| **Pharmacist** | Admin | Dispense OTC & prescription medications, send supply requests |
| **Inventory Manager** | Admin (seeded) | Full inventory control, supplier management, automated low-stock alerts |
| **Lab Technician** | Admin | Receive lab orders, upload results |
| **Radiology Technician** | Admin | Receive radiology orders, upload scan images |
| **Cashier** | Admin | Process payments, issue invoices, handle insurance |
| **Admin** | Seeded on startup | Full system access, staff management, reports, audit logs |

**Registration flow:** Patients self-register and are immediately active. Staff accounts are created by Admin → system emails a temporary password → staff logs in and must change it before accessing their dashboard.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)
- Redis (local or cloud)

### 1. Clone & install

```bash
git clone <repo-url>
cd siryan
npm install        # installs all workspaces via npm workspaces
```

### 2. Configure environment

```bash
# Copy the reference and fill in your values
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env.local
```

Minimum required values in `apps/backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/siryan
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-64-byte-hex>
JWT_REFRESH_SECRET=<random-64-byte-hex>
SENDGRID_API_KEY=<your-key>
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

Minimum required in `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Run in development

```bash
npm run dev        # starts both apps via Turborepo
```

| App | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |

On first startup the backend seeds a default **admin** account and **inventory manager** account using the `ADMIN_*` and `INVENTORY_MANAGER_*` env vars.

---

## Project Structure

```
siryan/
├── apps/
│   ├── backend/          # @siryan/backend — Express API
│   │   └── src/
│   │       ├── routes/         # Express routers
│   │       ├── controllers/    # Request handlers
│   │       ├── services/       # Business logic
│   │       ├── models/         # Mongoose schemas
│   │       ├── middlewares/    # auth, authorize, validate, rate-limit
│   │       ├── validations/    # Zod schemas
│   │       ├── config/         # DB, Redis, Passport, multer
│   │       ├── jobs/           # node-cron scheduled tasks
│   │       ├── seeds/          # idempotent DB seeders
│   │       └── utils/          # audit, cookies, mailer, response helpers
│   └── frontend/         # @siryan/frontend — Next.js App Router
│       └── src/
│           ├── app/            # Pages & layouts (App Router)
│           ├── components/     # UI primitives + role-specific components
│           ├── hooks/          # Data-fetching hooks
│           ├── services/       # Axios service layer (one file per domain)
│           ├── styles/         # tokens.css (design tokens) + kit.css (utilities)
│           ├── types/          # All TypeScript types in one file
│           └── middleware.ts   # JWT cookie check + role-based routing
├── .env.example          # All env vars documented with comments
├── turbo.json
└── package.json
```

---

## Architecture Highlights

### Auth & Session

- Backend issues **HttpOnly JWT cookies** (`access_token` 15 min, `refresh_token` 7 days).
- Next.js **Edge middleware** decodes the cookie on every request and enforces role isolation — each role can only reach its own `/dashboard/[role]/*` subtree.
- The axios client intercepts 401 responses, silently calls `/api/auth/refresh`, and retries once before redirecting to login.
- Google OAuth is fully handled on the backend and redirects to the frontend with cookies already set.

### Real-Time Notifications

Socket.IO runs on the backend (`/api/auth/google/callback` → port 5000) with a Redis adapter for horizontal scaling. The frontend connects in `StaffShell` and `PatientShell` components on dashboard mount.

### Scheduled Jobs

| Job | Schedule | Purpose |
|---|---|---|
| Inventory alert | Daily midnight | Low-stock alerts to inventory manager (deduped per day) |
| Appointment reminder | Before appointment | Reminder notifications to patient and doctor |
| Profile cleanup | Periodic | Removes orphaned incomplete profiles |

### Audit Log

All admin actions are recorded via `logAudit()` in a fire-and-forget manner — it never blocks a response. Logs are viewable at `GET /api/admin/audit-log`.

---

## Available Scripts

From the repo root:

```bash
npm run dev      # run both apps with hot reload
npm run build    # production build (backend tsc + frontend next build)
npm run lint     # lint both apps
```

From an individual app directory:

```bash
npm run dev      # start only this app
npm run build
npm run start    # run production build (backend only)
```
