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
