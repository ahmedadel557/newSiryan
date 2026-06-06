import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { getMySchedule } from '../controllers/schedule.controller';

const router = Router();

// Any authenticated staff member can view their own schedule
router.get('/me', authenticate, requireCompleteProfile, getMySchedule);

export default router;
