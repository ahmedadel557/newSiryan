import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis";
import { sendError } from "../utils/response";

const DEV_LOCALHOST = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];

interface RateLimitOptions {
  keyPrefix: string;
  max: number;
  windowSeconds: number;
  getKey?: (req: Request) => string;
}

export function createRedisRateLimiter(opts: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip entirely for localhost in development
    if (process.env.NODE_ENV === "development" && DEV_LOCALHOST.includes(req.ip ?? "")) {
      next();
      return;
    }

    if (!redisClient.isReady) {
      next();
      return;
    }

    const identifier = opts.getKey ? opts.getKey(req) : (req.ip ?? "unknown");
    const key = `ratelimit:${opts.keyPrefix}:${identifier}`;

    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, opts.windowSeconds);
      }
      if (count > opts.max) {
        sendError(res, "Too many requests, please try again later.", 429);
        return;
      }
    } catch {
      // Redis unavailable — allow through
    }

    next();
  };
}

export function createControllerRateLimiter(opts: RateLimitOptions) {
  const buildKey = (req: Request): string => {
    const identifier = opts.getKey ? opts.getKey(req) : (req.ip ?? "unknown");
    return `ratelimit:${opts.keyPrefix}:${identifier}`;
  };

  const isBlocked = async (key: string): Promise<boolean> => {
    if (!redisClient.isReady) return false;
    try {
      const raw = await redisClient.get(key);
      return raw !== null && parseInt(raw, 10) >= opts.max;
    } catch {
      return false;
    }
  };

  const increment = async (key: string): Promise<void> => {
    if (!redisClient.isReady) return;
    try {
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, opts.windowSeconds);
    } catch {}
  };

  const reset = async (key: string): Promise<void> => {
    if (!redisClient.isReady) return;
    try {
      await redisClient.del(key);
    } catch {}
  };

  return { buildKey, isBlocked, increment, reset };
}
