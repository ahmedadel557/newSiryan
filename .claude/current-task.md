# Current Task

## Task
Auth Improvements — Part 2: Frontend forms, Resend migration, UX improvements (2026-06-04). COMPLETE.

## Status
COMPLETE. Next: Auth Part 3 (if planned).

## What was done

### TASK 0 — Resend migration
- Replaced Nodemailer/SendGrid with Resend client in `apps/backend/src/utils/mailer.ts`
- Installed `resend` npm package
- Updated `apps/backend/.env.example`: SENDGRID_API_KEY → RESEND_API_KEY, FROM_EMAIL → noreply@siryan.xyz

### TASK 1 — Egyptian National ID Validator
- Created `apps/frontend/src/lib/validateNationalId.ts` with `validateEgyptianNationalId` and `extractDOBFromNationalId`

### TASK 2 — Auth Validations
- Created `apps/frontend/src/validations/auth.ts` with `otpSchema`, `forgotPasswordEmailSchema`, `resetPasswordSchema`
- Updated `registerTypes.ts`: NID field uses real validator, DOB cross-validates with NID, password requires uppercase+number

### TASK 3 — Auth Service
- Added `sendEmailVerification`, `verifyEmail`, `verifyResetOTP`, `resetPassword` methods

### TASK 4 — Auth Types
- Added `is_email_verified?: boolean` to `User` interface

### TASK 5 — NID Auto-fill DOB
- `MedicalInfoStep`: onNidBlur callback + nationalId prop for counter + dobHint display
- `PatientForm`: handles NID blur → extractDOB → setValue + hint
- `StaffProfessionalStep`: NID char counter

### TASK 6 — Patient register redirect
- Patient registration now redirects to `/auth/verify-email?email=...`

### TASK 7 — Forgot Password 2-step
- Step 1: email input. Step 2: sent confirmation + 60s resend countdown + button to /auth/reset-password

### TASK 8 — Email Verification Banner
- Created `EmailVerificationBanner.tsx` (caution bg, resend button, dismissible per session)
- Added to `PatientShell` when `user.is_email_verified === false`

### TASK 9 — Form UX
- Created `FormError.tsx` component (critical color, XCircle icon)

### TASK 10 — Change Password
- Added 4-level strength meter (critical/caution/positive/brand), show/hide toggles, proper yup validation

### New pages created
- `apps/frontend/src/app/auth/verify-email/page.tsx`
- `apps/frontend/src/app/auth/reset-password/page.tsx`

### Verification
- `npx tsc --noEmit` (backend) → 0 errors
- `npx tsc --noEmit` (frontend) → 0 errors

## What was done

### TASK 1 — OTP Model (`models/OTP.ts`)
New Mongoose model: `email`, `code` (hashed), `type` (email_verification | forgot_password),
`expires_at`, `used`, `attempts`. TTL index on `expires_at` (MongoDB auto-deletes). Compound
index `{ email, type }`. Registered in `models/index.ts`.

### TASK 2 — OTP Service (`services/otp.service.ts`)
- `generateOTP(email, type)` — deletes existing, generates 6-digit code, bcrypt-hashes, stores, returns plain code.
- `verifyOTP(email, type, code, markUsed=true)` — finds active OTP, checks expiry, tracks attempts (max 5),
  bcrypt-compares. `markUsed=false` for the verify-then-reset two-step flow.

### TASK 3 — Email Templates (`utils/mailer.ts`)
Added `sendEmailVerificationOTP(email, code, firstName)` and `sendForgotPasswordOTP(email, code, firstName)`.
Both fire-and-forget, 7s timeout (existing transporter).

### TASK 4 — Profile unique indexes (`models/Profile.ts`)
Partial unique indexes on `phone` and `national_id` using `partialFilterExpression: { $gt: '' }` —
only non-empty strings are indexed, so the `''` default doesn't conflict.

### TASK 5 — Validation schemas (`validations/auth.validation.ts`)
- `validateEgyptianNationalId()` helper (century digit, month, day, governorate code 01-29+88).
- Updated `registerSchema` — national_id/phone/date_of_birth validated when provided.
- Updated `registerStaffSchema` — national_id uses full validator.
- New schemas: `verifyEmailSchema`, `forgotPasswordOTPSchema`, `verifyForgotPasswordOTPSchema`, `resetPasswordSchema`.

