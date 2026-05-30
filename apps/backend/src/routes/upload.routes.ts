import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { uploadAvatar } from '../config/upload';
import { uploadAvatarController, deleteAvatarController } from '../controllers/upload';

const router = Router();
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), uploadAvatarController);
router.delete('/avatar', authenticate, deleteAvatarController);
export default router;
