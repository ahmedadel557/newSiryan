import cron from "node-cron";
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

export const startInventoryReportJob = () => {
  const task = cron.schedule(
    "0 1 1 * *",
    () => generateInventoryReport(),
    { timezone: "Africa/Cairo" }
  );

  console.log("Inventory report job started (1AM on 1st of each month)");

  return task;
};
