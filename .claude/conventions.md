# Conventions

## Frontend Styling
- Use `src/styles/tokens.css` CSS custom properties for colors, typography, spacing
- Use `src/styles/kit.css` utility classes (`.btn`, `.card`, `.badge`, `.input`, etc.)
- Tailwind v4 for layout utilities ONLY (flex, grid, gap, padding, margin)
- NEVER use shadcn component CSS classes — the project uses a custom design system
- Brand color: `--brand` / `--forest-600` (#235347)
- Dark mode: `.dark` class on `<html>` via `next-themes`
- Text scale: `.t-h1` → `.t-eyebrow`, `.t-mono`, `.t-numeric`

## Validation
- Frontend: `yup` + `react-hook-form` with `@hookform/resolvers/yup`
- Backend: `zod` schemas in `src/validations/` — applied via `validateRequest(schema)` middleware
- NEVER use zod in frontend, NEVER use yup in backend

## TypeScript
- All frontend domain types in ONE file: `src/types/index.ts`
- Backend shared types: `src/types/`
- No `any` unless unavoidable

## Component Patterns (Frontend)
- Pages are thin: pull from hooks, pass data to components
- Hooks expose `{ data, loading, error }` shape
- Component folders are role-scoped: `components/patient/`, `components/doctor/`, `components/staff/[role]/`
- Shared primitives: `components/ui/`
- Cross-role components: `components/shared/`

## Hook Patterns (Frontend)
- One hook per domain per role (e.g., `usePatientAppointments`, `useDoctor`)
- Hooks own API calls via service layer — never call apiClient directly from a page
- 28 hooks total in `src/hooks/`

## Backend Patterns
- Controller: validate input → call service → `sendSuccess(res, data)` or `next(err)`
- Service: pure business logic, returns data or throws
- Models: all in `src/models/`, named in PascalCase
- Routes: `router.METHOD('/path', authenticate, authorize('role'), validateRequest(schema), controller)`
- Use `src/utils/response.ts` helpers for all responses

## File Naming
- Backend: camelCase files, PascalCase models
- Frontend: camelCase hooks/services/utils, PascalCase components

## Linting
- Run `npm run lint` before committing (no test suite exists)
- ESLint configured for TypeScript on both sides
