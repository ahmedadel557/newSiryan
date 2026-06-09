import cron from "node-cron";
import * as Sentry from "@sentry/node";
import InventoryItem from "../models/InventoryItem";
import Notification from "../models/Notification";
import User from "../models/User";
import { emitToRole } from "../config/socket";

export const runInventoryExpiryCheck = async () => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [expiredItems, expiringItems] = await Promise.all([
      InventoryItem.find({ expiry_date: { $lt: now }, quantity: { $gt: 0 } }),
      InventoryItem.find({ expiry_date: { $gte: now, $lte: in30Days } }).lean(),
    ]);

    for (const item of expiredItems) {
      item.quantity = 0;
      item.locations = item.locations.map((l) => ({ ...l, quantity: 0 }));
      await item.save();
    }

    if (expiredItems.length === 0 && expiringItems.length === 0) return;

    const managers = await User.find({ role: "inventory_manager", is_active: true })
      .select("_id")
      .lean();

    if (managers.length === 0) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const alreadyNotified = await Notification.distinct("user", {
      user: { $in: managers.map((m) => m._id) },
      type: "inventory",
      "metadata.expiry_alert": true,
      createdAt: { $gte: todayStart },
    });

    const notifiedSet = new Set(alreadyNotified.map((id) => id.toString()));
    const managersToNotify = managers.filter((m) => !notifiedSet.has(m._id.toString()));

    const urgentItems = expiringItems.filter((i) => i.expiry_date! <= in7Days);
    const warningItems = expiringItems.filter((i) => i.expiry_date! > in7Days);

    const allItems = [
      ...expiredItems.map((i) => ({
        name: i.name,
        expiry_date: i.expiry_date?.toISOString().split("T")[0] ?? "",
        urgent: true,
        expired: true,
      })),
      ...urgentItems.map((i) => ({
        name: i.name,
        expiry_date: i.expiry_date?.toISOString().split("T")[0] ?? "",
        urgent: true,
        expired: false,
      })),
      ...warningItems.map((i) => ({
        name: i.name,
        expiry_date: i.expiry_date?.toISOString().split("T")[0] ?? "",
        urgent: false,
        expired: false,
      })),
    ];

    if (managersToNotify.length > 0) {
      const expiredNames = expiredItems.map((i) => i.name).join(", ");
      const urgentNames = urgentItems.map((i) => i.name).join(", ");
      const parts: string[] = [];
      if (expiredItems.length > 0) parts.push(`${expiredItems.length} expired (stock cleared): ${expiredNames}`);
      if (urgentItems.length > 0) parts.push(`${urgentItems.length} expiring within 7 days: ${urgentNames}`);
      if (warningItems.length > 0) parts.push(`${warningItems.length} expiring within 30 days`);

      await Notification.insertMany(
        managersToNotify.map((m) => ({
          user: m._id,
          type: "inventory",
          title: expiredItems.length > 0 || urgentItems.length > 0 ? "Urgent: Inventory Expiry Alert" : "Inventory Expiry Warning",
          message: parts.join(". "),
          metadata: { expiry_alert: true, items: allItems },
        }))
      );
    }

    if (urgentItems.length > 0 || expiredItems.length > 0) {
      emitToRole("inventory_manager", "inventory:expiry_urgent", {
        items: allItems.filter((i) => i.urgent),
      });
    }

    if (warningItems.length > 0) {
      emitToRole("inventory_manager", "inventory:expiry_warning", {
        items: allItems.filter((i) => !i.urgent),
      });
    }

    console.log(
      `Expiry check: ${expiredItems.length} expired, ${urgentItems.length} urgent, ${warningItems.length} warning`
    );
  } catch (err) {
    console.error("Inventory expiry job error:", err);
  }
};

let _started = false;
export const getInventoryExpiryJobStatus = (): 'running' | 'stopped' => _started ? 'running' : 'stopped';

export const startInventoryExpiryJob = () => {
  _started = true;
  const task = cron.schedule(
    "0 7 * * *",
    () =>
      Sentry.withMonitor("inventory-expiry", runInventoryExpiryCheck, {
        schedule: { type: "crontab", value: "0 7 * * *" },
        checkinMargin: 10,
        maxRuntime: 15,
        timezone: "Africa/Cairo",
      }),
    { timezone: "Africa/Cairo" }
  );

  console.log("Inventory expiry job started (daily 7AM)");

  return task;
};
