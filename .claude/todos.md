# TODOs

## High Priority
- [ ] Browser smoke-test MyScheduleWidget: (1) staff with schedule configured see weekly strip + today banner; (2) staff with no schedule see "No schedule configured yet" state; (3) changing schedule via admin → `schedule:updated` socket fires → toast shown + widget refreshes.
- [ ] Test full doctor flow locally with real Stream credentials (set backend `STREAM_API_KEY`/`STREAM_API_SECRET` + frontend `NEXT_PUBLIC_STREAM_API_KEY`; verify video call + in-call chat doctor↔patient). In-call chat also needs the **Chat product enabled** on the Stream app.
- [ ] Browser smoke-test the full TanStack Query migration (all 10 roles now migrated). Key things to verify: (1) Admin/cashier pages; (2) nurse alerts, receptionist queue, pharmacist orders, lab/radiology; (3) socket-driven cache invalidations across roles; (4) notifications bell updates in real time via socket + refetchInterval.
- [ ] Consider adding React Query Devtools for staging only — exclude from production build using `process.env.NODE_ENV !== 'production'` guard in `QueryProvider.tsx`. (The devtools package `@tanstack/react-query-devtools` is already installed.)
- [ ] Browser-verify [BUG-AUTH-1] fix: submit a staff registration with SendGrid temporarily slowed or the API key wrong — success screen should render in ≤1s now that `sendEmail` is fire-and-forget. The receipt email may not arrive in that scenario, which is expected; the user is told "Awaiting admin approval" via the response.
- [ ] Browser-verify [BUG-ADMIN-2] fix: open two tabs as admin. In tab A, approve or reject a pending request. In tab B, the sidebar badge + the staff-requests row should both update without a manual refresh (one via mutation invalidation, one via the `staff_request:new` socket).

~~Verify lucide-react... uninstall (project uses react-icons)~~ — CORRECTION: the project standard **is** `lucide-react` (used in navItems + all components). `react-icons` is NOT used. Ignore the old rule.

## Technical Debt
- [x] ~~Set `connectionTimeout`/`socketTimeout` on the nodemailer transport~~ — DONE 2026-06-03 (7000ms connection/greeting/socket timeouts in `mailer.ts`); also made `createStaff` + `approveStaff` `sendEmail` fire-and-forget. ([BUG-MAIL-AWAIT])
- [ ] Audit remaining `await sendEmail(...)` / `await sendTemplatedEmail(...)` call sites beyond register/createStaff/approveStaff (forgot-password, deletion flows). Mailer timeout now bounds them to ≤7s, but dropping inline `await` is still preferable for non-critical mail.
- [ ] (sweep) Make `notifyRoles` in `doctor/index.ts` emit sockets like `notifyReceptionists`, so pharmacist/lab/radiology get real-time pushes (not just 30s poll). ([BUG-RT-NOTIFYROLES])
- [ ] (sweep) Add `emitToUser(patientId, 'notification:new', …)` to `createPrescription` for parity with lab/radiology order creation. ([BUG-RT-PRESC-PATIENT])
- [ ] (sweep) `getStaffRequests` returns the bcrypt `password` hash — add `.select('-password')`. ([BUG-SEC-STAFFREQ])
- [ ] (sweep) Audit the repeated `?? ref.toString()` populated-ref pattern in receptionist `confirmAppointment`/`cancelAppointment`/etc. — same null-orphan crash class fixed in `getAllAppointments`. ([BUG-RECEP-APPTS-NULL])
- [ ] No test suite exists on either BE or FE — consider adding at minimum integration tests for auth and critical API routes
- [ ] Backend uses `ts-node` in dev and compiles to `dist/` — confirm `tsconfig.json` is optimized for production build

## Optimizations
- [ ] Redis caching strategy not fully documented — audit what is and isn't cached
- [x] Socket.io event catalog not documented — now catalogued in `.claude/memory.md`

## Future Features
- [x] Cashier Flow — all parts complete (Parts 1–3, frontend + backend)
- [x] Admin Flow — all parts complete (Parts 1–4, real-time, edge cases, appointments, staff profile edit, invoice create)

---

## Route-Diff Gaps (from audit:routes 2026-06-02 — most resolved by B1–B8; re-verified live 2026-06-03)
- [ ] [HIGH] cashier.service.ts calls `GET /cashier/stats/daily` but BE only has `GET /cashier/reports/daily` — either add a lightweight stats endpoint or fix the FE call to use the reports endpoint
- [x] ~~Nurse vitals GET~~ — `GET /nurse/patients/:id/vitals` (B5) exists; verified 200 in sweep
- [x] ~~Receptionist create appointment/patient~~ — `POST /receptionist/appointments` (B7) + `/patients` (B8) exist; verified 201 in sweep
- [x] ~~Patient room booking cancel~~ — `DELETE /patient/rooms/bookings/:id` exists (route present); patient room book verified 201 in sweep
- [x] ~~Individual lab/radiology order GET~~ — `GET /lab/orders/:id` (B1) + `/radiology/orders/:id` (B2) exist; verified 200 in sweep
- [x] ~~Pharmacy prescription verify/reject~~ — `POST /pharmacy/prescriptions/:id/verify` (B3) + `/reject` (B4) exist; verified 200 in sweep
- Note: `npm run audit:routes` on 2026-06-03 → **0 unmatched FE calls**, 249 matched.

## Post-Launch (do after all features complete + stable)
- [ ] [HIGH] Shared Contract — create `packages/contracts` with zod schemas for all API responses, imported by both backend (validates sendSuccess shape) and frontend (z.infer replaces manual types). Eliminates API contract drift at compile time. Pattern: @asteasolutions/zod-to-openapi or manual zod schemas per endpoint.
- [ ] [HIGH] E2E Test Suite — supertest harness hitting every route against seeded DB, asserting request + response shape. Needs: stable seed data, jest config for backend, running app. Do after shared contract so tests assert against the contract schemas.
- [ ] [MEDIUM] Convert audit:routes script to CI GitHub Actions check — runs on every push, blocks merge if new FE service call has no matching BE route.

---
Format: `[PRIORITY]` high | medium | low | debt
