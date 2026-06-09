import crypto from 'crypto';
import os from 'os';
import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import User from '../../models/User';
import Profile from '../../models/Profile';
import Appointment from '../../models/Appointment';
import Invoice from '../../models/Invoice';
import AuditLog from '../../models/AuditLog';
import LabOrder from '../../models/LabOrder';
import RadiologyOrder from '../../models/RadiologyOrder';
import InventoryItem from '../../models/InventoryItem';
import Notification from '../../models/Notification';
import Rating from '../../models/Rating';
import Room from '../../models/Room';
import PharmacyOrder from '../../models/PharmacyOrder';
import Medication from '../../models/Medication';
import Department from '../../models/Department';
import BlockedSlot from '../../models/BlockedSlot';
import Shift from '../../models/Shift';
import PricingSettings from '../../models/PricingSettings';
import Announcement from '../../models/Announcement';
import EmailTemplate from '../../models/EmailTemplate';
import DeletionRequest from '../../models/DeletionRequest';
import MedicalRecord from '../../models/MedicalRecord';
import Prescription from '../../models/Prescription';
import { sendSuccess, sendError } from '../../utils/response';
import { getPaginationParams, paginatedResult } from '../../utils/paginate';
import { sendEmail } from '../../utils/mailer';
import { logAudit } from '../../utils/audit';
import { emitToRole, emitToUser, getIO } from '../../config/socket';
import { redisClient } from '../../config/redis';
import { isStreamConfigured, getStreamClient } from '../../config/stream';
import { getInventoryAlertJobStatus } from '../../jobs/inventoryAlert.job';
import { getInventoryExpiryJobStatus } from '../../jobs/inventoryExpiry.job';
import { getInventoryReportJobStatus } from '../../jobs/inventoryReport.job';
import { getAppointmentReminderJobStatus } from '../../jobs/appointmentReminder.job';
import { getProfileCleanupJobStatus } from '../../jobs/profileCleanup.job';
import { getPharmacyExpiryJobStatus } from '../../jobs/pharmacyExpiry.job';
import { getPharmacyReportJobStatus } from '../../jobs/pharmacyReport.job';
import { cache } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cacheTtl';
import { AuthRequest } from '../../middlewares/auth';
import {
  listUsersSchema,
  createStaffSchema,
  changeRoleSchema,
  setActiveSchema,
  revenueReportSchema,
  createInsuranceCompanySchema,
  updateInsuranceCompanySchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createAdminInvoiceSchema,
  cancelAdminAppointmentSchema,
  updateUserProfileAdminSchema,
  assignDepartmentSchema,
  overrideDoctorScheduleSchema,
  assignShiftSchema,
  updateShiftSchema,
  updatePricingSchema,
  addLabTestSchema,
  updateLabTestPriceSchema,
  addRadiologyScanSchema,
  updateRadiologyScanPriceSchema,
  createAnnouncementSchema,
  enableMaintenanceSchema,
  updateEmailTemplateSchema,
  exportPatientDataSchema,
  rejectDeletionSchema,
} from '../../validations/admin.validation';
import InsuranceCompany from '../../models/InsuranceCompany';

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = listUsersSchema.safeParse({ query: req.query });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { page, limit, role } = parsed.data.query;
    const filter = role ? { role } : {};

    const [users, total] = await Promise.all([
      User.find(filter).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, { users, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const createStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createStaffSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { username, email, role, first_name, last_name, phone, specialization, department, shift, national_id } = parsed.data.body;
    const tempPassword = crypto.randomBytes(8).toString('hex');

    const user = await User.create({ username, email, password: tempPassword, role, password_changed: false });

    let profile;
    try {
      profile = await Profile.create({ user: user._id, first_name, last_name, phone, specialization, department, shift, national_id, hired_at: new Date() });
    } catch (profileErr) {
      await User.deleteOne({ _id: user._id });
      throw profileErr;
    }

    // Fire-and-forget: don't hold the HTTP response on the SMTP round-trip.
    sendEmail(
      email,
      'Your Siryan Hospital Account',
      `<p>Hello ${first_name},</p><p>Your account has been created. Your temporary password is: <strong>${tempPassword}</strong></p><p>Please log in and change your password immediately.</p>`
    ).catch((mailErr) => console.error('Failed to send welcome email:', mailErr));

    sendSuccess(res, { user, profile }, 'Staff account created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_staff', resource: 'user', resourceId: user._id.toString(), details: `role=${role}`, req });
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'Email or username already taken', 409);
    next(err);
  }
};

