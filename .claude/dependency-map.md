# Dependency Map

## Backend Middleware Pipeline
```
server.ts
 ├── app.ts (Express app)
 │    ├── helmet / cors / morgan / cookieParser
 │    ├── rateLimiter (middlewares/rateLimiter.ts)
 │    ├── authenticate (middlewares/authenticate.ts)
 │    │    └── reads access_token cookie → verifies JWT → req.user
 │    ├── authorize(...roles) (middlewares/authorize.ts)
 │    │    └── checks req.user.role against allowed roles
 │    ├── validateRequest(schema) (middlewares/validateRequest.ts)
 │    │    └── runs Zod schema against req.body
 │    └── errorHandler (middlewares/errorHandler.ts)
 ├── config/database.ts (Mongoose connection)
 ├── config/redis.ts (Redis client)
 ├── config/passport.ts (Google OAuth strategy)
 ├── config/socket.ts (Socket.io server)
 └── jobs/ (3 cron jobs started on boot)
```

## Backend Route → Controller → Service
```
routes/[domain].ts
 └── controller/[domain]/[action].ts
      └── services/[domain].service.ts
           └── models/[Model].ts (Mongoose)
           └── config/redis.ts (cache reads/writes)
```

## Frontend Auth Chain
```
middleware.ts (Next.js Edge)
 └── reads access_token cookie
 └── jose.decodeJwt() → { role, ipc, password_changed }
 └── enforces /dashboard/[role]/* isolation
 └── redirects: incomplete profile → /auth/complete-profile
 └── redirects: staff first login → /auth/change-password

context/AuthContext.tsx
 └── useAuth hook
 └── login/logout/refresh state
```

## Frontend Data Chain
```
Page (app/dashboard/[role]/...)
 └── hook (src/hooks/use*.ts)
      ├── [Admin + Cashier modules] TanStack Query layer:
      │    src/hooks/admin/*  |  src/hooks/cashier/*
      │     └── useQuery / useMutation
      │          └── singleton queryClient (src/lib/queryClient.ts)
      │          └── shared cache keyed via src/lib/queryKeys.ts
      │          └── socket events → queryClient.invalidateQueries(...)
      │          └── QueryProvider wraps app in src/app/layout.tsx (outermost)
      └── service (src/services/*.service.ts)
           └── api.client.ts (axios instance)
                └── NEXT_PUBLIC_API_URL + /api/...
                └── 401 interceptor → POST /api/auth/refresh → retry
                └── refresh fails → redirect /auth/login
```
Other modules (doctor/patient/nurse/pharmacist/lab/radiology/reception) still use the older
`useState`+`useEffect`+manual `reload()` pattern; same service/apiClient chain.

## Frontend Socket Chain
```
socket.client.ts
 └── io(NEXT_PUBLIC_API_URL)
 └── useSocketEvent hook
      └── components/shared/NotificationBell.tsx
```

## Key Cross-Cutting Concerns
- `src/utils/response.ts` — used by ALL controllers
- `src/middlewares/authenticate.ts` — gates ALL protected routes
- `src/types/index.ts` — imported by ALL frontend files needing domain types
- `src/styles/tokens.css` — imported in globals.css, applies to ALL pages
