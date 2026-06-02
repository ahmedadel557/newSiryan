import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import { uploadResultsSchema, updateStatusSchema } from '../validations/radiology.validation';
import { getRadiologyOrders, getRadiologyOrderById, uploadRadiologyResults, updateRadiologyOrderStatus, getRadiologySchedule } from '../controllers/radiology';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();

router.use(authenticate, requireCompleteProfile, authorize('radiology_technician'));

router.get('/orders', getRadiologyOrders);
router.get('/orders/:id', getRadiologyOrderById);
router.patch('/orders/:id/status', validateRequest(updateStatusSchema), updateRadiologyOrderStatus);
router.patch('/orders/:id/results', validateRequest(uploadResultsSchema), uploadRadiologyResults);
router.get('/schedule', getRadiologySchedule);
router.get('/profile', getStaffProfile);
router.put('/profile', validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
