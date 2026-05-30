import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import {
  createDiagnosisSchema,
  createPrescriptionSchema,
  createLabOrderSchema,
  createRadiologyOrderSchema,
  cancelRequestSchema,
  blockSlotSchema,
} from '../validations/doctor.validation';
import {
  getDoctorList,
  getDoctorAvailability,
  getDoctorScheduleInfo,
  getPatients,
  getPatientRecord,
  createDiagnosis,
  createPrescription,
  createLabOrder,
  createRadiologyOrder,
  getSchedule,
  rescheduleRequest,
  cancelRequest,
  getSinglePatient,
  getPatientRecordsList,
  getPatientPrescriptionsList,
  getPatientLabOrdersList,
  getPatientRadiologyOrdersList,
  blockScheduleSlot,
  listScheduleBlocks,
  unblockScheduleSlot,
  getDoctorRoomBookings,
  requestRoomBooking,
  getDoctorPublicRatings,
  getMyRatings,
  listSharedRecords,
  getSharedRecord,
  scheduleFollowUp,
} from '../controllers/doctor';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();

router.get('/list', authenticate, authorize('patient', 'doctor', 'receptionist', 'admin'), getDoctorList);
router.get('/:id/availability', authenticate, authorize('patient', 'doctor', 'receptionist', 'admin'), getDoctorAvailability);
router.get('/:id/schedule-info', authenticate, authorize('patient', 'doctor', 'receptionist', 'admin'), getDoctorScheduleInfo);
router.get('/:id/ratings', authenticate, authorize('patient', 'doctor', 'receptionist', 'admin'), getDoctorPublicRatings);

router.use(authenticate, requireCompleteProfile, authorize('doctor'));

router.get('/patients', getPatients);
router.get('/patients/:id/record', getPatientRecord);
router.get('/patients/:id/records', getPatientRecordsList);
router.get('/patients/:id/prescriptions', getPatientPrescriptionsList);
router.get('/patients/:id/lab-orders', getPatientLabOrdersList);
router.get('/patients/:id/radiology-orders', getPatientRadiologyOrdersList);
router.get('/patients/:id', getSinglePatient);
router.post('/patients/:id/diagnosis', validateRequest(createDiagnosisSchema), createDiagnosis);
router.post('/patients/:id/prescription', validateRequest(createPrescriptionSchema), createPrescription);
router.post('/patients/:id/lab-order', validateRequest(createLabOrderSchema), createLabOrder);
router.post('/patients/:id/radiology-order', validateRequest(createRadiologyOrderSchema), createRadiologyOrder);
router.post('/patients/:id/room-request', requestRoomBooking);
router.post('/patients/:id/follow-up', scheduleFollowUp);
router.get('/schedule', getSchedule);
router.get('/schedule/blocks', listScheduleBlocks);
router.post('/schedule/block', validateRequest(blockSlotSchema), blockScheduleSlot);
router.delete('/schedule/blocks/:id', unblockScheduleSlot);
router.get('/room-bookings', getDoctorRoomBookings);
router.post('/appointments/:id/reschedule-request', rescheduleRequest);
router.post('/appointments/:id/cancel-request', validateRequest(cancelRequestSchema), cancelRequest);
router.get('/me/ratings', getMyRatings);
router.get('/shared-records', listSharedRecords);
router.get('/shared-records/:id', getSharedRecord);
router.get('/profile', getStaffProfile);
router.put('/profile', validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
