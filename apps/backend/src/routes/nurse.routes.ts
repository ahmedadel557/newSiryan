import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import { addVitalsSchema, medicationGivenSchema, emergencyFlagSchema } from '../validations/nurse.validation';
import {
  getNursePatients,
  addVitals,
  getMedicationSchedule,
  markMedicationGiven,
  emergencyFlag,
} from '../controllers/nurse';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();

router.use(authenticate, requireCompleteProfile, authorize('nurse'));

router.get('/patients', getNursePatients);
router.post('/patients/:id/vitals', validateRequest(addVitalsSchema), addVitals);
router.get('/patients/:id/medication-schedule', getMedicationSchedule);
router.patch('/patients/:id/medication/:item_id/given', validateRequest(medicationGivenSchema), markMedicationGiven);
router.post('/patients/:id/emergency-flag', validateRequest(emergencyFlagSchema), emergencyFlag);
router.get('/profile', getStaffProfile);
router.put('/profile', validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
