import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import { createInvoiceSchema, payInvoiceSchema, partialPaySchema } from '../validations/cashier.validation';
import {
  getPendingPayments,
  getInvoices,
  getInvoiceById,
  createInvoice,
  payInvoice,
  partialPayInvoice,
  cancelInvoice,
  getDailyReport,
  listBillablePatients,
  getPatientUnbilled,
  getPatientHistory,
  generateConsolidatedInvoice,
} from '../controllers/cashier';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();

router.use(authenticate, requireCompleteProfile, authorize('cashier'));

router.get('/pending', getPendingPayments);
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', validateRequest(createInvoiceSchema), createInvoice);
router.patch('/invoices/:id/pay', validateRequest(payInvoiceSchema), payInvoice);
router.patch('/invoices/:id/partial', validateRequest(partialPaySchema), partialPayInvoice);
router.patch('/invoices/:id/cancel', cancelInvoice);
router.get('/reports/daily', getDailyReport);
router.get('/patients', listBillablePatients);
router.get('/patients/:id/unbilled', getPatientUnbilled);
router.post('/patients/:id/generate-invoice', generateConsolidatedInvoice);
router.get('/patients/:patientId/history', getPatientHistory);
router.get('/profile', getStaffProfile);
router.put('/profile', validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
