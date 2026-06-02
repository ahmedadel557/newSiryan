# TODOs

## High Priority
- [ ] Test full doctor flow locally with real Stream credentials (set backend `STREAM_API_KEY`/`STREAM_API_SECRET` + frontend `NEXT_PUBLIC_STREAM_API_KEY`; verify video call + in-call chat doctor↔patient). In-call chat also needs the **Chat product enabled** on the Stream app.

~~Verify lucide-react... uninstall (project uses react-icons)~~ — CORRECTION: the project standard **is** `lucide-react` (used in navItems + all components). `react-icons` is NOT used. Ignore the old rule.

## Technical Debt
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
