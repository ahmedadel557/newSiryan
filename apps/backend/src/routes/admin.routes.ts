import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import {
  createStaffSchema, changeRoleSchema, setActiveSchema, createInsuranceCompanySchema,
  updateInsuranceCompanySchema, createDepartmentSchema, createAdminInvoiceSchema,
  cancelAdminAppointmentSchema, updateUserProfileAdminSchema, assignDepartmentSchema,
  overrideDoctorScheduleSchema, assignShiftSchema, updateShiftSchema, updatePricingSchema,
  addLabTestSchema, updateLabTestPriceSchema, addRadiologyScanSchema, updateRadiologyScanPriceSchema,
  createAnnouncementSchema, enableMaintenanceSchema, updateEmailTemplateSchema, rejectDeletionSchema,
} from '../validations/admin.validation';
import {
  listUsers, createStaff, changeRole, setActive, deleteUser, getUserById, getAuditLog,
  getAdminInvoices, getRevenueReport, getRatingsReport, getStats, getDoctorReport,
  getStaffRequests, approveStaff, rejectStaff, cleanupOrphanedProfiles,
  listInsuranceCompanies, createInsuranceCompany, updateInsuranceCompany, deleteInsuranceCompany,
  getDepartments, createDepartment, deleteDepartment, getOccupancyReport, createAdminInvoice,
  getPharmacyReport, getAdminAppointments, cancelAdminAppointment, updateUserProfileAdmin,
  assignStaffDepartment, getDepartmentStaff,
  getDoctorSchedule, overrideDoctorSchedule, deleteDoctorScheduleSlot, getAllSchedules,
  getShifts, assignShift, updateShift, deleteShift, getTodayShifts,
  getPricingAdmin, updatePricing, addLabTest, updateLabTest, deleteLabTest,
  addRadiologyScan, updateRadiologyScan, deleteRadiologyScan,
  createAnnouncement, getAnnouncements, deleteAnnouncement,
  enableMaintenance, disableMaintenance, getMaintenanceStatus,
  getEmailTemplates, updateEmailTemplate,
  exportPatientData, getDeletionRequests, approveDeletion, rejectDeletion,
  getSystemHealth, getSystemLogs,
} from '../controllers/admin';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';
import Profile from '../models/Profile';
import { sendSuccess } from '../utils/response';

const router = Router();

router.use(authenticate, requireCompleteProfile, authorize('admin'));

router.get('/stats', getStats);
router.get('/reports/doctors', getDoctorReport);
router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.post('/users', validateRequest(createStaffSchema), createStaff);
router.patch('/users/:id/role', validateRequest(changeRoleSchema), changeRole);
router.patch('/users/:id/activate', validateRequest(setActiveSchema), setActive);
router.patch('/users/:id/profile', validateRequest(updateUserProfileAdminSchema), updateUserProfileAdmin);
router.delete('/users/:id', deleteUser);
router.get('/audit-log', getAuditLog);
router.get('/invoices', getAdminInvoices);
router.get('/reports/revenue', getRevenueReport);
router.get('/reports/ratings', getRatingsReport);
router.get('/staff-requests', getStaffRequests);
router.patch('/staff-requests/:id/approve', approveStaff);
router.patch('/staff-requests/:id/reject', rejectStaff);
router.get('/profile', getStaffProfile);
router.put('/profile', validateRequest(updateStaffProfileSchema), updateStaffProfile);

router.post('/cleanup-profiles', cleanupOrphanedProfiles);

router.get('/insurance-companies', listInsuranceCompanies);
router.post('/insurance-companies', validateRequest(createInsuranceCompanySchema), createInsuranceCompany);
router.patch('/insurance-companies/:id', validateRequest(updateInsuranceCompanySchema), updateInsuranceCompany);
router.delete('/insurance-companies/:id', deleteInsuranceCompany);

router.get('/insurance', listInsuranceCompanies);
router.post('/insurance', validateRequest(createInsuranceCompanySchema), createInsuranceCompany);
router.put('/insurance/:id', validateRequest(updateInsuranceCompanySchema), updateInsuranceCompany);
router.delete('/insurance/:id', deleteInsuranceCompany);

