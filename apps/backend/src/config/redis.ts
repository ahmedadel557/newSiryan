import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis ready");
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

redisClient.on("end", () => {
  console.warn("Redis connection closed");
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

export const connectRedis = async () => {
  try {
    if (redisClient.isOpen) {
      return;
    }

    await redisClient.connect();

    console.log("Redis connected");
  } catch (err) {
    console.error("Redis connection error:", err);
    console.warn("Redis unavailable — running without cache");
  }
};

// Graceful shutdown
const shutdown = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log("Redis disconnected gracefully");
    }
  } catch (err) {
    console.error("Redis shutdown error:", err);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);