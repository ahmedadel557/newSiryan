import cron from "node-cron";
import Medication from "../models/Medication";
import InventoryItem from "../models/InventoryItem";
import WarehouseEntry from "../models/WarehouseEntry";
import Notification from "../models/Notification";
import User from "../models/User";
import { emitToUser } from "../config/socket";

const runInventoryCheck = async () => {
  try {
    const [lowMeds, lowItems] = await Promise.all([
      Medication.find({
        $expr: { $lte: ["$stock_quantity", "$low_stock_threshold"] },
      }).lean(),
      InventoryItem.find({
        $expr: { $lte: ["$quantity", { $multiply: ["$low_stock_threshold", 0.2] }] },
      }).lean(),
    ]);

    console.log(
      `Inventory check: ${lowMeds.length} medications low, ${lowItems.length} items low`
    );

    if (lowMeds.length === 0 && lowItems.length === 0) return;

    const managers = await User.find({ role: "inventory_manager", is_active: true })
      .select("_id")
      .lean();

    if (managers.length === 0) return;

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const alreadyNotified = await Notification.distinct("user", {
      user: { $in: managers.map((m) => m._id) },
      type: "inventory",
      "metadata.low_stock_alert": true,
      createdAt: { $gte: sixHoursAgo },
    });

    const notifiedSet = new Set(alreadyNotified.map((id) => id.toString()));
    const managersToNotify = managers.filter(
      (m) => !notifiedSet.has(m._id.toString())
    );

    if (managersToNotify.length === 0) return;

    for (const item of lowItems as any[]) {
      const lastEntry = await WarehouseEntry.findOne({ item_id: item._id, item_type: "inventory", status: "assigned" })
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean() as any;

      const payload = {
        item_name: item.name,
        current_quantity: item.quantity,
        threshold: item.low_stock_threshold,
        last_restocked_date: lastEntry?.createdAt ?? null,
      };

      for (const m of managersToNotify) {
        emitToUser(m._id.toString(), "inventory:low_stock", payload);
      }
    }

    const parts: string[] = [];

    if (lowMeds.length > 0) {
      parts.push(
        `Medications: ${lowMeds
          .map((m: any) => `${m.name} (${m.stock_quantity}/${m.low_stock_threshold})`)
          .join(", ")}`
      );
    }

    if (lowItems.length > 0) {
      parts.push(
        `Items: ${lowItems
          .map((i: any) => `${i.name} (${i.quantity}/${i.low_stock_threshold})`)
          .join(", ")}`
      );
    }

    await Notification.insertMany(
      managersToNotify.map((m) => ({
        user: m._id,
        type: "inventory",
        title: "Low Stock Alert",
        message: `Low stock detected. ${parts.join(". ")}`,
        metadata: { low_stock_alert: true, low_items_count: lowItems.length, low_meds_count: lowMeds.length },
      }))
    );
  } catch (err) {
    console.error("Inventory alert job error:", err);
  }
};

export const startInventoryAlertJob = () => {
  const task = cron.schedule(
    "0 */6 * * *",
    runInventoryCheck,
    { timezone: "Africa/Cairo" }
  );

  console.log("Inventory alert job started (every 6 hours)");

  return task;
};
