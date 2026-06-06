import cron from "node-cron";
import mongoose from "mongoose";
import Profile from "../models/Profile";

let isRunning = false;

const runProfileCleanup = async () => {
  if (isRunning) return;

  isRunning = true;

  try {
    const User = mongoose.model("User");

    const existingUserIds = await User.distinct("_id");

    const result = await Profile.deleteMany({
      user: {
        $nin: existingUserIds,
      },
    });

    if (result.deletedCount > 0) {
      console.log(
        `Profile cleanup: deleted ${result.deletedCount} orphaned profiles`,
      );
    }
  } catch (err) {
    console.error("Profile cleanup job error:", err);
  } finally {
    isRunning = false;
  }
};

let _started = false;
export const getProfileCleanupJobStatus = (): 'running' | 'stopped' => _started ? 'running' : 'stopped';

export const startProfileCleanupJob = () => {
  _started = true;
  const task = cron.schedule("0 2 * * *", runProfileCleanup, {
    timezone: "Africa/Cairo",
  });

  console.log("Profile cleanup job started");

  return task;
};
