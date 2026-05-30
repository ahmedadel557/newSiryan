import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

export const maintenanceGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Admin + auth always pass. The public maintenance-status endpoint must also stay
  // reachable while maintenance is active — the frontend overlay relies on it as a
  // fallback when the socket `system_maintenance` event races ahead of its listener.
  if (
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/auth') ||
    req.path === '/api/settings/maintenance'
  ) {
    next();
    return;
  }
  if (!redisClient.isReady) {
    next();
    return;
  }
  try {
    const raw = await redisClient.get('system:maintenance');
    if (raw) {
      const data = JSON.parse(raw);
      res.status(503).json({ success: false, message: data.message || 'System is under maintenance. Please try again later.' });
      return;
    }
  } catch {
    // Redis unavailable — allow through
  }
  next();
};
