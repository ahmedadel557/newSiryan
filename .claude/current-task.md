# Current Task

## Task
Data layer — TanStack Query v5 integration for Admin + Cashier modules (2026-06-02)

## Status
COMPLETE.

## Context / Decision
Hand-rolled `useState` + `useEffect` + `reload()` patterns in Admin and Cashier caused (a) duplicate
fetches across pages, (b) stale data after mutations, (c) inconsistent socket-driven refresh, and
(d) bulky hooks like `useAdmin` that mixed data, mutations, and modal/filter UI state. Migrated
both modules to TanStack Query v5; UI state (modals, filters, search, tab) moved into pages.
Doctor / patient / nurse / pharmacist / lab / radiology / receptionist hooks were intentionally
**not** touched in this pass.

## Completed This Session
- Installed `@tanstack/react-query@^5` + `@tanstack/react-query-devtools`.
- Plumbing: `src/lib/queryClient.ts`, `src/lib/queryKeys.ts`, `src/providers/QueryProvider.tsx`;
  wrapped `app/layout.tsx` outermost.
- Admin hooks (`src/hooks/admin/*`): `useAdminUsers` (createUser/updateRole/toggleActive/
  deleteUser/updateProfile), `useAdminStaffRequests` (socket `staff_request:new` → invalidate),
  `useAdminAppointments`, `useAdminInvoices` (sockets `invoice:new` + `payment:received`),
  `useAdminReports` (revenue/ratings/occupancy/pharmacy/doctors, occupancy + pharmacy
  conditionally enabled), `useAdminDashboardStats` (stats + low-stock, socket `payment:received`
  → toast + invalidate), `useAdminAuditLog`.
- Cashier hooks (`src/hooks/cashier/*`): `useCashierInvoices`, `useCashierInvoice(id)`,
  `useCashierPending` (sockets `pharmacy:order:*`, `payment:pending` → invalidate),
  `useCashierReport(date)`, `useCashierDashboard`.
- Migrated 8 admin pages (overview, users, staff-requests, appointments, invoices, reports,
  audit, audit-log) and 5 cashier pages (dashboard, invoices list, invoice detail, pending,
  reports). Modal/filter/tab state lives in each page.
- Refactored self-fetching components: `OccupancySection` → `useAdminOccupancyReport`,
  `RevenueChart` → `useAdminRevenueReport({from: 7daysAgo})` (socket invalidation moved into hook).
- `UsersTable.tsx` re-pointed `UserRoleFilter` import to `@/hooks/admin`.
- Deleted: `useAdmin.ts`, `useCashierInvoices.ts`, `useCashierInvoice.ts`, `useCashierPending.ts`,
  `useCashierReport.ts`, `useCashierDashboard.ts`.
- `npx tsc --noEmit` → 0 errors. `npm run lint` → 296 problems (was 297; no new errors).

## Key implementation notes
- `mutation.mutate(args)` / `mutation.mutateAsync(args)`; pages read `mutation.isPending`.
- Socket callbacks use the **singleton** `queryClient` from `@/lib/queryClient` (not `useQueryClient()`,
  which can't run inside a callback); React-render code uses `useQueryClient()`.
- Default query options: `staleTime: 30s`, `gcTime: 5min`, no retry on 401/403/404,
  no refetch-on-focus, mutation retry off.
- Adapted to real service method names (`updateUserRole`, `updateUserActive(id, boolean)`,
  `approveStaff`, `rejectStaff`, `getAdminInvoices`, `getDoctorReport`) rather than the spec's names.

## Next Steps
- **Browser smoke test** the migrated pages (see `todos.md`): admin overview/users/staff-requests/
  appointments/invoices/reports + audit, cashier dashboard/invoices/detail/pending/reports.
  Confirm socket-driven refreshes (`payment:received`, `staff_request:new`, `invoice:new`,
  `pharmacy:order:created`, `pharmacy:order:status`, `payment:pending`).
- Consider extending the same pattern to the remaining modules (doctor/patient/nurse/pharmacist/
  lab/radiology/reception) once Admin + Cashier are validated in the browser.

---

## Previous Task
Doctor System — Part 3 (Frontend): Video Call + In-Call Chat (2026-06-02) — COMPLETE.
