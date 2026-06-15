// Single source of truth for environment loading.
//
// This MUST be the very first import in the process (before ./instrument and
// any module that reads process.env at import-time). It loads dotenv-flow,
// which reads `.env` + `.env.${NODE_ENV}` (e.g. `.env.development`), then
// validates the critical vars so a missing one is a loud crash rather than a
// silently-disabled service.
import dotenvFlow from 'dotenv-flow';
import { z } from 'zod';

// Load `.env` + `.env.${NODE_ENV}`. dotenv-flow picks the suffix from
// process.env.NODE_ENV at load time; the shell/nodemon doesn't set it, so we
// supply `default_node_env` rather than relying on a prior loader to seed it.
dotenvFlow.config({ default_node_env: 'development' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),

  // Critical — the process cannot function without these.
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),

  // Bootstrap accounts — required so seed failures are loud crashes, not silent no-ops.
  // Values live in .env.development / .env.production (never in .env.example).
  // TODO: rotate ADMIN_* and INVENTORY_MANAGER_* credentials before going to production.
  // TODO: ensure JWT_SECRET and JWT_REFRESH_SECRET differ between dev and prod environments.
  ADMIN_EMAIL:                  z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_USERNAME:               z.string().min(1, 'ADMIN_USERNAME is required'),
  ADMIN_PASSWORD:               z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
  INVENTORY_MANAGER_EMAIL:      z.string().email('INVENTORY_MANAGER_EMAIL must be a valid email'),
  INVENTORY_MANAGER_USERNAME:   z.string().min(1, 'INVENTORY_MANAGER_USERNAME is required'),
  INVENTORY_MANAGER_PASSWORD:   z.string().min(8, 'INVENTORY_MANAGER_PASSWORD must be at least 8 characters'),

  // Optional — features degrade gracefully when absent.
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(
    `\n❌ Invalid environment configuration (NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}):\n${issues}\n\n` +
      `Check that apps/backend/.env.${process.env.NODE_ENV ?? 'development'} exists and contains the required keys.\n`,
  );
  process.exit(1);
}

export const env = parsed.data;
