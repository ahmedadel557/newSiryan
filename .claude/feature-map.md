# Feature Map

## Patient
 ├── appointments (book, view, cancel, reschedule, pay, online)  [booking flow ✓ Part 2 — depts from BE, dept-filtered doctors, extracted components]
 ├── medical records (view own records, shared records)
 ├── pharmacy (view prescriptions, pharmacy orders)
 ├── billing (view invoices, payments)
 ├── rooms (book, view)
 ├── lab results (view)
 ├── requests (staff assistance requests)
 ├── AI assistant (chatbot)  [tool catalog at docs/ai-chatbot-tools.md — 29 tools documented 2026-06-15]
 └── settings (profile, notifications)

## Doctor
 ├── patients (view assigned patients, patient detail)
 ├── medical records (create, update, view)
 ├── prescriptions (create, manage)
 ├── lab orders (order, view results)
 ├── radiology orders (order, view results)
 ├── schedule (read-only weekly view — admin-assigned shifts + appointment overlay)   [fully dynamic ✓ 2026-06-07]
 ├── shared records (receive shared patient records)
 ├── record (create new medical record)
 ├── queue (today's appointment queue)                              [backend ✓ P1 · frontend ✓ P2 /doctor/queue]
 ├── notes (private per-patient notes)                              [backend ✓ P1 · frontend ✓ P2 NoteEditor in Notes tab]
 ├── ratings (my ratings page)                                     [backend pre-existing · frontend ✓ P2 /doctor/ratings]
 ├── notifications (doctor notifications page)                      [frontend ✓ P2 /doctor/notifications]
 ├── complete visit (POST /api/doctor/appointments/:id/complete)     [backend ✓ 2026-06-08 · frontend ✓ 2026-06-08]
 ├── patient record page redesign (PatientHeader + VisitSidebarCard, 70/30 layout, status badges) [✓ 2026-06-08]
 ├── video calls (Stream Video, custom UI, online appts)            [backend ✓ P1 · frontend ✓ P3]
 │     doctor /dashboard/doctor/video/[id] + patient /dashboard/patient/video/[id];
 │     mic/camera toggle, PiP local tile, end-for-both (doctor) / leave (patient)
 ├── in-call chat (Stream Chat, custom UI, in-call only)            [frontend ✓ P3 — needs Chat enabled on Stream app]
 └── real-time alerts (patient:checked_in, emergency:flag, lab/radiology results banners,
       video:call:started / video:call:ended)

## Nurse
 ├── patients (view assigned patients, detail)
 ├── medications (administer, track)
 ├── vital signs (record, monitor)
 └── alerts (critical patient alerts)

## Receptionist
 ├── appointments (manage all appointments — confirm, cancel, reschedule)
 ├── check-in (patient arrival check-in — walk-in + existing appointment)
 ├── patients (search, register walk-in)
 ├── lab orders (coordinate)
 ├── radiology orders (coordinate)
 ├── requests (doctor-initiated cancel/reschedule requests — real-time via socket)
 ├── orders (general order management)
 └── real-time alerts (doctor:request:new, appointment:conflict banners on dashboard)

## Pharmacist
 ├── prescriptions (view, dispense)
 ├── pharmacy orders (fulfill)
 └── dispensed (history)

## Inventory Manager
 ├── items (manage inventory items, stock levels)
 ├── supply requests (approve/reject)
 ├── warehouse (entries, shipments)
 └── rooms (manage room inventory)

## Lab Technician
 ├── orders (view pending lab orders)
 ├── completed (mark complete, upload results)
 └── schedule (lab schedule)

## Radiology Technician
 ├── orders (view pending radiology orders)
 ├── completed (mark complete, upload results)
 └── schedule (radiology schedule)

## Cashier  [Backend ✓ | Frontend ✓ | Parts 1–3 complete]
 ├── pending (cross-patient dashboard — checked-in appointments, approved pharmacy, active rooms)
 ├── invoices (list with filters, create manual invoice, view by id, cancel with stock reversal)
 ├── payments (full pay, partial pay — incremental with auto-promote)
 ├── reports (daily report — this cashier only, by method + category + transaction list, PDF export)
 ├── patient history (all invoices per patient with remaining balance)
 └── real-time alerts (payment:pending banner on dashboard, useCashierPending auto-refresh)

## Admin  [Backend ✓ | Frontend ✓ | Parts 1–4 complete]
 ├── users (manage all users, roles, status; edit staff profiles; cannot modify own account)
 ├── staff-requests (approve/reject; real-time staff_request:new socket alert + toast)
 ├── appointments (system-wide oversight — filter by status/date/search; emergency cancel with reason + patient+doctor notification)
 ├── insurance (CRUD; cascade delete clears patient profiles + notifies affected patients)
 ├── departments (CRUD)
 ├── invoices (view all + create manual invoice with patient selector + line items)
 ├── reports (revenue chart live-updated on payment:received; ratings, doctors, occupancy, pharmacy)
 ├── audit log (system-wide audit trail)
 └── temp-password flow (admin-created accounts get password_changed=false; JWT pwc claim forces change-password page on first login)

## Cross-Role
 ├── notifications (real-time, Socket.io)
 ├── settings (profile, password, preferences)
 └── auth (login, register, OAuth, password reset, complete-profile)
