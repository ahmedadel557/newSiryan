import "./config/env";
import http from "http";
import mongoose from "mongoose";

import app from "./app";

import { connectDB } from "./config/database";
import { connectRedis, redisClient } from "./config/redis";
import { initSocket, attachRedisAdapter, getIO, emitToRole } from "./config/socket";

import os from "os";
import { startInventoryAlertJob, getInventoryAlertJobStatus } from "./jobs/inventoryAlert.job";
import { startInventoryExpiryJob, getInventoryExpiryJobStatus } from "./jobs/inventoryExpiry.job";
import { startInventoryReportJob, getInventoryReportJobStatus } from "./jobs/inventoryReport.job";
import { startAppointmentReminderJob, getAppointmentReminderJobStatus } from "./jobs/appointmentReminder.job";
import { startProfileCleanupJob, getProfileCleanupJobStatus } from "./jobs/profileCleanup.job";
import { startPharmacyExpiryJob, getPharmacyExpiryJobStatus } from "./jobs/pharmacyExpiry.job";
import { startPharmacyReportJob, getPharmacyReportJobStatus } from "./jobs/pharmacyReport.job";
import { isStreamConfigured } from "./config/stream";

import InventoryItem from "./models/InventoryItem";
import Profile from "./models/Profile";

import { seedAdmin } from "./seeds/admin.seed";
import { seedInventoryManager } from "./seeds/inventoryM.seed";
import { seedDepartments } from "./seeds/departments.seed";
import { seedPricingSettings } from "./seeds/pricingSettings.seed";
import { seedEmailTemplates } from "./seeds/emailTemplates.seed";
import { seedShiftDefinitions } from "./seeds/shiftDefinitions.seed";

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
  await seedShiftDefinitions();

  // ==========================
  // Background Jobs
  // ==========================

  const inventoryJob = startInventoryAlertJob();
  const inventoryExpiryJob = startInventoryExpiryJob();
  const inventoryReportJob = startInventoryReportJob();
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

  let _prevCpuSample: { idle: number; total: number } | null = null;
  function sampleCpu(): number {
    const cpus = os.cpus();
    let idle = 0, total = 0;
    for (const cpu of cpus) {
      for (const [k, v] of Object.entries(cpu.times)) {
        total += v;
        if (k === 'idle') idle += v;
      }
    }
    if (!_prevCpuSample) { _prevCpuSample = { idle, total }; return 0; }
    const idleDelta = idle - _prevCpuSample.idle;
    const totalDelta = total - _prevCpuSample.total;
    _prevCpuSample = { idle, total };
    return totalDelta > 0 ? Math.round(100 - (idleDelta / totalDelta) * 100) : 0;
  }

  const healthInterval = setInterval(async () => {
    const io = getIO();
    if (!io) return;

    const mongoStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    let redisStatus = "unavailable";
    let redisLatency: number | undefined;
    if (redisClient.isReady) {
      try {
        const t0 = Date.now();
        await redisClient.ping();
        redisLatency = Date.now() - t0;
        redisStatus = "connected";
      } catch { redisStatus = "unavailable"; }
    }

    let mongoLatency: number | undefined;
    if (mongoose.connection.readyState === 1) {
      try {
        const t0 = Date.now();
        await mongoose.connection.db!.admin().ping();
        mongoLatency = Date.now() - t0;
      } catch { /* skip */ }
    }

    const cpu_usage_percent = sampleCpu();
    const sysTotalMb = Math.round(os.totalmem() / 1024 / 1024);
    const sysFreeMb = Math.round(os.freemem() / 1024 / 1024);
    const sysUsedMb = sysTotalMb - sysFreeMb;
    const heapMem = process.memoryUsage();
    const pool = (mongoose.connection as any).pool;

    let streamStatus: 'ok' | 'unavailable' = isStreamConfigured ? 'ok' : 'unavailable';

    const deployRef =
      process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.RAILWAY_DEPLOYMENT_ID ??
      process.env.npm_package_version ??
      'unknown';

    emitToRole("admin", "health_update", {
      mongodb: { status: mongoStatus === 'connected' ? 'ok' : 'error', latency_ms: mongoLatency },
      redis: { status: redisStatus === 'connected' ? 'ok' : 'error', latency_ms: redisLatency },
      socket: { active_connections: io.sockets.sockets.size },
      uptime: Math.floor(process.uptime()),
      cpu: { usage_percent: cpu_usage_percent },
      memory: {
        used_mb: sysUsedMb,
        total_mb: sysTotalMb,
        percent: sysTotalMb > 0 ? Math.round((sysUsedMb / sysTotalMb) * 100) : 0,
        heap_used_mb: Math.round(heapMem.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(heapMem.heapTotal / 1024 / 1024),
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
      db_connections: {
        active: pool?.totalConnectionCount ?? 0,
        available: pool?.availableConnectionCount ?? 0,
      },
      stream_api: { status: streamStatus },
      last_deploy: { timestamp: deployRef },
      // Legacy compat
      socket_connections: io.sockets.sockets.size,
      uptime_seconds: Math.floor(process.uptime()),
      checked_at: new Date().toISOString(),
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
      inventoryExpiryJob?.stop?.();
      inventoryReportJob?.stop?.();
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
