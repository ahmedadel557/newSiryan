import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import { uploadResultsSchema, updateStatusSchema } from '../validations/lab.validation';
import { getLabOrders, getLabOrderById, uploadLabResults, updateLabOrderStatus, getLabSchedule } from '../controllers/lab';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();

router.use(authenticate, requireCompleteProfile, authorize('lab_technician'));

router.get('/orders', getLabOrders);
router.get('/orders/:id', getLabOrderById);
router.patch('/orders/:id/status', validateRequest(updateStatusSchema), updateLabOrderStatus);
router.patch('/orders/:id/results', validateRequest(uploadResultsSchema), uploadLabResults);
router.get('/schedule', getLabSchedule);
router.get('/profile', getStaffProfile);
router.put('/profile', validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
