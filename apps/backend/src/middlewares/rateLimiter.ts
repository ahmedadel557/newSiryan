import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const LOCALHOST = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skip: (req: Request) =>
    process.env.NODE_ENV === 'development' && LOCALHOST.includes(req.ip ?? ''),
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});