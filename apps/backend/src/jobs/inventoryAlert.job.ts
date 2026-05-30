import cron from "node-cron";
import Medication from "../models/Medication";
import InventoryItem from "../models/InventoryItem";
import Notification from "../models/Notification";
import User from "../models/User";

const runInventoryCheck = async () => {
  try {
    const [lowMeds, lowItems] = await Promise.all([
      Medication.find({
        $expr: { $lte: ["$stock_quantity", "$low_stock_threshold"] },
      }).lean(),
      InventoryItem.find({
        $expr: { $lte: ["$quantity", "$low_stock_threshold"] },
      }).lean(),
    ]);

    console.log(
      `Inventory check: ${lowMeds.length} medications low, ${lowItems.length} items low`
    );

    if (lowMeds.length === 0 && lowItems.length === 0) return;

    const managers = await User.find({ role: "inventory_manager" })
      .select("_id")
      .lean();

    if (managers.length === 0) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const alreadyNotified = await Notification.distinct("user", {
      user: { $in: managers.map((m) => m._id) },
      type: "inventory",
      createdAt: { $gte: todayStart },
    });

    const notifiedSet = new Set(
      alreadyNotified.map((id) => id.toString())
    );

    const managersToNotify = managers.filter(
      (m) => !notifiedSet.has(m._id.toString())
    );

    if (managersToNotify.length === 0) return;

    const parts: string[] = [];

    if (lowMeds.length > 0) {
      parts.push(
        `Medications: ${lowMeds
          .map(
            (m: any) =>
              `${m.name} (${m.stock_quantity}/${m.low_stock_threshold})`
          )
          .join(", ")}`
      );
    }

    if (lowItems.length > 0) {
      parts.push(
        `Items: ${lowItems
          .map(
            (i: any) =>
              `${i.name} (${i.quantity}/${i.low_stock_threshold})`
          )
          .join(", ")}`
      );
    }

    await Notification.insertMany(
      managersToNotify.map((m) => ({
        user: m._id,
        type: "inventory",
        title: "Daily Low Stock Alert",
        message: `Daily inventory alert. ${parts.join(". ")}`,
      }))
    );
  } catch (err) {
    console.error("Inventory alert job error:", err);
  }
};

export const startInventoryAlertJob = () => {
  const task = cron.schedule(
    "0 0 * * *",
    runInventoryCheck,
    {
      timezone: "Africa/Cairo",
    }
  );

  console.log("Inventory alert job started");

  return task;
};