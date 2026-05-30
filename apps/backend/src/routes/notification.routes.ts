import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { getNotifications, markOneRead, markAllRead, deleteOne, clearAll } from '../controllers/notification';

const router = Router();

router.use(authenticate, requireCompleteProfile);

router.get('/', getNotifications);
router.patch('/:id/read', markOneRead);
router.patch('/read-all', markAllRead);
router.delete('/', clearAll);
router.delete('/:id', deleteOne);

export default router;