### TASK 6 + TASK 8 + TASK 9 + TASK 12 — Auth Controller (`controllers/auth/index.ts`)
- `sendEmailVerification` — authenticated, generates OTP + fire-and-forget email.
- `verifyEmail` — verifies OTP, marks `is_email_verified: true` on user.
- `forgotPassword` — replaced token-based with OTP flow (always returns same message).
- `verifyForgotPasswordOTP` — verifies OTP but does NOT mark used (markUsed=false).
- `resetPassword` — verifies + marks used, hashes and saves new password, clears reset_token fields.
- `register` — now fires OTP generation + email after patient creation (fire-and-forget).
- `getMe` — automatically includes `is_email_verified` (it's on the User model now).

### TASK 7 — User Model (`models/User.ts`)
Added `is_email_verified: { type: Boolean, default: false }`.
`config/passport.ts` — Google OAuth new users get `is_email_verified: true`; existing Google users
get updated on login if not already verified.

### JWT changes (`middlewares/auth.ts`, `services/auth.service.ts`, `routes/auth.routes.ts`)
- `makeTokens` now accepts + embeds `ive` (is_email_verified) claim.
- `authenticate` middleware decodes `ive` → `req.user.is_email_verified` (defaults `true` for old tokens).
- All token-issuing call sites updated: registerPatient (ive=false), login (ive=user.is_email_verified),
  changePassword, refreshAccessToken, Google callback (ive=true), complete-profile (ive=true).

### TASK 10 — `requireEmailVerified` middleware (`middlewares/requireEmailVerified.ts`)
Returns `403 { code: 'EMAIL_NOT_VERIFIED' }` if `req.user.is_email_verified` is falsy.
Applied to patient routes: `POST /appointments`, `POST /pharmacy/order`, `POST /rooms/book`, `POST /chatbot`.

### TASK 11 — New routes (`routes/auth.routes.ts`)
```
POST /auth/send-verification   → authenticate, sendEmailVerification
POST /auth/verify-email        → validateRequest(verifyEmailSchema), verifyEmail
POST /auth/forgot-password     → (unchanged route, OTP-based handler replaces token handler)
POST /auth/verify-reset-otp    → validateRequest(verifyForgotPasswordOTPSchema), verifyForgotPasswordOTP
POST /auth/reset-password      → validateRequest(resetPasswordSchema), resetPassword
```

## Verification
- `npx tsc --noEmit` (backend) → **0 errors**
- `npm run audit:routes` → **0 FE calls with no BE route**; 4 new routes in backend-only list (expected until Part 2)

---

## Previous Task
UI Polish — Part 2: I4/I6/I7/I8 (2026-06-03). COMPLETE.
(see below for details)

## What was done

- **I4 — ConfirmDialog rollout.** Replaced all bespoke inline confirm modals with the shared
  `ConfirmDialog` component: `admin/announcements`, `admin/shifts`, `admin/insurance`,
  `inventory/suppliers`, `inventory/items`, `receptionist/appointments` (new cancel confirm added),
  `admin/users/[id]`, `admin/compliance`, `inventory/rooms/[id]` (remove item + delete room).
- **I6 — Dead buttons.** Added `disabled` + `title="Coming soon"` to: "Print MAR" and
  "Bulk mark given" (`nurse/medications`); "Insurance details" and "Pay outstanding"
  (`patient/billing`).
- **I7 — Settings deduplication.** Extracted 5 shared section components
  (`SecuritySection`, `NotificationsSection`, `AppearanceSection`, `StaffProfileSection`,
  `PatientProfileSection`) and a `SettingsShell` layout component. Both settings pages
  (`dashboard/settings` and `patient/settings`) replaced with thin wrappers.
- **I8 — Table overflow wrappers.** Added `<div className="overflow-x-auto">` wrappers to all
  tables without one: `AppointmentQueueTable`, `NursePatientTable`, `PrescriptionQueueTable`,
  `DispenseHistoryTable`, `PatientQueueTable`, `admin/audit-log`, `admin/invoices`,
  `admin/audit`, `receptionist/appointments`, `receptionist/lab`, `receptionist/orders` (both),
  `receptionist/radiology`, `lab/completed`, `radiology/completed`, `inventory/rooms/[id]`.

## Verification
- `npx tsc --noEmit` (frontend) → 0 errors.
