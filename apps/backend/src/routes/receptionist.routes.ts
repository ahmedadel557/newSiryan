import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import { cancelAppointmentSchema, rescheduleSchema, checkinSchema } from '../validations/receptionist.validation';
import {
  getPatients,
  getPatientAppointments,
  getAllAppointments,
  confirmAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getPendingLabOrders,
  getPendingRadiologyOrders,
  checkinPatient,
  getRequests,
} from '../controllers/receptionist';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();

router.use(authenticate, requireCompleteProfile, authorize('receptionist'));

router.get('/patients',                  getPatients);
router.get('/patients/:id/appointments', getPatientAppointments);
router.get('/appointments',              getAllAppointments);
router.get('/requests',                  getRequests);
router.patch('/appointments/:id/confirm',                              confirmAppointment);
router.patch('/appointments/:id/cancel',    validateRequest(cancelAppointmentSchema), cancelAppointment);
router.patch('/appointments/:id/reschedule', validateRequest(rescheduleSchema),       rescheduleAppointment);
router.post('/checkin/:patient_id',          validateRequest(checkinSchema),           checkinPatient);
router.get('/lab-orders',                getPendingLabOrders);
router.get('/radiology-orders',          getPendingRadiologyOrders);
router.get('/profile',  getStaffProfile);
router.put('/profile',  validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
