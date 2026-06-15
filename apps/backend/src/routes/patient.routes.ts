import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { requireEmailVerified } from '../middlewares/requireEmailVerified';
import { createRedisRateLimiter } from '../middlewares/redisRateLimiter';
import { validateRequest } from '../middlewares/validateRequest';
import { updateProfileSchema, bookAppointmentSchema, createPharmacyOrderSchema, bookRoomSchema, chatbotSendMessageSchema } from '../validations/patient.validation';
import {
  getProfile,
  updateProfile,
  getMedicalRecord,
  getAppointments,
  getAppointment,
  bookAppointment,
  mockPayAppointment,
  scheduleLabOrder,
  scheduleRadiologyOrder,
  confirmRoomBooking,
  cancelRoomBooking,
  cancelAppointment,
  getPrescriptions,
  getLabResults,
  getRadiologyResults,
  createPharmacyOrder,
  getPharmacyOrders,
  bookRoom,
  getRoomBookings,
  getInvoices,
  rateAppointment,
  getMyAppointmentRating,
  getAppointmentWaitingEstimate,
  shareMedicalRecord,
  listMyShares,
  revokeShare,
  getInsuranceCompanies,
} from '../controllers/patient';
import { sendMessage, getHistory, listConversations } from '../controllers/patient/chatbot';
import { uploadChatbotAudio } from '../config/upload';
import { getNotifications, markOneRead, markAllRead } from '../controllers/notification';
import { getDepartments } from '../controllers/admin';

const chatbotRateLimiter = createRedisRateLimiter({
  keyPrefix: 'chatbot',
  max: 20,
  windowSeconds: 60 * 60, // 1 hour
  getKey: (req) => (req as any).user?.id ?? req.ip ?? 'unknown',
});

const router = Router();

router.use(authenticate, requireCompleteProfile, authorize('patient'));

router.get('/profile', getProfile);
router.put('/profile', validateRequest(updateProfileSchema), updateProfile);
router.get('/medical-record', getMedicalRecord);
router.post('/medical-records/:id/share', shareMedicalRecord);
router.get('/medical-record-shares', listMyShares);
router.delete('/medical-record-shares/:id', revokeShare);
router.get('/appointments', getAppointments);
router.post('/appointments', requireEmailVerified, validateRequest(bookAppointmentSchema), bookAppointment);
router.get('/appointments/:id', getAppointment);
router.post('/appointments/:id/pay-mock', mockPayAppointment);
router.delete('/appointments/:id', cancelAppointment);
router.post('/appointments/:id/rate', rateAppointment);
router.get('/appointments/:id/rating', getMyAppointmentRating);
router.get('/appointments/:id/waiting-estimate', getAppointmentWaitingEstimate);
router.get('/prescriptions', getPrescriptions);
router.get('/lab-results', getLabResults);
router.post('/lab-orders/:id/schedule', scheduleLabOrder);
router.get('/radiology-results', getRadiologyResults);
router.post('/radiology-orders/:id/schedule', scheduleRadiologyOrder);
router.post('/rooms/bookings/:id/confirm', confirmRoomBooking);
router.delete('/rooms/bookings/:id', cancelRoomBooking);
router.post('/pharmacy/order', requireEmailVerified, validateRequest(createPharmacyOrderSchema), createPharmacyOrder);
router.get('/pharmacy/orders', getPharmacyOrders);
router.post('/rooms/book', requireEmailVerified, validateRequest(bookRoomSchema), bookRoom);
router.get('/rooms/bookings', getRoomBookings);
router.get('/invoices', getInvoices);
router.get('/insurance-companies', getInsuranceCompanies);
router.get('/departments', getDepartments);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllRead);
router.patch('/notifications/:id/read', markOneRead);
router.post('/chatbot', requireEmailVerified, chatbotRateLimiter, uploadChatbotAudio.single('audio'), validateRequest(chatbotSendMessageSchema), sendMessage);
router.get('/chatbot/history', getHistory);
router.get('/chatbot/conversations', listConversations);

export default router;
