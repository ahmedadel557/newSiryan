import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const LOCALHOST = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

/**
 * E2E bypass: when E2E_RATE_LIMIT_KEY is set in the environment, requests carrying
 * a matching `x-e2e-key` header skip the global limiter. Inert unless the env var
 * is configured, so it cannot weaken rate limiting without the deployed secret.
 */
const isE2eBypass = (req: Request): boolean => {
  const key = process.env.E2E_RATE_LIMIT_KEY;
  return !!key && req.headers['x-e2e-key'] === key;
};

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skip: (req: Request) =>
    (process.env.NODE_ENV === 'development' && LOCALHOST.includes(req.ip ?? '')) ||
    isE2eBypass(req),
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
