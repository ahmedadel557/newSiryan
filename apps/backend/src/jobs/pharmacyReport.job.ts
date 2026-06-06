import cron from 'node-cron';
import DispensingRecord from '../models/DispensingRecord';
import PharmacyReport from '../models/PharmacyReport';
import PharmacyOrder from '../models/PharmacyOrder';

const generateDailyReport = async (targetDate?: Date) => {
  try {
    const date = targetDate ?? new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const records = await DispensingRecord.find({
      dispensed_at: { $gte: dayStart, $lte: dayEnd },
    })
      .populate('order', 'total_amount prescription')
      .lean();

    if (records.length === 0) return;

    const breakdownMap = new Map<string, { medication_name: string; quantity: number; revenue: number }>();
    let totalRevenue = 0;
    let prescriptionCount = 0;
    let otcCount = 0;
    const orderIds = new Set<string>();

    for (const rec of records) {
      const orderId = (rec.order as any)?._id?.toString();
      if (orderId && !orderIds.has(orderId)) {
        orderIds.add(orderId);
        const hasPrescription = !!(rec.order as any)?.prescription;
        if (hasPrescription) prescriptionCount++;
        else otcCount++;
        totalRevenue += (rec.order as any)?.total_amount ?? 0;
      }

      const medId = rec.medication.toString();
      const existing = breakdownMap.get(medId);
      if (existing) {
        existing.quantity += rec.quantity;
      } else {
        breakdownMap.set(medId, {
          medication_name: rec.medication_name,
          quantity: rec.quantity,
          revenue: 0,
        });
      }
    }

    const breakdown = Array.from(breakdownMap.entries()).map(([medication_id, val]) => ({
      medication_id,
      medication_name: val.medication_name,
      quantity: val.quantity,
      revenue: val.revenue,
    }));

    await PharmacyReport.findOneAndUpdate(
      { report_date: dayStart },
      {
        report_date: dayStart,
        total_dispensed: records.length,
        total_revenue: totalRevenue,
        breakdown,
        prescription_count: prescriptionCount,
        otc_count: otcCount,
      },
      { upsert: true, new: true }
    );

    console.log(`Daily pharmacy report generated for ${dayStart.toISOString().split('T')[0]}`);
  } catch (err) {
    console.error('Pharmacy report job error:', err);
  }
};

export { generateDailyReport };

let _started = false;
export const getPharmacyReportJobStatus = (): 'running' | 'stopped' => _started ? 'running' : 'stopped';

export const startPharmacyReportJob = () => {
  _started = true;
  const task = cron.schedule('59 23 * * *', () => generateDailyReport(), { timezone: 'Africa/Cairo' });
  console.log('Pharmacy daily report job started');
  return task;
};
