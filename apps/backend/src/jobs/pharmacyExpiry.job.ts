import cron from 'node-cron';
import Medication from '../models/Medication';
import MedicationBatch from '../models/MedicationBatch';
import Notification from '../models/Notification';
import User from '../models/User';
import { emitToRole } from '../config/socket';

const runExpiryCheck = async () => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [expiringMeds, expiringBatches] = await Promise.all([
      Medication.find({ expiry_date: { $gte: now, $lte: in30Days } }).select('name expiry_date').lean(),
      MedicationBatch.find({ expiry_date: { $gte: now, $lte: in30Days }, is_active: true })
        .populate('medication', 'name')
        .lean(),
    ]);

    if (expiringMeds.length === 0 && expiringBatches.length === 0) return;

    const pharmacists = await User.find({ role: 'pharmacist', is_active: true }).select('_id').lean();
    if (pharmacists.length === 0) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const alreadyNotified = await Notification.distinct('user', {
      user: { $in: pharmacists.map((p) => p._id) },
      type: 'pharmacy',
      'metadata.expiry_alert': true,
      createdAt: { $gte: todayStart },
    });

    const notifiedSet = new Set(alreadyNotified.map((id) => id.toString()));
    const toNotify = pharmacists.filter((p) => !notifiedSet.has(p._id.toString()));
    if (toNotify.length === 0) return;

    const items: Array<{ name: string; expiry_date: string; type: string; urgent: boolean }> = [
      ...expiringMeds.map((m: any) => ({
        name: m.name,
        expiry_date: m.expiry_date?.toISOString().split('T')[0] ?? '',
        type: 'medication',
        urgent: m.expiry_date != null && m.expiry_date <= in7Days,
      })),
      ...expiringBatches.map((b: any) => ({
        name: `${(b.medication as any)?.name ?? 'Unknown'} (Batch)`,
        expiry_date: b.expiry_date?.toISOString().split('T')[0] ?? '',
        type: 'batch',
        urgent: b.expiry_date != null && b.expiry_date <= in7Days,
      })),
    ];

    const message = `${items.length} item(s) expiring within 30 days: ${items.map((i) => `${i.name} (${i.expiry_date})`).join(', ')}`;

    await Notification.insertMany(
      toNotify.map((p) => ({
        user: p._id,
        type: 'pharmacy',
        title: 'Medication Expiry Alert',
        message,
        metadata: { expiry_alert: true, items },
      }))
    );

    emitToRole('pharmacist', 'pharmacy:expiry_alert', { items });

    const urgentItems = items.filter((i) => i.urgent);
    if (urgentItems.length > 0) {
      emitToRole('pharmacist', 'pharmacy:expiry_alert_urgent', { items: urgentItems });
    }

    console.log(`Pharmacy expiry alert sent: ${items.length} items expiring soon (${urgentItems.length} urgent)`);
  } catch (err) {
    console.error('Pharmacy expiry job error:', err);
  }
};

let _started = false;
export const getPharmacyExpiryJobStatus = (): 'running' | 'stopped' => _started ? 'running' : 'stopped';

export const startPharmacyExpiryJob = () => {
  _started = true;
  const task = cron.schedule('0 8 * * *', runExpiryCheck, { timezone: 'Africa/Cairo' });
  console.log('Pharmacy expiry alert job started');
  return task;
};
