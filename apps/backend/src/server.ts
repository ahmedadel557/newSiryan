import "dotenv/config";
import http from "http";
import mongoose from "mongoose";

import app from "./app";

import { connectDB } from "./config/database";
import { connectRedis, redisClient } from "./config/redis";
import { initSocket, attachRedisAdapter, getIO, emitToRole } from "./config/socket";

import { startInventoryAlertJob } from "./jobs/inventoryAlert.job";
import { startAppointmentReminderJob } from "./jobs/appointmentReminder.job";
import { startProfileCleanupJob } from "./jobs/profileCleanup.job";
import { startPharmacyExpiryJob } from "./jobs/pharmacyExpiry.job";
import { startPharmacyReportJob } from "./jobs/pharmacyReport.job";

import InventoryItem from "./models/InventoryItem";
import Profile from "./models/Profile";

import { seedAdmin } from "./seeds/admin.seed";
import { seedInventoryManager } from "./seeds/inventoryM.seed";
import { seedDepartments } from "./seeds/departments.seed";
import { seedPricingSettings } from "./seeds/pricingSettings.seed";
import { seedEmailTemplates } from "./seeds/emailTemplates.seed";

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  mongoose.set("toJSON", {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id?.toString();

      delete ret._id;
      delete ret.__v;

      return ret;
    },
  });

  if (process.env.NODE_ENV === "development") {
    Profile.find({ user: null }).then((broken) => {
      if (broken.length > 0) {
        console.warn(
          `[migration] Found ${
            broken.length
          } Profile(s) with user: null — IDs: ${broken
            .map((p) => p._id)
            .join(", ")}`,
        );
      }
    });

    mongoose.connection.db?.dropCollection("patientprofiles").catch(() => {});

    mongoose.connection.db?.dropCollection("staffprofiles").catch(() => {});

    await InventoryItem.updateMany(
      { location: { $exists: true } },
      { $unset: { location: "" } },
    );

    const { seedDoctors } = await import("./seeds/doctors.seed");
    const { seedMedications } = await import("./seeds/medications.seed");
    const { seedDrugInteractions } = await import("./seeds/drugInteractions.seed");

    await seedDoctors();
    await seedMedications();
    await seedDrugInteractions();
  }

  await seedAdmin();
  await seedInventoryManager();
  await seedDepartments();

  await connectRedis();

  await seedPricingSettings();
  await seedEmailTemplates();

  // ==========================
  // Background Jobs
  // ==========================

  const inventoryJob = startInventoryAlertJob();
  const appointmentJob = startAppointmentReminderJob();
  const profileCleanupJob = startProfileCleanupJob();
  const pharmacyExpiryJob = startPharmacyExpiryJob();
  const pharmacyReportJob = startPharmacyReportJob();

  // ==========================
  // HTTP + Socket Server
  // ==========================

  const httpServer = http.createServer(app);

  initSocket(httpServer);

  // Attach Redis pub/sub adapter for multi-instance Socket.IO support
  await attachRedisAdapter();

  // ==========================
  // Health Broadcast
  // ==========================

  const healthInterval = setInterval(async () => {
    const io = getIO();

    if (!io) return;

    const mongoStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    let redisStatus = "unavailable";

    if (redisClient.isReady) {
      try {
        await redisClient.ping();
        redisStatus = "connected";
      } catch {
        redisStatus = "unavailable";
      }
    }

    emitToRole("admin", "health_update", {
      mongodb: mongoStatus,
      redis: redisStatus,
      socket_connections: io.sockets.sockets.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }, 60_000);

  // ==========================
  // MongoDB Critical Alerts
  // ==========================

  mongoose.connection.on("disconnected", () => {
    emitToRole("admin", "health_alert", {
      severity: "critical",
      service: "mongodb",
      message: "MongoDB connection lost",
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================
  // Start Server
  // ==========================

  httpServer.listen(PORT, () => {
    console.log(`Siryan server running on port ${PORT}`);
  });

  // ==========================
  // Graceful Shutdown
  // ==========================

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    try {
      clearInterval(healthInterval);

      inventoryJob?.stop?.();
      appointmentJob?.stop?.();
      profileCleanupJob?.stop?.();
      pharmacyExpiryJob?.stop?.();
      pharmacyReportJob?.stop?.();

      console.log("All cron jobs stopped");

      const io = getIO();

      if (io) {
        io.close();
        console.log("Socket.IO closed");
      }

      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) return reject(err);

          console.log("HTTP server closed");

          resolve();
        });
      });

      if (redisClient.isOpen) {
        await redisClient.quit();

        console.log("Redis disconnected");
      }

      await mongoose.connection.close();

      console.log("MongoDB disconnected");

      console.log("Graceful shutdown complete");

      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error);

      process.exit(1);
    }
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
};

// ==========================
// Global Error Handlers
// ==========================

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);

  process.exit(1);
});

// ==========================
// Bootstrap
// ==========================

start().catch((error) => {
  console.error("Startup failed:", error);

  process.exit(1);
});
