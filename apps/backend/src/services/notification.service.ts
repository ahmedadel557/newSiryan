import User from '../models/User';
import Notification from '../models/Notification';
import Profile from '../models/Profile';
import { emitToUser, emitToRole } from '../config/socket';

/**
 * Alert all active cashiers that a patient now has a charge awaiting invoicing/payment
 * (e.g. an approved pharmacy order or a completed physical appointment).
 *
 * - Creates a persistent Notification per active cashier + emits `notification:new`
 *   (drives the global bell on every cashier page via StaffShell → useNotifications).
 * - Broadcasts `payment:pending` to the `role:cashier` room (drives the live dashboard
 *   banner + auto-refresh of the pending-payments list).
 *
 * Fire-and-forget: never throws (self-catches) so it can't break the caller's response.
 */
export async function notifyCashiersOfPendingPayment(opts: {
  patientId: string;
  source: 'pharmacy' | 'appointment';
  sourceId: string;
  description: string;
}): Promise<void> {
  const { patientId, source, sourceId, description } = opts;
  try {
    const profile = await Profile.findOne({ user: patientId }).select('first_name last_name').lean();
    const patientName =
      (profile && `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()) || 'a patient';

    const cashiers = await User.find({ role: 'cashier', is_active: true }).select('_id').lean();
    await Promise.all(
      cashiers.map(async (c: any) => {
        const notif = await Notification.create({
          user: c._id,
          type: 'general',
          title: 'New payment pending',
          message: `New payment pending for ${patientName} — ${description}.`,
          metadata: { source, source_id: sourceId, patient_id: patientId },
        });
        emitToUser(c._id.toString(), 'notification:new', notif.toJSON());
      })
    );

    emitToRole('cashier', 'payment:pending', {
      patient_id: patientId,
      patient_name: patientName,
      source,
      source_id: sourceId,
      description,
    });
  } catch {
    /* non-fatal */
  }
}
