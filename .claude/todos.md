# TODOs

## High Priority
- [ ] Test full doctor flow locally with real Stream credentials (set backend `STREAM_API_KEY`/`STREAM_API_SECRET` + frontend `NEXT_PUBLIC_STREAM_API_KEY`; verify video call + in-call chat doctor↔patient). In-call chat also needs the **Chat product enabled** on the Stream app.
- [ ] Browser smoke-test the TanStack Query migration (Admin + Cashier). Pages to verify: admin overview/users/staff-requests/appointments/invoices/reports/audit/audit-log; cashier dashboard/invoices list/invoice detail/pending/reports. Confirm socket-driven cache invalidations fire (`payment:received`, `staff_request:new`, `invoice:new`, `pharmacy:order:created`, `pharmacy:order:status`, `payment:pending`) and that mutations update the list/detail without a manual refresh.
- [ ] Decide whether to extend TanStack Query to the remaining modules (doctor / patient / nurse / pharmacist / lab / radiology / receptionist) once Admin + Cashier are validated in the browser.
- [ ] Browser-verify [BUG-AUTH-1] fix: submit a staff registration with SendGrid temporarily slowed or the API key wrong — success screen should render in ≤1s now that `sendEmail` is fire-and-forget. The receipt email may not arrive in that scenario, which is expected; the user is told "Awaiting admin approval" via the response.
- [ ] Browser-verify [BUG-ADMIN-2] fix: open two tabs as admin. In tab A, approve or reject a pending request. In tab B, the sidebar badge + the staff-requests row should both update without a manual refresh (one via mutation invalidation, one via the `staff_request:new` socket).

~~Verify lucide-react... uninstall (project uses react-icons)~~ — CORRECTION: the project standard **is** `lucide-react` (used in navItems + all components). `react-icons` is NOT used. Ignore the old rule.

## Technical Debt
- [ ] Audit other request-handler call sites that `await sendEmail(...)` or `await sendTemplatedEmail(...)` — same pattern as [BUG-AUTH-1] could hold any HTTP response while SMTP settles.
- [ ] Set `connectionTimeout` + `socketTimeout` on the nodemailer transport in `apps/backend/src/utils/mailer.ts` so a misconfigured `SENDGRID_API_KEY` fails fast (currently uses OS defaults).
- [ ] No test suite exists on either BE or FE — consider adding at minimum integration tests for auth and critical API routes
- [ ] Backend uses `ts-node` in dev and compiles to `dist/` — confirm `tsconfig.json` is optimized for production build

## Optimizations
- [ ] Redis caching strategy not fully documented — audit what is and isn't cached
- [x] Socket.io event catalog not documented — now catalogued in `.claude/memory.md`

## Future Features
- [x] Cashier Flow — all parts complete (Parts 1–3, frontend + backend)
- [x] Admin Flow — all parts complete (Parts 1–4, real-time, edge cases, appointments, staff profile edit, invoice create)

---
Format: `[PRIORITY]` high | medium | low | debt