export const changeRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.id) return sendError(res, 'Cannot change your own role', 403);

    const parsed = changeRoleSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const user = await User.findByIdAndUpdate(req.params.id, { role: parsed.data.body.role }, { new: true });
    if (!user) return sendError(res, 'User not found', 404);

    sendSuccess(res, user, 'Role updated');
    logAudit({ performedBy: req.user!.id, action: 'change_role', resource: 'user', resourceId: req.params.id, details: `role=${parsed.data.body.role}`, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

export const setActive = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = setActiveSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { is_active } = parsed.data.body;
    if (req.params.id === req.user!.id && !is_active)
      return sendError(res, 'Cannot deactivate your own account', 403);

    const user = await User.findByIdAndUpdate(req.params.id, { is_active }, { new: true });
    if (!user) return sendError(res, 'User not found', 404);

    sendSuccess(res, user, is_active ? 'Account activated' : 'Account deactivated');
    logAudit({ performedBy: req.user!.id, action: is_active ? 'activate_user' : 'deactivate_user', resource: 'user', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);
    const profile = await Profile.findOne({ user: req.params.id });
    sendSuccess(res, { user, profile });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.id) return sendError(res, 'Cannot delete your own account', 403);

    const user = await User.findOneAndDelete({ _id: req.params.id });
    if (!user) return sendError(res, 'User not found', 404);

    sendSuccess(res, null, 'User deleted');
    logAudit({ performedBy: req.user!.id, action: 'delete_user', resource: 'user', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

export const cleanupOrphanedProfiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existingUserIds = await User.distinct('_id');
    const result = await Profile.deleteMany({ user: { $nin: existingUserIds } });
    logAudit({
      performedBy: req.user!.id,
      action: 'ORPHANED_PROFILES_CLEANED',
      resource: 'Profile',
      details: `Deleted ${result.deletedCount} orphaned profiles`,
      req,
    });
    return sendSuccess(res, { deleted: result.deletedCount }, 'Cleanup complete');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const getAuditLog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action, from, to, search } = req.query as Record<string, string | undefined>;
    const filter: Record<string, any> = {};
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      filter.$or = [
        { action:   { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
        { details:  { $regex: search, $options: 'i' } },
      ];
    }
    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performed_by', 'username email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    sendSuccess(res, paginatedResult(logs, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

export const getAdminInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find({})
        .populate('patient', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments({}),
    ]);
    sendSuccess(res, paginatedResult(invoices, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

export const getStats = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [
      total_patients,
      total_appointments_today,
      pending_lab_orders,
      pending_radiology_orders,
      low_stock_items,
      revenueAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient', is_active: true }),
      Appointment.countDocuments({ scheduled_at: { $gte: todayStart, $lte: todayEnd } }),
      LabOrder.countDocuments({ status: 'pending' }),
      RadiologyOrder.countDocuments({ status: 'pending' }),
      InventoryItem.countDocuments({ $expr: { $lte: ['$quantity', '$low_stock_threshold'] } }),
      Invoice.aggregate([
        { $match: { status: 'paid', paid_at: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$total_due' } } },
      ]),
    ]);

    const total_revenue_today: number = revenueAgg[0]?.total ?? 0;

    sendSuccess(res, {
      total_patients,
      total_appointments_today,
      total_revenue_today,
      pending_lab_orders,
      pending_radiology_orders,
      low_stock_items,
    });
  } catch (err) {
    next(err);
  }
};

export const getDoctorReport = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doctors = await User.find({ role: 'doctor', is_active: true }).lean();

    const report = await Promise.all(
      doctors.map(async (doc) => {
        const [completedVisits, totalAppointments, uniquePatients, profile, ratingAgg] = await Promise.all([
          Appointment.countDocuments({ doctor: doc._id, status: 'completed' }),
          Appointment.countDocuments({ doctor: doc._id }),
          Appointment.distinct('patient', { doctor: doc._id }).then((p) => p.length),
          Profile.findOne({ user: doc._id }).lean(),
          Rating.aggregate([
            { $match: { doctor: doc._id } },
            { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
          ]),
        ]);
        const ratingData = ratingAgg[0] ?? null;
        return {
          doctor_id:        doc._id,
          name:             profile ? `${profile.first_name} ${profile.last_name}` : doc.username,
          specialty:        profile?.specialization ?? '',
          total_visits:     completedVisits,
          total_patients:   uniquePatients,
          avg_rating:       ratingData ? Math.round(ratingData.avg * 10) / 10 : null,
          rating_count:     ratingData?.count ?? 0,
          completion_rate:  totalAppointments > 0 ? Math.round((completedVisits / totalAppointments) * 100) / 100 : null,
        };
      }),
    );

    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getRevenueReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = revenueReportSchema.safeParse({ query: req.query });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { from, to } = parsed.data.query;
    const dateFilter: Record<string, any> = {};
    if (from) dateFilter.$gte = from;
    if (to) dateFilter.$lte = to;

    const matchStage: Record<string, any> = { status: 'paid' };
    if (Object.keys(dateFilter).length > 0) matchStage.paid_at = dateFilter;

    const [byDay, byMonth, byCategory] = await Promise.all([
      Invoice.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$paid_at' },
              month: { $month: '$paid_at' },
              day: { $dayOfMonth: '$paid_at' },
            },
            total: { $sum: '$total_due' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Invoice.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$paid_at' },
              month: { $month: '$paid_at' },
            },
            total: { $sum: '$total_due' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Invoice.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.category',
            total: { $sum: '$items.amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    sendSuccess(res, { by_day: byDay, by_month: byMonth, by_category: byCategory });
  } catch (err) {
    next(err);
  }
};

export const getRatingsReport = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [summaryAgg, perDoctor] = await Promise.all([
      Rating.aggregate([
        { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
      ]),
      Rating.aggregate([
        { $group: { _id: '$doctor', avg: { $avg: '$stars' }, count: { $sum: 1 } } },
        { $sort: { avg: -1, count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const doctorIds = perDoctor.map((d: any) => d._id);
    const profiles = await Profile.find({ user: { $in: doctorIds } })
      .select('user first_name last_name specialization')
      .lean();
    const pmap = new Map(profiles.map((p: any) => [p.user.toString(), p]));
    const top = perDoctor.map((d: any) => {
      const p = pmap.get(d._id.toString());
      return {
        doctor_id: d._id.toString(),
        name: p ? `Dr. ${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : 'Doctor',
        specialization: p?.specialization ?? '',
        avg: Math.round(d.avg * 10) / 10,
        count: d.count,
      };
    });

    const summary = summaryAgg[0] ?? { avg: null, count: 0 };
    sendSuccess(res, {
      avg: summary.avg ? Math.round(summary.avg * 10) / 10 : null,
      count: summary.count,
      top_doctors: top,
    });
  } catch (err) {
    next(err);
  }
};

// Roles that go through the admin approval flow. Patients are auto-approved on signup and
// admins are seeded — neither should appear on the Staff Registration Requests screen.
const STAFF_APPROVAL_ROLES = [
  'doctor', 'nurse', 'receptionist', 'pharmacist',
  'inventory_manager', 'lab_technician', 'radiology_technician', 'cashier',
];

export const getStaffRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status = 'pending' } = req.query as { status?: string };
    const users = await User.find({ approval_status: status, role: { $in: STAFF_APPROVAL_ROLES } })
      .select('-password -reset_token -reset_token_expires') // .lean() bypasses the model toJSON that normally strips these
      .sort({ createdAt: -1 })
      .lean();
    const profiles = await Profile.find({ user: { $in: users.map(u => u._id) } }).lean();
    const profileMap = Object.fromEntries(profiles.map(p => [p.user.toString(), p]));
    const result = users.map(u => ({ ...u, id: (u._id as any).toString(), profile: profileMap[(u._id as any).toString()] ?? null }));
    sendSuccess(res, { requests: result, total: result.length });
  } catch (err) {
    next(err);
  }
};

export const approveStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { is_active: true, is_approved: true, approval_status: 'approved' },
      { new: true }
    );
    if (!user) return sendError(res, 'User not found', 404);

    const profile = await Profile.findOne({ user: id }).lean();
    const displayName = profile ? `${(profile as any).first_name || ''} ${(profile as any).last_name || ''}`.trim() : user.email;

    // Fire-and-forget: don't hold the HTTP response on the SMTP round-trip.
    sendEmail(
      user.email,
      'Your registration has been approved',
      `<p>Congratulations! Your registration request for Siryan has been approved. You can now log in with your credentials.</p>`,
    ).catch(() => {});

    try {
      await Notification.create({
        user:    user._id,
        type:    'general',
        title:   'Account approved',
        message: 'Your registration has been approved. Welcome to Siryan!',
      });
    } catch { /* non-fatal */ }

    logAudit({ performedBy: req.user!.id, action: 'STAFF_APPROVED', resource: 'user', resourceId: id, req });
    sendSuccess(res, { user }, `${displayName || 'Staff'} approved successfully`);
  } catch (err) {
    next(err);
  }
};

export const rejectStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const user = await User.findByIdAndUpdate(
      id,
      { approval_status: 'rejected', rejection_reason: reason ?? '' },
      { new: true }
    );
    if (!user) return sendError(res, 'User not found', 404);

    await sendEmail(
      user.email,
      'Your registration request was not approved',
      `<p>We regret to inform you that your registration request for Siryan was not approved.${reason ? ` Reason: ${reason}` : ''}</p><p>If you believe this is an error, please contact support.</p>`,
    ).catch(() => {});

    logAudit({ performedBy: req.user!.id, action: 'STAFF_REJECTED', resource: 'user', resourceId: id, req });
    sendSuccess(res, null, 'Staff request rejected');
  } catch (err) {
    next(err);
  }
};

export const listInsuranceCompanies = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cached = await cache.get(CACHE_KEYS.INSURANCE_COMPANIES);
    if (cached) return sendSuccess(res, cached);

    const companies = await InsuranceCompany.find().sort({ name: 1 });
    await cache.set(CACHE_KEYS.INSURANCE_COMPANIES, companies, CACHE_TTL.INSURANCE_COMPANIES);
    sendSuccess(res, companies);
  } catch (err) {
    next(err);
  }
};

export const createInsuranceCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createInsuranceCompanySchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);
    const company = await InsuranceCompany.create(parsed.data.body);
    cache.del(CACHE_KEYS.INSURANCE_COMPANIES, CACHE_KEYS.INSURANCE_COMPANIES_ACTIVE);
    logAudit({ performedBy: req.user!.id, action: 'create_insurance_company', resource: 'insurance_company', resourceId: company._id.toString(), req });
    sendSuccess(res, company, 'Insurance company created', 201);
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'An insurance company with that name already exists', 409);
    next(err);
  }
};

export const updateInsuranceCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateInsuranceCompanySchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);
    const company = await InsuranceCompany.findByIdAndUpdate(req.params.id, parsed.data.body, { new: true, runValidators: true });
    if (!company) return sendError(res, 'Insurance company not found', 404);
    cache.del(CACHE_KEYS.INSURANCE_COMPANIES, CACHE_KEYS.INSURANCE_COMPANIES_ACTIVE);
    logAudit({ performedBy: req.user!.id, action: 'update_insurance_company', resource: 'insurance_company', resourceId: company._id.toString(), req });
    sendSuccess(res, company, 'Insurance company updated');
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'An insurance company with that name already exists', 409);
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

export const deleteInsuranceCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const company = await InsuranceCompany.findByIdAndDelete(req.params.id);
    if (!company) return sendError(res, 'Insurance company not found', 404);

    try {
      const affected = await Profile.find({ insurance_provider: company.name }).select('user').lean();
      if (affected.length > 0) {
        await Profile.updateMany(
          { insurance_provider: company.name },
          { $set: { insurance_provider: '', insurance_number: '', insurance_discount_pct: 0 } }
        );
        await Promise.all(
          affected.map(async (p) => {
            const userId = p.user.toString();
            await Notification.create({
              user: p.user,
              type: 'general',
              title: 'Insurance provider removed',
              message: 'Your insurance provider was removed because the company was deleted from the system.',
            });
            emitToUser(userId, 'notification:new', {
              title: 'Insurance provider removed',
              message: 'Your insurance provider was removed because the company was deleted from the system.',
            });
          })
        );
      }
    } catch { /* non-fatal */ }

    cache.del(CACHE_KEYS.INSURANCE_COMPANIES, CACHE_KEYS.INSURANCE_COMPANIES_ACTIVE);
    logAudit({ performedBy: req.user!.id, action: 'delete_insurance_company', resource: 'insurance_company', resourceId: req.params.id, req });
    sendSuccess(res, null, 'Insurance company deleted');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

// ─── Departments ─────────────────────────────────────────────────────────────

export const getDepartments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const filter = includeInactive ? {} : { is_active: true };
    const departments = await Department.find(filter).sort({ name: 1 }).lean();

    const doctorUserIds = await User.distinct('_id', { role: 'doctor', is_active: true });

    const result = await Promise.all(
      departments.map(async (dept) => {
        const doctor_count = await Profile.countDocuments({
          department: dept.name,
          user: { $in: doctorUserIds },
        });
        return {
          id: (dept._id as any).toString(),
          name: dept.name,
          description: dept.description ?? null,
          assigned_roles: dept.assigned_roles ?? [],
          is_active: dept.is_active ?? true,
          doctor_count,
        };
      }),
    );

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// Public (no-auth) — used by the staff registration form to fetch only the
// departments that accept the role the applicant selected.
export const getDepartmentsByRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = (req.query.role as string | undefined)?.trim();
    if (!role) return sendError(res, 'role query param is required', 400);

    const departments = await Department.find({ is_active: true, assigned_roles: role })
      .sort({ name: 1 })
      .lean();

    const result = departments.map((dept) => ({
      id: (dept._id as any).toString(),
      name: dept.name,
      description: dept.description ?? null,
      assigned_roles: dept.assigned_roles ?? [],
    }));

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const createDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createDepartmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const dept = await Department.create(parsed.data.body);
    sendSuccess(res, dept, 'Department created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_department', resource: 'department', resourceId: dept._id.toString(), req });
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'Department already exists', 409);
    next(err);
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateDepartmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const dept = await Department.findByIdAndUpdate(req.params.id, parsed.data.body, { new: true, runValidators: true });
    if (!dept) return sendError(res, 'Department not found', 404);

    sendSuccess(res, dept, 'Department updated');
    logAudit({ performedBy: req.user!.id, action: 'update_department', resource: 'department', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'Department already exists', 409);
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Soft delete — preserve the record (and any name references) but hide it
    // from the active lists used by the register form, booking, and admin UI.
    const dept = await Department.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!dept) return sendError(res, 'Department not found', 404);

    sendSuccess(res, null, 'Department deleted');
    logAudit({ performedBy: req.user!.id, action: 'delete_department', resource: 'department', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

// ─── Occupancy Report ─────────────────────────────────────────────────────────

export const getOccupancyReport = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rooms = await Room.find().lean();

    const byType: Record<string, { total_capacity: number; occupied: number; available: number; room_count: number }> = {};
    let overall_capacity = 0;
    let overall_occupied = 0;

    for (const room of rooms) {
      if (!byType[room.type]) byType[room.type] = { total_capacity: 0, occupied: 0, available: 0, room_count: 0 };
      byType[room.type].total_capacity += room.capacity;
      byType[room.type].occupied += room.current_occupancy;
      byType[room.type].room_count += 1;
      overall_capacity += room.capacity;
      overall_occupied += room.current_occupancy;
    }

    for (const type of Object.keys(byType)) {
      byType[type].available = byType[type].total_capacity - byType[type].occupied;
    }

    sendSuccess(res, {
      by_type: byType,
      overall: {
        total_capacity: overall_capacity,
        occupied: overall_occupied,
        available: overall_capacity - overall_occupied,
        occupancy_pct: overall_capacity > 0 ? Math.round((overall_occupied / overall_capacity) * 100) : 0,
      },
      rooms: rooms.map((r) => ({
        id: (r._id as any).toString(),
        name: r.name,
        type: r.type,
        status: r.status,
        floor: r.floor,
        capacity: r.capacity,
        current_occupancy: r.current_occupancy,
        available: r.capacity - r.current_occupancy,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Manual Invoice ───────────────────────────────────────────────────────────

export const createAdminInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createAdminInvoiceSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { patient_id, items, insurance_coverage, notes } = parsed.data.body;

    const patient = await User.findById(patient_id).lean();
    if (!patient) return sendError(res, 'Patient not found', 404);

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const coverage = insurance_coverage ?? 0;
    const total_due = subtotal - coverage;

    const invoice = await Invoice.create({
      patient: patient_id,
      items,
      subtotal,
      insurance_coverage: coverage,
      total_due,
      status: 'unpaid',
      issued_by: req.user!.id,
      notes,
    });

    try {
      emitToRole('admin', 'invoice:new', { invoice_id: invoice._id.toString(), patient_id });
    } catch { /* non-fatal */ }

    sendSuccess(res, invoice, 'Invoice created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_invoice_manual', resource: 'invoice', resourceId: invoice._id.toString(), details: `patient=${patient_id}, total_due=${total_due}`, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

// ─── Pharmacy Report ──────────────────────────────────────────────────────────

export const getPharmacyReport = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [summaryAgg, topMedAgg, lowStockCount] = await Promise.all([
      PharmacyOrder.aggregate([
        { $match: { status: 'dispensed' } },
        { $group: { _id: null, total_orders: { $sum: 1 }, total_revenue: { $sum: '$total_amount' } } },
      ]),
      PharmacyOrder.aggregate([
        { $match: { status: 'dispensed' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.medication',
            total_qty: { $sum: '$items.quantity' },
            total_revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          },
        },
        { $sort: { total_qty: -1 } },
        { $limit: 10 },
      ]),
      Medication.countDocuments({ $expr: { $lte: ['$stock_quantity', '$low_stock_threshold'] } }),
    ]);

    const medIds = topMedAgg.map((m: any) => m._id);
    const medications = await Medication.find({ _id: { $in: medIds } }).select('_id name category').lean();
    const medMap = new Map(medications.map((m: any) => [m._id.toString(), m]));

    const top_medications = topMedAgg.map((m: any) => {
      const med = medMap.get(m._id.toString());
      return {
        medication_id: m._id.toString(),
        name: med?.name ?? 'Unknown',
        category: med?.category ?? '',
        total_qty_dispensed: m.total_qty,
        total_revenue: m.total_revenue,
      };
    });

    const summary = summaryAgg[0] ?? { total_orders: 0, total_revenue: 0 };

    sendSuccess(res, {
      summary: { total_orders: summary.total_orders, total_revenue: summary.total_revenue },
      top_medications,
      low_stock_count: lowStockCount,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Appointments Oversight ───────────────────────────────────────────────────

export const getAdminAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, date, search } = req.query as Record<string, string | undefined>;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end   = new Date(date); end.setHours(23, 59, 59, 999);
      filter.scheduled_at = { $gte: start, $lte: end };
    }

    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .sort({ scheduled_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(filter),
    ]);

    const userIds = [
      ...appointments.map((a) => a.patient.toString()),
      ...appointments.map((a) => a.doctor.toString()),
    ];
    const profiles = await Profile.find({ user: { $in: userIds } })
      .select('user first_name last_name')
      .lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    let results = appointments.map((a) => {
      const patientProfile = profileMap.get(a.patient.toString());
      const doctorProfile  = profileMap.get(a.doctor.toString());
      return {
        id:           (a._id as any).toString(),
        patient_id:   a.patient.toString(),
        patient_name: patientProfile ? `${patientProfile.first_name ?? ''} ${patientProfile.last_name ?? ''}`.trim() : 'Unknown',
        doctor_id:    a.doctor.toString(),
        doctor_name:  doctorProfile  ? `${doctorProfile.first_name  ?? ''} ${doctorProfile.last_name  ?? ''}`.trim() : 'Unknown',
        type:         a.type,
        scheduled_at: a.scheduled_at,
        status:       a.status,
        reason:       a.reason,
        cancel_reason: a.cancel_reason,
        fee:          a.fee,
        createdAt:    (a as any).createdAt,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (r) => r.patient_name.toLowerCase().includes(q) || r.doctor_name.toLowerCase().includes(q)
      );
    }

    sendSuccess(res, paginatedResult(results, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

export const cancelAdminAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelAdminAppointmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    if (appointment.status === 'cancelled') return sendError(res, 'Appointment is already cancelled', 400);
    if (appointment.status === 'completed') return sendError(res, 'Cannot cancel a completed appointment', 400);

    appointment.status = 'cancelled';
    appointment.cancel_reason = parsed.data.body.reason;
    await appointment.save();

    const notifPayload = {
      type: 'general' as const,
      title: 'Appointment cancelled',
      message: `Your appointment has been cancelled by administration. Reason: ${parsed.data.body.reason}`,
    };
    try {
      await Promise.all([
        Notification.create({ user: appointment.patient, ...notifPayload }),
        Notification.create({ user: appointment.doctor,  ...notifPayload }),
      ]);
      emitToUser(appointment.patient.toString(), 'notification:new', notifPayload);
      emitToUser(appointment.doctor.toString(),  'notification:new', notifPayload);
    } catch { /* non-fatal */ }

    sendSuccess(res, appointment, 'Appointment cancelled');
    logAudit({ performedBy: req.user!.id, action: 'cancel_appointment_admin', resource: 'appointment', resourceId: req.params.id, details: parsed.data.body.reason, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

// ─── Staff Profile Edit ───────────────────────────────────────────────────────

export const updateUserProfileAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateUserProfileAdminSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const updates: Record<string, any> = {};
    const { first_name, last_name, phone, department, specialization, shift } = parsed.data.body;
    if (first_name     !== undefined) updates.first_name     = first_name;
    if (last_name      !== undefined) updates.last_name      = last_name;
    if (phone          !== undefined) updates.phone          = phone;
    if (department     !== undefined) updates.department     = department;
    if (specialization !== undefined) updates.specialization = specialization;
    if (shift          !== undefined) updates.shift          = shift;

    const profile = await Profile.findOneAndUpdate(
      { user: req.params.id },
      { $set: updates },
      { new: true }
    );
    if (!profile) return sendError(res, 'Profile not found', 404);

    sendSuccess(res, profile, 'Profile updated');
    logAudit({ performedBy: req.user!.id, action: 'update_staff_profile', resource: 'profile', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

// ─── Section 4: Department Assignments ───────────────────────────────────────

export const assignStaffDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = assignDepartmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const profile = await Profile.findOneAndUpdate(
      { user: req.params.id },
      { $set: { department: parsed.data.body.department } },
      { new: true }
    );
    if (!profile) return sendError(res, 'Profile not found', 404);

    sendSuccess(res, profile, 'Department assigned');
    logAudit({ performedBy: req.user!.id, action: 'assign_department', resource: 'profile', resourceId: req.params.id, details: `department=${parsed.data.body.department}`, req });
    emitToUser(req.params.id, 'department:updated', { department: parsed.data.body.department });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

export const getDepartmentStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dept = await Department.findById(req.params.id).lean();
    if (!dept) return sendError(res, 'Department not found', 404);

    const profiles = await Profile.find({ department: dept.name })
      .populate('user', 'username email role is_active')
      .lean();

    const grouped: Record<string, any[]> = {};
    for (const p of profiles) {
      const user = p.user as any;
      const role: string = user?.role ?? 'unknown';
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push({ ...p, id: (p._id as any).toString() });
    }

    sendSuccess(res, { department: dept.name, staff: grouped });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid department ID', 400);
    next(err);
  }
};

// ─── Section 5: Doctor Schedule Management ───────────────────────────────────

// Standard clinic working hours used to derive "available" slots.
// Any working hour that is not booked or blocked is surfaced as available.
const WORK_START_HOUR = 9;             // 09:00
const WORK_END_HOUR = 17;              // 17:00 (exclusive)
const WORKING_DAY_INDICES = [0, 1, 2, 3, 4]; // Mon–Fri (Mon = 0)
const ACTIVE_APPT_STATUSES = ['pending', 'confirmed', 'checked_in', 'rescheduled'];

const pad2 = (n: number) => String(n).padStart(2, '0');

// Format a Date using LOCAL components so the YYYY-MM-DD matches the strings
// produced by the <input type="date"> the admin uses to block slots.
const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Monday-based weekday index for a local date.
const mondayIndex = (d: Date): number => (d.getDay() + 6) % 7;

interface ScheduleSlotOut {
  id: string;
  date: string;
  time_slot: string;
  type: 'available' | 'booked' | 'blocked';
  appointment_id?: string;
  patient_name?: string;
}

// Returns the Mon–Sun window containing `anchor` (a YYYY-MM-DD date string), or
// the current week when no anchor is given, plus the list of date strings.
function currentWeek(anchor?: string) {
  const base = anchor ? new Date(`${anchor}T00:00:00`) : new Date();
  const valid = isNaN(base.getTime()) ? new Date() : base;
  const weekStart = new Date(valid);
  weekStart.setDate(valid.getDate() - mondayIndex(valid));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return toLocalDateStr(d);
  });
  return { weekStart, weekEnd, weekDates };
}

// Builds the unified slot list (available + booked + blocked) for one doctor
// over the given week. Available slots are derived from standard working hours
// minus anything already booked or blocked.
async function buildDoctorWeekSlots(
  doctorUserId: any,
  weekStart: Date,
  weekEnd: Date,
  weekDates: string[],
): Promise<ScheduleSlotOut[]> {
  const [blockedSlots, appointments] = await Promise.all([
    BlockedSlot.find({ doctor: doctorUserId, date: { $in: weekDates } }).sort({ start_hour: 1 }).lean(),
    Appointment.find({
      doctor: doctorUserId,
      scheduled_at: { $gte: weekStart, $lt: weekEnd },
      status: { $in: ACTIVE_APPT_STATUSES },
    }).lean(),
  ]);

  // Resolve patient display names from Profile (first + last) so they match the
  // names shown/searched on the admin appointments page (deep-link target).
  const patientIds = appointments.map((a) => (a.patient as any).toString());
  const patientProfiles = patientIds.length
    ? await Profile.find({ user: { $in: patientIds } }).select('user first_name last_name').lean()
    : [];
  const nameByPatient: Record<string, string> = {};
  for (const pr of patientProfiles) {
    nameByPatient[(pr.user as any).toString()] = `${pr.first_name ?? ''} ${pr.last_name ?? ''}`.trim();
  }

  const blockedByDate: Record<string, Array<{ start: number; end: number; id: string }>> = {};
  for (const bs of blockedSlots) {
    (blockedByDate[bs.date] ??= []).push({ start: bs.start_hour, end: bs.end_hour, id: (bs._id as any).toString() });
  }

  const apptByDate: Record<string, any[]> = {};
  const bookedHoursByDate: Record<string, Set<number>> = {};
  for (const appt of appointments) {
    const d = new Date(appt.scheduled_at);
    const dateStr = toLocalDateStr(d);
    (apptByDate[dateStr] ??= []).push(appt);
    (bookedHoursByDate[dateStr] ??= new Set()).add(d.getHours());
  }

  const slots: ScheduleSlotOut[] = [];

  for (const dateStr of weekDates) {
    const [y, m, day] = dateStr.split('-').map(Number);
    const dayIdx = mondayIndex(new Date(y, m - 1, day));
    const blocked = blockedByDate[dateStr] ?? [];
    const bookedHours = bookedHoursByDate[dateStr] ?? new Set<number>();

    // Available — working days/hours not already booked or blocked
    if (WORKING_DAY_INDICES.includes(dayIdx)) {
      for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h++) {
        const isBlocked = blocked.some((b) => h >= b.start && h < b.end);
        if (isBlocked || bookedHours.has(h)) continue;
        slots.push({
          id: `avail-${dateStr}-${h}`,
          date: dateStr,
          time_slot: `${pad2(h)}:00–${pad2(h + 1)}:00`,
          type: 'available',
        });
      }
    }

    for (const b of blocked) {
      slots.push({
        id: b.id,
        date: dateStr,
        time_slot: `${pad2(b.start)}:00–${pad2(b.end)}:00`,
        type: 'blocked',
      });
    }

    for (const appt of apptByDate[dateStr] ?? []) {
      const d = new Date(appt.scheduled_at);
      const patientId = (appt.patient as any).toString();
      slots.push({
        id: (appt._id as any).toString(),
        date: dateStr,
        time_slot: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
        type: 'booked',
        appointment_id: (appt._id as any).toString(),
        patient_name: nameByPatient[patientId] || 'Patient',
      });
    }
  }

  // Surface events (booked, then blocked) ahead of available within each day.
  const priority: Record<string, number> = { booked: 0, blocked: 1, available: 2 };
  slots.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (priority[a.type] !== priority[b.type]) return priority[a.type] - priority[b.type];
    return a.time_slot.localeCompare(b.time_slot);
  });

  return slots;
}

export const getDoctorSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' }).select('_id').lean();
    if (!doctor) return sendError(res, 'Doctor not found', 404);

    const profile = await Profile.findOne({ user: req.params.id })
      .select('first_name last_name shift specialization department').lean();

    const { weekStart, weekEnd, weekDates } = currentWeek((req.query.week as string) || undefined);
    const slots = await buildDoctorWeekSlots(req.params.id, weekStart, weekEnd, weekDates);

    sendSuccess(res, {
      doctor_id: req.params.id,
      doctor_name: `Dr. ${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim(),
      department: profile?.department ?? '',
      specialization: profile?.specialization ?? '',
      shift: profile?.shift ?? '',
      slots,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid doctor ID', 400);
    next(err);
  }
};

export const overrideDoctorSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = overrideDoctorScheduleSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' }).select('_id').lean();
    if (!doctor) return sendError(res, 'Doctor not found', 404);

    const { shift, date, start_hour, end_hour, reason, blocked_slots } = parsed.data.body;

    if (shift !== undefined) {
      await Profile.findOneAndUpdate({ user: req.params.id }, { $set: { shift } });
    }

    // Legacy full-replace path
    if (blocked_slots !== undefined) {
      await BlockedSlot.deleteMany({ doctor: req.params.id });
      if (blocked_slots.length > 0) {
        await BlockedSlot.insertMany(blocked_slots.map((s) => ({ doctor: req.params.id, ...s })));
      }
    }

    // Add a single blocked slot (the UI's "Block Slot" action)
    if (date !== undefined && start_hour !== undefined) {
      const end = end_hour ?? start_hour + 1;
      if (end <= start_hour) return sendError(res, 'end_hour must be after start_hour', 422);
      await BlockedSlot.create({ doctor: req.params.id, date, start_hour, end_hour: end, reason });
    }

    cache.del(CACHE_KEYS.DOCTOR_SCHEDULE(req.params.id));

    const { weekStart, weekEnd, weekDates } = currentWeek();
    const slots = await buildDoctorWeekSlots(req.params.id, weekStart, weekEnd, weekDates);
    const updatedProfile = await Profile.findOne({ user: req.params.id })
      .select('first_name last_name shift specialization department').lean();

    sendSuccess(res, {
      doctor_id: req.params.id,
      doctor_name: `Dr. ${updatedProfile?.first_name ?? ''} ${updatedProfile?.last_name ?? ''}`.trim(),
      department: updatedProfile?.department ?? '',
      specialization: updatedProfile?.specialization ?? '',
      shift: updatedProfile?.shift ?? '',
      slots,
    }, 'Schedule updated');
    logAudit({ performedBy: req.user!.id, action: 'override_doctor_schedule', resource: 'doctor', resourceId: req.params.id, req });

    try {
      await Notification.create({
        user: req.params.id,
        type: 'general',
        title: 'Schedule Updated',
        message: 'An administrator has updated your schedule.',
      });
      emitToUser(req.params.id, 'notification:new', {
        title: 'Schedule Updated',
        message: 'An administrator has updated your schedule.',
      });
      emitToUser(req.params.id, 'schedule:updated', { shift: updatedProfile?.shift });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid doctor ID', 400);
    next(err);
  }
};

export const deleteDoctorScheduleSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { slot_id } = req.query as { slot_id?: string };
    if (!slot_id) return sendError(res, 'slot_id query param is required', 400);

    const slot = await BlockedSlot.findOneAndDelete({ _id: slot_id, doctor: req.params.id });
    if (!slot) return sendError(res, 'Slot not found', 404);

    cache.del(CACHE_KEYS.DOCTOR_SCHEDULE(req.params.id));
    sendSuccess(res, null, 'Slot removed');
    logAudit({ performedBy: req.user!.id, action: 'delete_schedule_slot', resource: 'blocked_slot', resourceId: slot_id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

export const getAllSchedules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { department, week } = req.query as Record<string, string | undefined>;

    const doctorUserIds = await User.distinct('_id', { role: 'doctor', is_active: true });

    const profileFilter: Record<string, any> = { user: { $in: doctorUserIds } };
    if (department) {
      // The frontend sends the Department _id, but Profile.department stores the
      // department NAME — resolve the id to its name (fall back to a raw name).
      let deptName = department;
      if (/^[0-9a-fA-F]{24}$/.test(department)) {
        const deptDoc = await Department.findById(department).select('name').lean();
        if (deptDoc) deptName = deptDoc.name;
      }
      profileFilter.department = deptName;
    }

    const profiles = await Profile.find(profileFilter)
      .select('user first_name last_name shift specialization department')
      .lean();

    const { weekStart, weekEnd, weekDates } = currentWeek(week || undefined);

    const result = await Promise.all(
      profiles.map(async (p) => ({
        doctor_id: (p.user as any).toString(),
        doctor_name: `Dr. ${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        shift: p.shift ?? '',
        specialization: p.specialization ?? '',
        department: p.department ?? '',
        slots: await buildDoctorWeekSlots(p.user, weekStart, weekEnd, weekDates),
      }))
    );

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// ─── Section 6: Shift Management ─────────────────────────────────────────────

export const getShifts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { department, role } = req.query as Record<string, string | undefined>;

    let userFilter: Record<string, any> = {};
    if (role) userFilter.role = role;

    const userIds = role
      ? await User.distinct('_id', userFilter)
      : null;

    const shiftFilter: Record<string, any> = {};
    if (userIds) shiftFilter.user = { $in: userIds };
    if (department) shiftFilter.department = department;

    const shifts = await Shift.find(shiftFilter)
      .populate({ path: 'user', select: 'username email role' })
      .sort({ start_date: 1 })
      .lean();

    const grouped: Record<string, any[]> = {};
    for (const s of shifts) {
      const dept = (s.department as string) || 'Unassigned';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push({ ...s, id: (s._id as any).toString() });
    }

    sendSuccess(res, { shifts: grouped, total: shifts.length });
  } catch (err) {
    next(err);
  }
};

export const assignShift = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = assignShiftSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { user_id, shift_type, start_date, end_date, department, notes } = parsed.data.body;

    const user = await User.findById(user_id).lean();
    if (!user) return sendError(res, 'User not found', 404);

    const conflict = await Shift.findOne({
      user: user_id,
      start_date: { $lte: end_date },
      end_date:   { $gte: start_date },
    });
    if (conflict) return sendError(res, 'Shift conflict: staff already has a shift in this period', 409);

    const shift = await Shift.create({ user: user_id, shift_type, start_date, end_date, department, notes });

    try {
      await Notification.create({
        user: user_id,
        type: 'general',
        title: 'Shift Assigned',
        message: `You have been assigned a ${shift_type} shift from ${start_date.toDateString()} to ${end_date.toDateString()}.`,
      });
      emitToUser(user_id, 'notification:new', { title: 'Shift Assigned', message: `${shift_type} shift assigned.` });
    } catch { /* non-fatal */ }

    sendSuccess(res, shift, 'Shift assigned', 201);
    logAudit({ performedBy: req.user!.id, action: 'assign_shift', resource: 'shift', resourceId: (shift._id as any).toString(), details: `user=${user_id}, type=${shift_type}`, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

export const updateShift = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateShiftSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const shift = await Shift.findByIdAndUpdate(req.params.id, { $set: parsed.data.body }, { new: true });
    if (!shift) return sendError(res, 'Shift not found', 404);

    sendSuccess(res, shift, 'Shift updated');
    logAudit({ performedBy: req.user!.id, action: 'update_shift', resource: 'shift', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid shift ID', 400);
    next(err);
  }
};

export const deleteShift = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) return sendError(res, 'Shift not found', 404);

    sendSuccess(res, null, 'Shift removed');
    logAudit({ performedBy: req.user!.id, action: 'delete_shift', resource: 'shift', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid shift ID', 400);
    next(err);
  }
};

export const getTodayShifts = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const shifts = await Shift.find({
      start_date: { $lte: todayEnd },
      end_date:   { $gte: today },
    })
      .populate({ path: 'user', select: 'username email role' })
      .lean();

    const grouped: Record<string, any[]> = {};
    for (const s of shifts) {
      const dept = (s.department as string) || 'Unassigned';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push({ ...s, id: (s._id as any).toString() });
    }

    sendSuccess(res, { shifts: grouped, total: shifts.length });
  } catch (err) {
    next(err);
  }
};

// ─── Section 7: Pricing Management ───────────────────────────────────────────

export const getPricingAdmin = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await PricingSettings.findOneAndUpdate({}, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
    sendSuccess(res, settings);
  } catch (err) {
    next(err);
  }
};

export const getPublicPricing = async (_req: any, res: Response, next: NextFunction) => {
  try {
    const cached = await cache.get(CACHE_KEYS.PRICING_SETTINGS);
    if (cached) return sendSuccess(res, cached);

    const settings = await PricingSettings.findOne().lean();
    if (settings) {
      cache.set(CACHE_KEYS.PRICING_SETTINGS, settings, CACHE_TTL.PRICING_SETTINGS);
    }
    sendSuccess(res, settings);
  } catch (err) {
    next(err);
  }
};

export const updatePricing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updatePricingSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const previous = await PricingSettings.findOne().lean();

    const updateOps: Record<string, any> = {};
    const body = parsed.data.body;
    if (body.appointments) {
      if (body.appointments.online_fee !== undefined)   updateOps['appointments.online_fee']   = body.appointments.online_fee;
      if (body.appointments.physical_fee !== undefined) updateOps['appointments.physical_fee'] = body.appointments.physical_fee;
    }
    if (body.rooms) {
      if (body.rooms.general_per_day !== undefined)   updateOps['rooms.general_per_day']   = body.rooms.general_per_day;
      if (body.rooms.icu_per_day !== undefined)       updateOps['rooms.icu_per_day']       = body.rooms.icu_per_day;
      if (body.rooms.operation_per_day !== undefined) updateOps['rooms.operation_per_day'] = body.rooms.operation_per_day;
      if (body.rooms.radiology_per_day !== undefined) updateOps['rooms.radiology_per_day'] = body.rooms.radiology_per_day;
    }
    if (body.pharmacy?.delivery_fee !== undefined) {
      updateOps['pharmacy.delivery_fee'] = body.pharmacy.delivery_fee;
    }

    const updated = await PricingSettings.findOneAndUpdate(
      {},
      { $set: updateOps },
      { new: true, upsert: true }
    );

    cache.del(CACHE_KEYS.PRICING_SETTINGS);
    for (const r of ALL_ROLES) emitToRole(r, 'pricing_updated', updated);

    sendSuccess(res, updated, 'Pricing updated');
    logAudit({ performedBy: req.user!.id, action: 'update_pricing', resource: 'pricing_settings', details: JSON.stringify({ previous: previous ?? {}, updated: updateOps }), req });
  } catch (err) {
    next(err);
  }
};

export const addLabTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = addLabTestSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { test_name, price } = parsed.data.body;

    const existing = await PricingSettings.findOne({ 'lab.test_name': test_name });
    if (existing) return sendError(res, 'Lab test already exists', 409);

    const updated = await PricingSettings.findOneAndUpdate(
      {},
      { $push: { lab: { test_name, price } } },
      { new: true, upsert: true }
    );

    cache.del(CACHE_KEYS.PRICING_SETTINGS);
    sendSuccess(res, updated, 'Lab test added');
    logAudit({ performedBy: req.user!.id, action: 'add_lab_test', resource: 'pricing_settings', details: `test=${test_name}, price=${price}`, req });
  } catch (err) {
    next(err);
  }
};

export const updateLabTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateLabTestPriceSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const test_name = decodeURIComponent(req.params.test_name);
    const updated = await PricingSettings.findOneAndUpdate(
      { 'lab.test_name': test_name },
      { $set: { 'lab.$.price': parsed.data.body.price } },
      { new: true }
    );
    if (!updated) return sendError(res, 'Lab test not found', 404);

    cache.del(CACHE_KEYS.PRICING_SETTINGS);
    sendSuccess(res, updated, 'Lab test price updated');
    logAudit({ performedBy: req.user!.id, action: 'update_lab_test', resource: 'pricing_settings', details: `test=${test_name}`, req });
  } catch (err) {
    next(err);
  }
};

export const deleteLabTest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const test_name = decodeURIComponent(req.params.test_name);

    const pending = await LabOrder.countDocuments({ test_name, status: { $in: ['pending', 'in_progress'] } });
    if (pending > 0) return sendError(res, `Cannot delete: ${pending} pending lab order(s) use this test`, 409);

    const updated = await PricingSettings.findOneAndUpdate(
      {},
      { $pull: { lab: { test_name } } },
      { new: true }
    );

    cache.del(CACHE_KEYS.PRICING_SETTINGS);
    sendSuccess(res, updated, 'Lab test removed');
    logAudit({ performedBy: req.user!.id, action: 'delete_lab_test', resource: 'pricing_settings', details: `test=${test_name}`, req });
  } catch (err) {
    next(err);
  }
};

export const addRadiologyScan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = addRadiologyScanSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { scan_type, price } = parsed.data.body;

    const existing = await PricingSettings.findOne({ 'radiology.scan_type': scan_type });
    if (existing) return sendError(res, 'Radiology scan type already exists', 409);

    const updated = await PricingSettings.findOneAndUpdate(
      {},
      { $push: { radiology: { scan_type, price } } },
      { new: true, upsert: true }
    );

    cache.del(CACHE_KEYS.PRICING_SETTINGS);
    sendSuccess(res, updated, 'Radiology scan added');
    logAudit({ performedBy: req.user!.id, action: 'add_radiology_scan', resource: 'pricing_settings', details: `scan=${scan_type}, price=${price}`, req });
  } catch (err) {
    next(err);
  }
};

export const updateRadiologyScan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateRadiologyScanPriceSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const scan_type = decodeURIComponent(req.params.scan_type);
    const updated = await PricingSettings.findOneAndUpdate(
      { 'radiology.scan_type': scan_type },
      { $set: { 'radiology.$.price': parsed.data.body.price } },
      { new: true }
    );
    if (!updated) return sendError(res, 'Radiology scan type not found', 404);

    cache.del(CACHE_KEYS.PRICING_SETTINGS);
    sendSuccess(res, updated, 'Radiology scan price updated');
    logAudit({ performedBy: req.user!.id, action: 'update_radiology_scan', resource: 'pricing_settings', details: `scan=${scan_type}`, req });
  } catch (err) {
    next(err);
  }
};

export const deleteRadiologyScan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scan_type = decodeURIComponent(req.params.scan_type);

    const pending = await RadiologyOrder.countDocuments({ scan_type, status: { $in: ['pending', 'in_progress'] } });
    if (pending > 0) return sendError(res, `Cannot delete: ${pending} pending radiology order(s) use this scan type`, 409);

    const updated = await PricingSettings.findOneAndUpdate(
      {},
      { $pull: { radiology: { scan_type } } },
      { new: true }
    );

    cache.del(CACHE_KEYS.PRICING_SETTINGS);
    sendSuccess(res, updated, 'Radiology scan type removed');
    logAudit({ performedBy: req.user!.id, action: 'delete_radiology_scan', resource: 'pricing_settings', details: `scan=${scan_type}`, req });
  } catch (err) {
    next(err);
  }
};

// ─── Section 8: System Announcements ─────────────────────────────────────────

const ALL_ROLES = ['patient', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'inventory_manager', 'lab_technician', 'radiology_technician', 'cashier', 'admin'];

export const createAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createAnnouncementSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { title, message, target_roles, priority } = parsed.data.body;
    const announcement = await Announcement.create({
      title,
      message,
      target_roles,
      priority,
      created_by: req.user!.id,
    });

    const roles = target_roles.length > 0 ? target_roles : ALL_ROLES;
    const payload = {
      _id: (announcement._id as any).toString(),
      title: announcement.title,
      message: announcement.message,
      target_roles: announcement.target_roles,
      is_urgent: announcement.priority === 'urgent',
      createdAt: (announcement as any).createdAt,
      created_by: { name: (req.user as any).username ?? 'Admin' },
    };
    for (const role of roles) {
      emitToRole(role, 'announcement:new', payload);
    }

    try {
      const targetFilter = target_roles.length > 0 ? { role: { $in: target_roles } } : {};
      const targetUsers = await User.find(targetFilter).select('_id').lean();
      await Notification.insertMany(
        targetUsers.map((u) => ({
          user: u._id,
          type: 'general',
          title,
          message,
        }))
      );
    } catch { /* non-fatal */ }

    sendSuccess(res, announcement, 'Announcement created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_announcement', resource: 'announcement', resourceId: (announcement._id as any).toString(), req });
  } catch (err) {
    next(err);
  }
};

export const getAnnouncements = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const announcements = await Announcement.find()
      .populate('created_by', 'username')
      .sort({ createdAt: -1 });
    sendSuccess(res, announcements);
  } catch (err) {
    next(err);
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return sendError(res, 'Announcement not found', 404);

    sendSuccess(res, null, 'Announcement deleted');
    logAudit({ performedBy: req.user!.id, action: 'delete_announcement', resource: 'announcement', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid announcement ID', 400);
    next(err);
  }
};

// ─── Section 9: Maintenance Mode ─────────────────────────────────────────────

export const enableMaintenance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = enableMaintenanceSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { message, estimated_duration } = parsed.data.body;
    const payload = { message, estimated_duration, enabled_at: new Date().toISOString() };

    if (redisClient.isReady) await redisClient.set('system:maintenance', JSON.stringify(payload));

    for (const role of ALL_ROLES) {
      emitToRole(role, 'system_maintenance', payload);
    }

    sendSuccess(res, {
      is_active: true,
      message,
      estimated_duration,
      started_at: payload.enabled_at,
    }, 'Maintenance mode enabled');
    logAudit({ performedBy: req.user!.id, action: 'enable_maintenance', resource: 'system', details: message, req });
  } catch (err) {
    next(err);
  }
};

export const disableMaintenance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (redisClient.isReady) await redisClient.del('system:maintenance');

    for (const role of ALL_ROLES) {
      emitToRole(role, 'system_online', { message: 'System is back online.' });
    }

    sendSuccess(res, null, 'Maintenance mode disabled');
    logAudit({ performedBy: req.user!.id, action: 'disable_maintenance', resource: 'system', req });
  } catch (err) {
    next(err);
  }
};

export const getMaintenanceStatus = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const raw = redisClient.isReady ? await redisClient.get('system:maintenance').catch(() => null) : null;
    if (raw) {
      const data = JSON.parse(raw);
      sendSuccess(res, {
        is_active: true,
        message: data.message,
        estimated_duration: data.estimated_duration,
        started_at: data.enabled_at,
      });
    } else {
      sendSuccess(res, { is_active: false });
    }
  } catch (err) {
    next(err);
  }
};

// ─── Section 10: Email Templates ─────────────────────────────────────────────

export const getEmailTemplates = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const templates = await EmailTemplate.find().sort({ name: 1 });
    sendSuccess(res, templates);
  } catch (err) {
    next(err);
  }
};

export const updateEmailTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateEmailTemplateSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const template = await EmailTemplate.findOneAndUpdate(
      { name: req.params.name },
      { $set: parsed.data.body },
      { new: true }
    );
    if (!template) return sendError(res, 'Email template not found', 404);

    sendSuccess(res, template, 'Template updated');
    logAudit({ performedBy: req.user!.id, action: 'update_email_template', resource: 'email_template', details: `name=${req.params.name}`, req });
  } catch (err) {
    next(err);
  }
};

// ─── Section 11: Data Export (GDPR) ──────────────────────────────────────────

export const exportPatientData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = exportPatientDataSchema.safeParse({ query: req.query });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { format } = parsed.data.query;
    const patientId = req.params.id;

    const patient = await User.findById(patientId).lean();
    if (!patient) return sendError(res, 'Patient not found', 404);

    const [profile, appointments, medicalRecords, labOrders, radiologyOrders, prescriptions, invoices] = await Promise.all([
      Profile.findOne({ user: patientId }).lean(),
      Appointment.find({ patient: patientId }).lean(),
      MedicalRecord.find({ patient: patientId }).lean(),
      LabOrder.find({ patient: patientId }).lean(),
      RadiologyOrder.find({ patient: patientId }).lean(),
      Prescription.find({ patient: patientId }).lean(),
      Invoice.find({ patient: patientId }).lean(),
    ]);

    const exportData = { patient, profile, appointments, medical_records: medicalRecords, lab_orders: labOrders, radiology_orders: radiologyOrders, prescriptions, invoices };

    logAudit({ performedBy: req.user!.id, action: 'export_patient_data', resource: 'patient', resourceId: patientId, details: `format=${format}`, req });

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="patient_${patientId}.pdf"`);
      doc.pipe(res);

      doc.fontSize(20).text('Patient Data Export — Siryan Hospital', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Patient: ${(profile as any)?.first_name ?? ''} ${(profile as any)?.last_name ?? ''} (${(patient as any).email})`);
      doc.text(`Export Date: ${new Date().toLocaleString()}`);
      doc.moveDown();
      doc.fontSize(12).text('Profile:', { underline: true });
      doc.text(JSON.stringify(profile, null, 2));
      doc.addPage();
      doc.fontSize(12).text(`Appointments (${appointments.length}):`, { underline: true });
      doc.text(JSON.stringify(appointments, null, 2));
      doc.addPage();
      doc.text(`Medical Records (${medicalRecords.length}):`, { underline: true });
      doc.text(JSON.stringify(medicalRecords, null, 2));
      doc.addPage();
      doc.text(`Lab Orders (${labOrders.length}):`, { underline: true });
      doc.text(JSON.stringify(labOrders, null, 2));
      doc.addPage();
      doc.text(`Radiology Orders (${radiologyOrders.length}):`, { underline: true });
      doc.text(JSON.stringify(radiologyOrders, null, 2));
      doc.addPage();
      doc.text(`Prescriptions (${prescriptions.length}):`, { underline: true });
      doc.text(JSON.stringify(prescriptions, null, 2));
      doc.addPage();
      doc.text(`Invoices (${invoices.length}):`, { underline: true });
      doc.text(JSON.stringify(invoices, null, 2));

      doc.end();
      return;
    }

    sendSuccess(res, exportData, 'Patient data exported');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const getDeletionRequests = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await DeletionRequest.find({ status: 'pending' })
      .populate('patient', 'username email')
      .sort({ createdAt: -1 });
    sendSuccess(res, requests);
  } catch (err) {
    next(err);
  }
};

export const approveDeletion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await DeletionRequest.findById(req.params.id).populate('patient');
    if (!request) return sendError(res, 'Deletion request not found', 404);
    if (request.status !== 'pending') return sendError(res, 'Request already processed', 400);

    const patientId = (request.patient as any)._id ?? request.patient;

    const pendingAppts = await Appointment.countDocuments({
      patient: patientId,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (pendingAppts > 0)
      return sendError(res, `Cannot approve: patient has ${pendingAppts} pending appointment(s)`, 400);

    const unpaidInvoices = await Invoice.countDocuments({
      patient: patientId,
      status: { $in: ['unpaid', 'partial'] },
    });
    if (unpaidInvoices > 0)
      return sendError(res, `Cannot approve: patient has ${unpaidInvoices} unpaid invoice(s)`, 400);

    // Anonymize user
    await User.findByIdAndUpdate(patientId, {
      username: `deleted_${patientId}`,
      email: `anon_${patientId}@deleted.com`,
      is_active: false,
    });

    // Clear PII from profile (keep non-PII for record integrity)
    await Profile.findOneAndUpdate(
      { user: patientId },
      {
        $set: {
          first_name: 'Deleted',
          last_name: 'User',
          phone: '',
          national_id: '',
          address: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          date_of_birth: null,
          avatar_url: '',
        },
      }
    );

    await DeletionRequest.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      processed_by: req.user!.id,
      processed_at: new Date(),
    });

    sendSuccess(res, null, 'Patient data anonymized');
    logAudit({ performedBy: req.user!.id, action: 'approve_deletion_request', resource: 'patient', resourceId: patientId.toString(), req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid request ID', 400);
    next(err);
  }
};

export const rejectDeletion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = rejectDeletionSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const request = await DeletionRequest.findById(req.params.id);
    if (!request) return sendError(res, 'Deletion request not found', 404);
    if (request.status !== 'pending') return sendError(res, 'Request already processed', 400);

    await DeletionRequest.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      reason: parsed.data.body.reason,
      processed_by: req.user!.id,
      processed_at: new Date(),
    });

    try {
      await Notification.create({
        user: request.patient,
        type: 'general',
        title: 'Data deletion request rejected',
        message: parsed.data.body.reason ? `Your data deletion request was rejected. Reason: ${parsed.data.body.reason}` : 'Your data deletion request was rejected.',
      });
      emitToUser(request.patient.toString(), 'notification:new', { title: 'Data deletion request rejected' });
    } catch { /* non-fatal */ }

    sendSuccess(res, null, 'Deletion request rejected');
    logAudit({ performedBy: req.user!.id, action: 'reject_deletion_request', resource: 'patient', resourceId: request.patient.toString(), req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid request ID', 400);
    next(err);
  }
};

// ─── Section 12: System Health & Logs ────────────────────────────────────────

let _prevCpuSample: { idle: number; total: number } | null = null;
function sampleCpuUsagePercent(): number {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const cpu of cpus) {
    for (const [k, v] of Object.entries(cpu.times)) {
      total += v;
      if (k === 'idle') idle += v;
    }
  }
  if (!_prevCpuSample) {
    _prevCpuSample = { idle, total };
    return 0;
  }
  const idleDelta = idle - _prevCpuSample.idle;
  const totalDelta = total - _prevCpuSample.total;
  _prevCpuSample = { idle, total };
  return totalDelta > 0 ? Math.round(100 - (idleDelta / totalDelta) * 100) : 0;
}

export const getSystemHealth = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // MongoDB
    let mongoStatus: 'ok' | 'error' | 'degraded' = 'error';
    let mongoLatency: number | undefined;
    const state = mongoose.connection.readyState;
    if (state === 1) {
      const t0 = Date.now();
      try {
        await mongoose.connection.db!.admin().ping();
        mongoLatency = Date.now() - t0;
        mongoStatus = 'ok';
      } catch { mongoStatus = 'degraded'; }
    }

    // Redis
    let redisStatus: 'ok' | 'error' = 'error';
    let redisLatency: number | undefined;
    try {
      const t0 = Date.now();
      await redisClient.ping();
      redisLatency = Date.now() - t0;
      redisStatus = 'ok';
    } catch { /* unavailable */ }

    // CPU
    const cpu_usage_percent = sampleCpuUsagePercent();

    // Memory — system + heap
    const sysTotalMb = Math.round(os.totalmem() / 1024 / 1024);
    const sysFreeMb = Math.round(os.freemem() / 1024 / 1024);
    const sysUsedMb = sysTotalMb - sysFreeMb;
    const memPercent = sysTotalMb > 0 ? Math.round((sysUsedMb / sysTotalMb) * 100) : 0;
    const heapMem = process.memoryUsage();
    const heap_used_mb = Math.round(heapMem.heapUsed / 1024 / 1024);
    const heap_total_mb = Math.round(heapMem.heapTotal / 1024 / 1024);

    // Socket
    const io = getIO();
    const socket_connections = io ? io.sockets.sockets.size : 0;

    // DB connections
    const pool = (mongoose.connection as any).pool;
    const db_connections = {
      active: pool?.totalConnectionCount ?? 0,
      available: pool?.availableConnectionCount ?? 0,
    };

    // Stream API
    let streamStatus: 'ok' | 'unavailable' = 'unavailable';
    if (isStreamConfigured) {
      try { getStreamClient(); streamStatus = 'ok'; } catch { /* unconfigured */ }
    }

    // Last deploy
    const deployRef =
      process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.RAILWAY_DEPLOYMENT_ID ??
      process.env.npm_package_version ??
      'unknown';

    sendSuccess(res, {
      mongodb: { status: mongoStatus, latency_ms: mongoLatency },
      redis: { status: redisStatus, latency_ms: redisLatency },
      socket: { active_connections: socket_connections },
      uptime: Math.floor(process.uptime()),
      cpu: { usage_percent: cpu_usage_percent },
      memory: {
        used_mb: sysUsedMb,
        total_mb: sysTotalMb,
        percent: memPercent,
        heap_used_mb,
        heap_total_mb,
      },
      cron_jobs: {
        inventory_alert: getInventoryAlertJobStatus(),
        inventory_expiry: getInventoryExpiryJobStatus(),
        inventory_report: getInventoryReportJobStatus(),
        appointment_reminder: getAppointmentReminderJobStatus(),
        profile_cleanup: getProfileCleanupJobStatus(),
        pharmacy_expiry: getPharmacyExpiryJobStatus(),
        pharmacy_report: getPharmacyReportJobStatus(),
      },
      db_connections,
      stream_api: { status: streamStatus },
      last_deploy: { timestamp: deployRef },
      // Legacy fields kept for backward compat
      socket_connections,
      uptime_seconds: Math.floor(process.uptime()),
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const getSystemLogs = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const raw = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const logs = raw.map((l: any) => ({
      id: l._id.toString(),
      timestamp: l.createdAt instanceof Date
        ? l.createdAt.toISOString()
        : new Date(l.createdAt).toISOString(),
      level: 'info' as const,
      message: `${l.action}: ${l.resource}${l.details ? ' — ' + l.details : ''}`,
      endpoint: l.ip_address ?? undefined,
    }));

    sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
};
