import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import * as settingsController from '../controllers/settings';
import { getPublicPricing } from '../controllers/admin';
import { redisClient } from '../config/redis';
import { sendSuccess } from '../utils/response';

const router = Router();

// Public endpoints — no auth required
router.get('/pricing', getPublicPricing);

router.get('/maintenance', async (_req: Request, res: Response) => {
  try {
    const raw = redisClient.isReady ? await redisClient.get('system:maintenance').catch(() => null) : null;
    if (raw) {
      const data = JSON.parse(raw);
      sendSuccess(res, {
        is_active: true,
        message: data.message,
        estimated_duration: data.estimated_duration,
        started_at: data.enabled_at,
      });
    } else {
      sendSuccess(res, { is_active: false });
    }
  } catch {
    sendSuccess(res, { is_active: false });
  }
});

router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put('/password', settingsController.changePassword);
router.put('/notifications', settingsController.updateNotificationPrefs);
router.put('/appearance', settingsController.updateAppearance);
router.delete('/account', settingsController.deleteAccount);

export default router;
