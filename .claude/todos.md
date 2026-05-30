# TODOs

## High Priority
- [ ] Verify `lucide-react` is not depended on by any component — if clean, uninstall it (project uses `react-icons` per rules)

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
