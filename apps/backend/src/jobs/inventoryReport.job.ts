import cron from "node-cron";
import * as Sentry from "@sentry/node";
import InventoryReport from "../models/InventoryReport";
import { generateMonthlyReportData } from "../controllers/inventory";

export const generateInventoryReport = async (targetDate?: Date) => {
  try {
    const date = targetDate ?? new Date();
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const month = prevMonth.getMonth() + 1;
    const year = prevMonth.getFullYear();

    const report = await generateMonthlyReportData(month, year);

    await InventoryReport.findOneAndUpdate(
      { report_date: report.report_date },
      report,
      { upsert: true, new: true }
    );

    console.log(`Inventory report generated for ${report.period}`);
  } catch (err) {
    console.error("Inventory report job error:", err);
  }
};

let _started = false;
export const getInventoryReportJobStatus = (): 'running' | 'stopped' => _started ? 'running' : 'stopped';

export const startInventoryReportJob = () => {
  _started = true;
  const task = cron.schedule(
    "0 1 1 * *",
    () =>
      Sentry.withMonitor("inventory-report", () => generateInventoryReport(), {
        schedule: { type: "crontab", value: "0 1 1 * *" },
        checkinMargin: 10,
        maxRuntime: 15,
        timezone: "Africa/Cairo",
      }),
    { timezone: "Africa/Cairo" }
  );

  console.log("Inventory report job started (1AM on 1st of each month)");

  return task;
};