router.get('/departments', getDepartments);
router.post('/departments', validateRequest(createDepartmentSchema), createDepartment);
router.delete('/departments/:id', deleteDepartment);

router.get('/appointments', getAdminAppointments);
router.delete('/appointments/:id', validateRequest(cancelAdminAppointmentSchema), cancelAdminAppointment);

router.get('/reports/occupancy', getOccupancyReport);
router.get('/reports/pharmacy', getPharmacyReport);

router.post('/invoices', validateRequest(createAdminInvoiceSchema), createAdminInvoice);

router.post('/fix-google-profiles', async (_req, res, next) => {
  try {
    const result = await Profile.deleteMany({ user: null });
    sendSuccess(res, { deleted: result.deletedCount }, `Removed ${result.deletedCount} orphaned profile(s)`);
  } catch (err) {
    next(err);
  }
});

// ─── Section 4: Department Assignments ───────────────────────────────────────
router.put('/staff/:id/department', validateRequest(assignDepartmentSchema), assignStaffDepartment);
router.get('/departments/:id/staff', getDepartmentStaff);

// ─── Section 5: Doctor Schedule Management ───────────────────────────────────
router.get('/schedules', getAllSchedules);
router.get('/doctors/:id/schedule', getDoctorSchedule);
router.put('/doctors/:id/schedule', validateRequest(overrideDoctorScheduleSchema), overrideDoctorSchedule);
router.delete('/doctors/:id/schedule/slot', deleteDoctorScheduleSlot);

// ─── Section 6: Shift Management ─────────────────────────────────────────────
router.get('/shifts/today', getTodayShifts);
router.get('/shifts', getShifts);
router.post('/shifts', validateRequest(assignShiftSchema), assignShift);
router.put('/shifts/:id', validateRequest(updateShiftSchema), updateShift);
router.delete('/shifts/:id', deleteShift);

// ─── Section 7: Pricing Management ───────────────────────────────────────────
router.get('/settings/pricing', getPricingAdmin);
router.put('/settings/pricing', validateRequest(updatePricingSchema), updatePricing);
router.post('/settings/pricing/lab', validateRequest(addLabTestSchema), addLabTest);
router.put('/settings/pricing/lab/:test_name', validateRequest(updateLabTestPriceSchema), updateLabTest);
router.delete('/settings/pricing/lab/:test_name', deleteLabTest);
router.post('/settings/pricing/radiology', validateRequest(addRadiologyScanSchema), addRadiologyScan);
router.put('/settings/pricing/radiology/:scan_type', validateRequest(updateRadiologyScanPriceSchema), updateRadiologyScan);
router.delete('/settings/pricing/radiology/:scan_type', deleteRadiologyScan);

// ─── Section 8: System Announcements ─────────────────────────────────────────
router.post('/announcements', validateRequest(createAnnouncementSchema), createAnnouncement);
router.get('/announcements', getAnnouncements);
router.delete('/announcements/:id', deleteAnnouncement);

// ─── Section 9: Maintenance Mode ─────────────────────────────────────────────
router.post('/system/maintenance', validateRequest(enableMaintenanceSchema), enableMaintenance);
router.delete('/system/maintenance', disableMaintenance);
router.get('/system/maintenance', getMaintenanceStatus);

// ─── Section 10: Email Templates ─────────────────────────────────────────────
router.get('/email-templates', getEmailTemplates);
router.put('/email-templates/:name', validateRequest(updateEmailTemplateSchema), updateEmailTemplate);

// ─── Section 11: Data Export (GDPR) ──────────────────────────────────────────
router.post('/export/patient/:id', exportPatientData);
router.get('/deletion-requests', getDeletionRequests);
router.patch('/deletion-requests/:id/approve', approveDeletion);
router.patch('/deletion-requests/:id/reject', validateRequest(rejectDeletionSchema), rejectDeletion);

// ─── Section 12: System Health ────────────────────────────────────────────────
router.get('/system/health', getSystemHealth);
router.get('/system/logs', getSystemLogs);

export default router;
