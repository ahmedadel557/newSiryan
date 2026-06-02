# Current Task

## Task
Two bugfixes (2026-06-02): (1) staff-registration slow response; (2) admin pending-staff badge stale.

## Status
COMPLETE.

## Context / Decisions

### Bug 1 — staff registration "stuck on Submitting…" then resolves slowly
The frontend was correct; backend was the bottleneck. `authService.registerStaff` awaited
`sendEmail` inline (no SMTP timeout configured), so a slow SendGrid round-trip held the HTTP
response and the form's `await apiClient.post(...)` legitimately waited. Misleading symptom — the
user thought the form was stuck, but the success screen rendered correctly once SMTP finished.

Investigated each hypothesis in the prompt and ruled them all out against actual source:
- Frontend `api.client.ts` interceptor is identity on 2xx → can't throw.
- Backend `registerStaff` does NOT call `setAuthCookies` → no cookie-driven redirect.
- `middleware.ts` has `/auth/register` in `publicPaths` → middleware never reads cookie there.

Fix: drop the `await` from the `sendEmail` call (it's already `.catch(()=>{})`-guarded and matches
the surrounding fire-and-forget side-effects). One-line behavioural change + a comment.

### Bug 2 — admin sidebar pending-staff badge stale + stale row
StaffShell predated the TanStack Query migration and had a manual `useState` + one-shot
`useEffect` fetch. Yesterday's migration moved the staff-requests page onto `useAdminStaffRequests`
whose mutations + `staff_request:new` socket listener invalidate the shared cache, but StaffShell
wasn't reading from that cache so it never saw the invalidations.

Fix:
- Added `enabled` option + optimistic `onMutate` (remove from cache, snapshot for rollback,
  `onSettled` invalidates) to `useAdminStaffRequests`.
- Replaced StaffShell's manual fetch with the shared hook gated to admin role.

Deliberately did NOT use the `window.dispatchEvent('staff-request-updated')` bridge from the
prompt — the TanStack Query cache is the exact mechanism for cross-component live state and
already exists.

## Files Changed
- `apps/backend/src/services/auth.service.ts` — removed inline `await` on `sendEmail` in `registerStaff`.
- `apps/frontend/src/hooks/admin/useAdminStaffRequests.ts` — added `enabled` option, optimistic mutations.
- `apps/frontend/src/components/layouts/StaffShell.tsx` — consume shared hook; removed local state + fetch.

## Verification
- Backend `npx tsc --noEmit` → 0 errors.
- Frontend `npx tsc --noEmit` → 0 errors.
- Frontend `npm run lint` → 296 problems (baseline; 0 new).

## Next Steps
- Manual browser test of the staff-registration flow (should feel instant now even if SendGrid
  is slow).
- Manual browser test of approve/reject on `/dashboard/admin/staff-requests` — confirm the row
  disappears immediately AND the sidebar badge ticks down in the same frame, across two open
  tabs (one as approver, one watching the badge).
- Follow-up audit not done: other `await sendEmail(...)` call sites in request handlers;
  setting nodemailer `connectionTimeout`/`socketTimeout`.

---

## Previous Task
Data layer — TanStack Query v5 integration for Admin + Cashier (2026-06-02) — COMPLETE.
