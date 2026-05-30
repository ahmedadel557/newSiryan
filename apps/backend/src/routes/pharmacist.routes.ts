import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import {
  supplyRequestSchema,
  rejectOrderSchema,
  checkInteractionsSchema,
  refillRequestSchema,
  rejectRefillSchema,
  deliveryStatusSchema,
  addBatchSchema,
} from '../validations/pharmacy.validation';
import {
  getPrescriptions,
  getPrescriptionById,
  listPharmacyOrders,
  getPharmacyOrderById,
  approvePharmacyOrder,
  approvePrescriptionOrder,
  rejectPharmacyOrder,
  getMedications,
  createSupplyRequest,
  getDispensingHistory,
  checkDrugInteractions,
  getMedicationInstructionsPdf,
  createRefillRequest,
  listRefillRequests,
  approveRefillRequest,
  rejectRefillRequest,
  updateDeliveryStatus,
  getDeliveryStatus,
  addMedicationBatch,
  getMedicationBatches,
  getMedicationSubstitutes,
  getDailyDispensingReport,
} from '../controllers/pharmacist';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();

// ─── Public-ish medication list ───────────────────────────────────────────────
router.get('/medications', authenticate, authorize('patient', 'pharmacist', 'admin', 'doctor', 'nurse'), getMedications);

// ─── Patient endpoints ────────────────────────────────────────────────────────
router.post(
  '/refill-request',
  authenticate,
  requireCompleteProfile,
  authorize('patient'),
  validateRequest(refillRequestSchema),
  createRefillRequest,
);

router.get(
  '/orders/:id/delivery',
  authenticate,
  authorize('patient', 'pharmacist', 'admin'),
  getDeliveryStatus,
);

// ─── Pharmacist-only block ────────────────────────────────────────────────────
router.use(authenticate, requireCompleteProfile, authorize('pharmacist'));

router.get('/prescriptions', getPrescriptions);
router.get('/prescriptions/:id', getPrescriptionById);

router.get('/orders', listPharmacyOrders);
router.get('/orders/:id', getPharmacyOrderById);
router.patch('/orders/:id/approve', approvePharmacyOrder);
router.patch('/orders/:id/approve-prescription', approvePrescriptionOrder);
router.patch('/orders/:id/reject', validateRequest(rejectOrderSchema), rejectPharmacyOrder);
router.patch('/orders/:id/delivery-status', validateRequest(deliveryStatusSchema), updateDeliveryStatus);
router.get('/orders/:id/instructions-pdf', getMedicationInstructionsPdf);

router.post('/supply-request', validateRequest(supplyRequestSchema), createSupplyRequest);
router.post('/check-interactions', validateRequest(checkInteractionsSchema), checkDrugInteractions);

router.get('/history', getDispensingHistory);

router.get('/refill-requests', listRefillRequests);
router.patch('/refill-requests/:id/approve', approveRefillRequest);
router.patch('/refill-requests/:id/reject', validateRequest(rejectRefillSchema), rejectRefillRequest);

router.get('/medications/:id/batches', getMedicationBatches);
router.post('/medications/:id/batch', validateRequest(addBatchSchema), addMedicationBatch);
router.get('/medications/:id/substitutes', getMedicationSubstitutes);

router.get('/reports/daily', getDailyDispensingReport);

router.get('/profile', getStaffProfile);
router.put('/profile', validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
